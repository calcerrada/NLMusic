'use client';

import { useEffect, useRef } from 'react';
import type { EditorView } from '@codemirror/view';
// Single import path shared con StrudelEditor — ver el wrapper para la justificación.
// Garantiza una sola instancia del módulo highlight.mjs (mismos StateEffect IDs).
import { updateMiniLocations, highlightMiniLocations } from '@lib/strudelHighlight';
import type { HapState } from './useStrudel';

// CSS aplicado vía hap.value.markcss; sin `transition` porque el span de la decoración
// se crea/destruye en bloque, sin estado intermedio sobre el que animar.
const HAP_FLASH_STYLE = 'outline:solid 2px var(--cyan);border-radius:2px;';
const MAX_ACTIVE_HAPS = 64;
// Ventana de lookback para queryArc — equivale a lo que usa @strudel/draw Drawer (1/10 de ciclo)
const HAP_LOOKBACK = 0.1;

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
 * Replica el algoritmo de @strudel/draw `Drawer` para que cada hap permanezca
 * resaltado durante toda su duración (no solo en el frame del onset). Cada frame:
 *  1. Actualiza las marcas estáticas vía updateMiniLocations cuando cambia el código.
 *  2. Consulta nuevos haps en la ventana [lastFrame, phase] (con lookback máximo de 0.1 ciclos).
 *  3. Mantiene un sliding window: descarta haps expirados (endClipped < phase),
 *     añade los nuevos con onset.
 *  4. Filtra los activos en el frame actual con hap.isActive(phase) y los despacha.
 *
 * Al parar, limpia decoraciones y cancela el loop.
 *
 * @see BR-001 RAF loop puramente visual; nunca toca el timing de audio.
 * @see BR-009 Las marcas siguen al código real vía miniLocations del transpiler.
 * @see EC-006 Errores en el loop se silencian para no romper el editor.
 */
