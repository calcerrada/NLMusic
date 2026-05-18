'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hap state snapshot emitted after each successful evaluate.
 * Consumed by useHapEvents to drive per-token highlighting in CodeMirror.
 */
export interface HapState {
  /** The Pattern returned by @strudel/web evaluate — queryArc is safe to call. */
  pattern: unknown;
  /** Character offset pairs [start, end] for each mini-notation token. */
  miniLocations: [number, number][];
  /** Returns current scheduler time in cycles (same unit as Pattern.queryArc). */
  getTime: () => number;
}

/**
 * Resultado del hook useStrudel.
 * `initError` es null mientras el motor no ha fallado;
 * si es string, la app no puede reproducir audio (EC-010).
 */
export interface UseStrudelResult {
  play: (code: string, autoplay?: boolean) => Promise<void>;
  stop: () => void;
  isReady: boolean;
  initError: string | null;
  /** TASK-11/TASK-16: getter estable para hap highlighting desde estado en ref, sin re-renders. */
  getHapState: () => HapState;
}

interface StrudelRuntimeState {
  miniLocations?: [number, number][];
  pattern?: unknown;
}

type InitStrudelWithState = (options: {
  prebake?: () => void;
  onUpdateState?: (state: StrudelRuntimeState) => void;
}) => void;

interface StrudelInternalState {
  hush: (() => void) | null;
  evaluate: ((code: string, autoplay?: boolean) => Promise<unknown>) | null;
  transpiler: ((code: string) => { miniLocations?: [number, number][] } | null | undefined) | null;
  getTime: (() => number) | null;
  lastPattern: unknown;
  lastMiniLocations: [number, number][];
}

/**
 * Inicializa el motor de audio Strudel y expone play/stop.
 *
 * Carga `@strudel/web` una sola vez (guarda en `initialized.current`).
 * Si la carga falla, `initError` recibe un mensaje legible y `isReady`
 * permanece false para siempre — la app debe informar al usuario (EC-010).
 *
 * @returns `{ play, stop, isReady, initError, getHapState }`
 *
 * @see BR-001 El audio nunca se interrumpe — play() actualiza el loop sin stop() previo
 * @see EC-010 Si initStrudel() falla, la app no es funcional; exponer initError a la UI
 */
export function useStrudel(): UseStrudelResult {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const initialized = useRef(false);
  // Ref lets play() read current initError without stale closure
  const initErrorRef = useRef<string | null>(null);
  // TASK-16: encapsula estado mutable del runtime por instancia del hook (sin estado global de modulo).
  const internalRef = useRef<StrudelInternalState>({
    hush: null,
    evaluate: null,
    transpiler: null,
    getTime: null,
    lastPattern: null,
    lastMiniLocations: [],
  });

  useEffect(() => {
    // Previene doble inicialización en StrictMode o remontajes
    if (initialized.current) {
      return;
    }
    initialized.current = true;

    (async () => {
      try {
        const [mod, transpilerRuntime] = await Promise.all([
          import('@strudel/web'),
          import('@strudel/transpiler'),
        ]);

        const internal = internalRef.current;

        (mod.initStrudel as InitStrudelWithState)({
          prebake: () =>
            (globalThis as { samples?: (source: string) => void }).samples?.(
              'github:tidalcycles/dirt-samples',
            ),
          onUpdateState: (state: StrudelRuntimeState) => {
            internal.lastMiniLocations = state.miniLocations ?? [];
            if (state.pattern !== undefined) {
              internal.lastPattern = state.pattern;
            }
          },
        });

        internal.transpiler =
          typeof transpilerRuntime.transpiler === 'function'
            ? transpilerRuntime.transpiler
            : null;

        // hush & evaluate are runtime exports not in the .d.ts types
        const runtime = mod as unknown as {
          hush?: () => void;
          evaluate?: (code: string, autoplay?: boolean) => Promise<unknown>;
          getTime?: () => number;
        };
        internal.hush = runtime.hush ?? null;
        internal.evaluate = runtime.evaluate ?? null;
        // TASK-11: getTime is optional; some test mocks don't expose it.
        try {
          internal.getTime = typeof runtime.getTime === 'function' ? runtime.getTime : null;
        } catch {
          internal.getTime = null;
        }

        // Also available on globalThis after initStrudel
        const g = globalThis as Record<string, unknown>;
        if (!internal.hush && typeof g.hush === 'function') internal.hush = g.hush as () => void;
        if (!internal.evaluate && typeof g.evaluate === 'function')
          internal.evaluate = g.evaluate as (code: string, autoplay?: boolean) => Promise<unknown>;
        if (!internal.getTime && typeof g.getTime === 'function') {
          internal.getTime = g.getTime as () => number;
        }

        console.log(
          '[Strudel] ready — hush:', !!internal.hush,
          'evaluate:', !!internal.evaluate,
          'transpiler:', !!internal.transpiler,
          'getTime:', !!internal.getTime,
        );
        initErrorRef.current = null;
        setInitError(null);
        setIsReady(true);
      } catch (error: unknown) {
        // EC-010: log extendido para diagnóstico remoto (userAgent + AudioContext)
        console.error('[Strudel] init failed', {
          error,
          userAgent: navigator.userAgent,
          audioContextAvailable: typeof AudioContext !== 'undefined',
          audioContextType: typeof AudioContext,
        });

        const msg =
          error instanceof Error
            ? `No se pudo inicializar Strudel: ${error.message}`
            : 'No se pudo inicializar Strudel';

        initErrorRef.current = msg;
        setInitError(msg);
        setIsReady(false);
      }
    })();
  }, []);

  const play = useCallback(async (code: string, autoplay = true) => {
    // EC-010: distingue "init falló" de "todavía cargando" para que el
    // consumidor pueda reaccionar de forma diferente en cada caso
    if (initErrorRef.current !== null) {
      throw new Error(`Motor de audio no disponible: ${initErrorRef.current}`);
    }
    const internal = internalRef.current;
    if (!internal.evaluate) {
      throw new Error('Strudel no inicializado todavía');
    }

    try {
      // TASK-11: capture the returned Pattern for queryArc in the hap highlighting loop
      const patternResult = await internal.evaluate(code, autoplay);
      internal.lastPattern = patternResult;

      // TASK-11: derive token-level miniLocations from transpiler output.
      if (internal.transpiler) {
        const out = internal.transpiler(code);
        internal.lastMiniLocations = out?.miniLocations ?? [];
      } else {
        internal.lastMiniLocations = [];
      }

    } catch (error) {
      // EC-006: normaliza errores del runtime para que el panel muestre feedback legible.
      if (error instanceof Error) {
        throw new Error(`Error evaluando Strudel: ${error.message}`);
      }
      throw new Error('Error evaluando Strudel');
    }
  }, []);

  const stop = useCallback(() => {
    const internal = internalRef.current;
    if (internal.hush) {
      internal.hush();
      // TASK-11: clear pattern so the hap highlighting loop stops querying
      internal.lastPattern = null;
      internal.lastMiniLocations = [];
      return;
    }
    console.warn('[Strudel] hush not available');
  }, []);

  // TASK-11: stable getter that reads ref-level hap state — never triggers re-renders.
  const getHapState = useCallback<() => HapState>(
    () => ({
      pattern: internalRef.current.lastPattern,
      miniLocations: internalRef.current.lastMiniLocations,
      // BR-001: getTime reads the scheduler clock without touching React state
      getTime: internalRef.current.getTime ?? (() => 0),
    }),
    [],
  );

  return { play, stop, isReady, initError, getHapState };
}
