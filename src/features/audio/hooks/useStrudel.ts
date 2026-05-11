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
  /** TASK-11: stable getter for hap highlighting — reads module-level state, no re-renders. */
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

// References captured from the dynamic import of @strudel/web.
// Module-level to survive re-renders without re-initialising Strudel.
let _hush: (() => void) | null = null;
let _evaluate: ((code: string, autoplay?: boolean) => Promise<unknown>) | null = null;
let _transpiler: ((code: string) => { miniLocations?: [number, number][] } | null | undefined) | null = null;
// TASK-11: hap highlighting helpers
let _getTime: (() => number) | null = null;
let _lastPattern: unknown = null;
let _lastMiniLocations: [number, number][] = [];

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

        (mod.initStrudel as InitStrudelWithState)({
          prebake: () =>
            (globalThis as { samples?: (source: string) => void }).samples?.(
              'github:tidalcycles/dirt-samples',
            ),
          onUpdateState: (state: StrudelRuntimeState) => {
            _lastMiniLocations = state.miniLocations ?? [];
            if (state.pattern !== undefined) {
              _lastPattern = state.pattern;
            }
          },
        });

        _transpiler =
          typeof transpilerRuntime.transpiler === 'function'
            ? transpilerRuntime.transpiler
            : null;

        // hush & evaluate are runtime exports not in the .d.ts types
        const runtime = mod as unknown as {
          hush?: () => void;
          evaluate?: (code: string, autoplay?: boolean) => Promise<unknown>;
          getTime?: () => number;
        };
        _hush = runtime.hush ?? null;
        _evaluate = runtime.evaluate ?? null;
        // TASK-11: getTime is optional; some test mocks don't expose it.
        try {
          _getTime = typeof runtime.getTime === 'function' ? runtime.getTime : null;
        } catch {
          _getTime = null;
        }

        // Also available on globalThis after initStrudel
        const g = globalThis as Record<string, unknown>;
        if (!_hush && typeof g.hush === 'function') _hush = g.hush as () => void;
        if (!_evaluate && typeof g.evaluate === 'function')
          _evaluate = g.evaluate as (code: string, autoplay?: boolean) => Promise<unknown>;
        if (!_getTime && typeof g.getTime === 'function') {
          _getTime = g.getTime as () => number;
        }

        console.log(
          '[Strudel] ready — hush:', !!_hush,
          'evaluate:', !!_evaluate,
          'transpiler:', !!_transpiler,
          'getTime:', !!_getTime,
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
    // _evaluate es null mientras el import dinámico no ha resuelto
    if (!_evaluate) {
      throw new Error('Strudel no inicializado todavía');
    }

    try {
      // TASK-11: capture the returned Pattern for queryArc in the hap highlighting loop
      const patternResult = await _evaluate(code, autoplay);
      _lastPattern = patternResult;

      // TASK-11: derive token-level miniLocations from transpiler output.
      if (_transpiler) {
        const out = _transpiler(code);
        _lastMiniLocations = out?.miniLocations ?? [];
      } else {
        _lastMiniLocations = [];
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
    if (_hush) {
      _hush();
      // TASK-11: clear pattern so the hap highlighting loop stops querying
      _lastPattern = null;
      _lastMiniLocations = [];
      return;
    }
    console.warn('[Strudel] hush not available');
  }, []);

  // TASK-11: stable getter that reads module-level hap state — never triggers re-renders.
  // useCallback with empty deps ensures the reference is stable across renders.
  const getHapState = useCallback<() => HapState>(
    () => ({
      pattern: _lastPattern,
      miniLocations: _lastMiniLocations,
      // BR-001: getTime reads the scheduler clock without touching React state
      getTime: _getTime ?? (() => 0),
    }),
    [],
  );

  return { play, stop, isReady, initError, getHapState };
}