export function useHapEvents({ isPlaying, fallbackStep, getView, getHapState }: UseHapEventsProps) {
  const rafRef = useRef<number | null>(null);
  // null marca "primer frame" — solo captura phase sin dispatch (mismo patrón que Drawer)
  const lastFrameRef = useRef<number | null>(null);
  // Sliding window de haps visibles entre frames; conservamos la instancia original
  // para mantener accesibles métodos del prototipo (isActive, endClipped getter).
  const visibleHapsRef = useRef<HapLike[]>([]);
  // Track the miniLocations array reference to avoid redundant updateMiniLocations calls
  const lastMiniLocsRef = useRef<[number, number][] | null>(null);
  // fallbackStep se lee vía ref para evitar relanzar el RAF en cada cambio del clock visual.
  const fallbackStepRef = useRef(fallbackStep);
  useEffect(() => {
    fallbackStepRef.current = fallbackStep;
  }, [fallbackStep]);

  useEffect(() => {
    const clearHighlights = (view: EditorView | null) => {
      if (!view) {
        return;
      }
      try {
        highlightMiniLocations(view, 0, []);
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

      highlightMiniLocations(view, 0, [pseudoHap]);
    };

    /**
     * Fallback más preciso cuando hay Pattern consultable pero el reloj del scheduler
     * no produce haps activos en la ventana actual. Consulta un ciclo canónico [0,1]
     * y proyecta el step visual de 16 pasos sobre ese ciclo para recuperar el token exacto.
     */
    const applyCycleStepHighlight = (
      view: EditorView,
      queryArc: (a: number, b: number) => HapLike[],
      step: number,
    ) => {
      const cycleStep = ((step % 16) + 16) % 16;
      const begin = cycleStep / 16;
      const end = begin + 1 / 16;

      const active = queryArc(0, 1)
        .filter((h) => {
          if (!h.whole) {
            return false;
          }
          const hapBegin = asNumber(h.whole.begin);
          const hapEnd = asNumber(h.whole.end ?? h.endClipped);
          return hapBegin < end && hapEnd > begin;
        })
        .slice(0, MAX_ACTIVE_HAPS)
        .map((h) => ({
          ...h,
          value: {
            ...(h.value ?? {}),
            markcss: HAP_FLASH_STYLE,
          },
        }));

      if (active.length === 0) {
        clearHighlights(view);
        return;
      }

      highlightMiniLocations(view, begin, active);
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
      lastFrameRef.current = null;
      lastMiniLocsRef.current = null;
      visibleHapsRef.current = [];
    };

    if (!isPlaying) {
      cancelLoop();
      // Clear all hap decorations when playback stops — BR-009 / PAUSED state
      clearHighlights(getView());
      return;
    }

    const animate = () => {
      const view = getView();
      const { pattern, miniLocations, getTime } = getHapState();

      if (!view) {
        // Editor not yet mounted; keep looping until mounted
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

      const pat = pattern as { queryArc?: (a: number, b: number) => HapLike[] } | null;
      const queryArc = pat?.queryArc;

      if (typeof queryArc !== 'function') {
        // TASK-11 degraded mode: no hap API, keep a minimal visual cue using transport step.
        try {
          applyDegradedStepHighlight(view, miniLocations, fallbackStepRef.current);
        } catch {
          clearHighlights(view);
        }
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const phase = getTime();
      if (!Number.isFinite(phase)) {
        try {
          applyDegradedStepHighlight(view, miniLocations, fallbackStepRef.current);
        } catch {
          clearHighlights(view);
        }
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      try {
        // Drawer-style sliding window:
        //   - El primer frame solo captura phase (lastFrameRef era null).
        //   - Frames siguientes: queryArc(max(lastFrame, phase - lookback), phase).
        // Si es el primer frame, usamos phase - lookback como inicio para tener feedback inmediato.
        const begin =
          lastFrameRef.current === null
            ? Math.max(0, phase - HAP_LOOKBACK)
            : Math.max(lastFrameRef.current, phase - HAP_LOOKBACK);
        const newHaps = queryArc(begin, phase);
        lastFrameRef.current = phase;

        // Sliding window: descartar haps expirados, añadir nuevos con onset.
        // Conservamos las instancias originales para no perder isActive() ni el getter endClipped.
        visibleHapsRef.current = visibleHapsRef.current
          .filter((h) => h.whole != null && asNumber(h.endClipped) >= phase)
          .concat(newHaps.filter((h) => h.hasOnset?.()));

        // Activos en este frame — equivalente a `haps.filter(h.isActive(time))` del Drawer oficial.
        const active = visibleHapsRef.current
          .filter((h) => h.isActive?.(phase))
          .slice(0, MAX_ACTIVE_HAPS)
          // Añadimos markcss sin tocar las propiedades originales del hap
          // (highlight.mjs lee context.locations, whole y value — todas son own properties).
          .map((h) => ({
            ...h,
            value: {
              ...(h.value ?? {}),
              markcss: HAP_FLASH_STYLE,
            },
          }));

        if (active.length > 0) {
          highlightMiniLocations(view, phase, active);
        } else {
          applyCycleStepHighlight(view, queryArc, fallbackStepRef.current);
        }
      } catch {
        // EC-006: if scheduler data fails, degrade to global-step highlight without crashing.
        try {
          applyDegradedStepHighlight(view, miniLocations, fallbackStepRef.current);
        } catch {
          clearHighlights(view);
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return cancelLoop;
    // getView y getHapState son referencias estables (useCallback []).
    // fallbackStep se lee por ref para no relanzar el loop en cada tick del clock visual.
  }, [isPlaying, getView, getHapState]);
}

type HapLike = {
  hasOnset?: () => boolean;
  isActive?: (t: number) => boolean;
  /** Getter en la clase Hap — number/Fraction comparable con phase via valueOf. */
  endClipped?: unknown;
  whole?: { begin: unknown; end?: unknown } | null;
  value?: Record<string, unknown>;
  context?: { locations?: unknown[] };
};

// Fraction.valueOf devuelve un number; los mocks pasan number directo. Cast seguro.
function asNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (v && typeof (v as { valueOf?: () => unknown }).valueOf === 'function') {
    const n = (v as { valueOf: () => unknown }).valueOf();
    return typeof n === 'number' ? n : Number.NEGATIVE_INFINITY;
  }
  return Number.NEGATIVE_INFINITY;
}
