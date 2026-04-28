'use client';

import { useEffect, useRef } from 'react';
import type { EditorView } from '@codemirror/view';
import { highlightMiniLocations, updateMiniLocations } from '@strudel/codemirror';
import type { HapState } from './useStrudel';

interface UseHapEventsProps {
  /** Whether the transport is currently playing; controls the RAF loop lifecycle. */
  isPlaying: boolean;
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
export function useHapEvents({ isPlaying, getView, getHapState }: UseHapEventsProps) {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  // Track the miniLocations array reference to avoid redundant updateMiniLocations calls
  const lastMiniLocsRef = useRef<[number, number][] | null>(null);

  useEffect(() => {
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
      const view = getView();
      if (view) {
        try {
          highlightMiniLocations(view, 0, []);
        } catch {
          // View may be destroyed; ignore dispatch errors
        }
      }
      return;
    }

    const animate = () => {
      const view = getView();
      const { pattern, miniLocations, getTime } = getHapState();

      if (!view || !pattern) {
        // Editor not yet mounted or pattern cleared (stop); keep looping until mounted
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      // Update static mark positions when miniLocations change (new evaluate / code edit)
      // Identity check is enough because _lastMiniLocations is replaced by reference on each evaluate.
      if (miniLocations !== lastMiniLocsRef.current) {
        try {
          updateMiniLocations(view, miniLocations);
        } catch {
          // Ignore — editor may be in a transitional state
        }
        lastMiniLocsRef.current = miniLocations;
      }

      const t = getTime();
      // Small lookbehind window (0.1 cycles) to catch haps whose onset just fired.
      // Matches the Drawer convention from @strudel/draw.
      const begin = Math.max(lastTimeRef.current ?? t - 0.01, t - 0.1);
      lastTimeRef.current = t;

      try {
        type HapLike = {
          hasOnset: () => boolean;
          value?: Record<string, unknown>;
          context?: { locations?: unknown[] };
          whole?: unknown;
        };
        const pat = pattern as { queryArc: (a: number, b: number) => HapLike[] };
        const haps = pat.queryArc(begin, t).filter((h) => h.hasOnset());

        // Apply NLMusic design-system style to each hap decoration.
        // markcss takes priority over color in highlight.mjs so the background flash
        // is always the cyan accent regardless of the hap's own color.
        const styledHaps = haps.map((h) => ({
          ...h,
          value: {
            ...(h.value ?? {}),
            // TASK-11: 150ms background flash — see nlmusicTheme.ts for --foreground alias
            markcss:
              'background-color:rgba(0,255,200,0.18);border-radius:2px;' +
              'transition:background-color 150ms ease-out;',
          },
        }));

        highlightMiniLocations(view, t, styledHaps);
      } catch {
        // EC-006: silently ignore runtime errors — audio and editor continue unaffected
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return cancelLoop;
    // getView and getHapState are stable references (useCallback with []) — excluded from deps.
    // isPlaying is the only signal that restarts/stops the loop.
  }, [isPlaying, getView, getHapState]);
}
