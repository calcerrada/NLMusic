'use client';

import { useEffect, useRef } from 'react';
import type { EditorView } from '@codemirror/view';
import type { HapState } from './useStrudel';

const HAP_FLASH_STYLE =
  'background-color:rgba(0,255,200,0.18);border-radius:2px;' +
  'transition:background-color 150ms ease-out;';
const MAX_ACTIVE_HAPS = 64;

type HighlightApi = {
  updateMiniLocations: (view: EditorView, locations: [number, number][]) => void;
  highlightMiniLocations: (view: EditorView, atTime: number, haps: unknown[]) => void;
};

interface UseHapEventsProps {
  /** Whether the transport is currently playing; controls the RAF loop lifecycle. */
  isPlaying: boolean;
  /**
   * Global 0..15 step from the transport clock.
   * Used as degraded fallback when Strudel hap APIs are unavailable.
   */
  fallbackStep: number;
  /**
   * Stable getter returning the current EditorView (or null if not yet mounted).
   * Use `() => editorRef.current?.view ?? null` — avoids triggering re-runs on each render.
   */
  getView: () => EditorView | null;
  /**
   * Stable getter for the hap state snapshot (pattern + miniLocations + getTime).
   * Must come from useStrudel().getHapState — same stable reference across renders.
   */
  getHapState: () => HapState;
}

/**
 * Drives real-time per-token hap highlighting on the CodeMirror editor.
 *
 * When playing, runs a requestAnimationFrame loop that:
 *  1. Updates static mark positions via updateMiniLocations when the code changes.
 *  2. Queries the current Strudel Pattern for active haps at the current scheduler time.
 *  3. Dispatches those haps as CodeMirror decorations via highlightMiniLocations.
 *
 * On stop, clears all decorations and cancels the loop.
 *
 * @see BR-001 The RAF loop is purely visual — never touches audio timing.
 * @see BR-009 Marks track the actual code via miniLocations from the transpiler.
 * @see EC-006 All errors inside the loop are silenced to never break the editor.
 */
export function useHapEvents({ isPlaying, fallbackStep, getView, getHapState }: UseHapEventsProps) {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  // Track the miniLocations array reference to avoid redundant updateMiniLocations calls
  const lastMiniLocsRef = useRef<[number, number][] | null>(null);
  const highlightApiRef = useRef<HighlightApi | null>(null);

  useEffect(() => {
    const ensureHighlightApi = async () => {
      if (highlightApiRef.current) {
        return highlightApiRef.current;
      }
      try {
        const mod = await import('@lib/strudelHighlight');
        highlightApiRef.current = {
          updateMiniLocations: mod.updateMiniLocations,
          highlightMiniLocations: mod.highlightMiniLocations,
        };
      } catch {
        // EC-006/TASK-11 degraded mode: missing codemirror bridge should not crash tests/runtime.
        highlightApiRef.current = null;
      }
      return highlightApiRef.current;
    };

    const clearHighlights = (view: EditorView | null) => {
      if (!view) {
        return;
      }
      const api = highlightApiRef.current;
      if (!api) {
        return;
      }
      try {
        api.highlightMiniLocations(view, 0, []);
      } catch {
        // View may be destroyed; ignore dispatch errors
      }
    };

    /**
     * Fallback degradado cuando no hay haps consultables desde Strudel.
     * Proyecta el paso global 0..15 sobre `miniLocations` para mantener feedback visual sin tocar el audio.
     * @see BR-001
     * @see BR-009
     */
    const applyDegradedStepHighlight = (
      view: EditorView,
      miniLocations: [number, number][],
      step: number,
    ) => {
      const api = highlightApiRef.current;
      if (!api) {
        return;
      }
      if (miniLocations.length === 0) {
        clearHighlights(view);
        return;
      }

      // Degraded mode: highlight one token mapped from the global 0..15 transport step.
      const index = ((step % 16) + 16) % 16;
      const loc = miniLocations[index % miniLocations.length];
      const [start, end] = loc;

      const pseudoHap = {
        context: {
          locations: [{ start, end }],
        },
        // highlight.mjs only needs begin.lt when two haps share the same id.
        // One pseudo hap is dispatched per frame, so this comparator is never used.
        whole: {
          begin: { lt: () => false },
        },
        value: {
          markcss: HAP_FLASH_STYLE,
        },
      };

      api.highlightMiniLocations(view, 0, [pseudoHap]);
    };

    /**
     * Cierra el ciclo de RAF y descarta referencias temporales del frame anterior.
     * Evita flashes residuales al pausar o desmontar el editor.
     * @see BR-009
     */
    const cancelLoop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
      lastMiniLocsRef.current = null;
    };

    if (!isPlaying) {
      cancelLoop();
      // Clear all hap decorations when playback stops — BR-009 / PAUSED state
      clearHighlights(getView());
      return;
    }

    void ensureHighlightApi();

    const animate = () => {
      const view = getView();
      const { pattern, miniLocations, getTime } = getHapState();
      const api = highlightApiRef.current;

      if (!view) {
        // Editor not yet mounted; keep looping until mounted
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      // Update static mark positions when miniLocations change (new evaluate / code edit)
      // Identity check is enough because _lastMiniLocations is replaced by reference on each evaluate.
      if (api && miniLocations !== lastMiniLocsRef.current) {
        try {
          api.updateMiniLocations(view, miniLocations);
        } catch {
          // Ignore — editor may be in a transitional state
        }
        lastMiniLocsRef.current = miniLocations;
      }

      const pat = pattern as { queryArc?: (a: number, b: number) => HapLike[] } | null;
      const queryArc = pat?.queryArc;

      if (typeof queryArc !== 'function') {
        // TASK-11 degraded mode: no hap API, keep a minimal visual cue using transport step.
        try {
          applyDegradedStepHighlight(view, miniLocations, fallbackStep);
        } catch {
          clearHighlights(view);
        }
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const t = getTime();
      if (!Number.isFinite(t)) {
        try {
          applyDegradedStepHighlight(view, miniLocations, fallbackStep);
        } catch {
          clearHighlights(view);
        }
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      // Small lookbehind window (0.1 cycles) to catch haps whose onset just fired.
      // Matches the Drawer convention from @strudel/draw.
      const begin = Math.max(lastTimeRef.current ?? t - 0.01, t - 0.1);
      lastTimeRef.current = t;

      try {
        const haps = queryArc(begin, t).filter((h) => h.hasOnset());

        // BR-001: cap decorations per frame to keep editor FPS stable in dense patterns.
        const styledHaps = haps.slice(0, MAX_ACTIVE_HAPS).map((h) => ({
          ...h,
          value: {
            ...(h.value ?? {}),
            // TASK-11: 150ms background flash — see nlmusicTheme.ts for --foreground alias
            markcss: HAP_FLASH_STYLE,
          },
        }));

        if (api) {
          api.highlightMiniLocations(view, t, styledHaps);
        }
      } catch {
        // EC-006: if scheduler data fails, degrade to global-step highlight without crashing.
        try {
          applyDegradedStepHighlight(view, miniLocations, fallbackStep);
        } catch {
          clearHighlights(view);
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return cancelLoop;
    // getView and getHapState are stable references (useCallback with []) — excluded from deps.
    // isPlaying/fallbackStep drive runtime behavior without touching audio state.
  }, [isPlaying, fallbackStep, getView, getHapState]);
}

type HapLike = {
  hasOnset: () => boolean;
  value?: Record<string, unknown>;
  context?: { locations?: unknown[] };
  whole?: unknown;
};
