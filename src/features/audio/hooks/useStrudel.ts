'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
}

// Referencias capturadas del import dinámico de @strudel/web.
// Son module-level para sobrevivir re-renders sin reinicializar Strudel.
let _hush: (() => void) | null = null;
let _evaluate: ((code: string, autoplay?: boolean) => Promise<unknown>) | null = null;

/**
 * Inicializa el motor de audio Strudel y expone play/stop.
 *
 * Carga `@strudel/web` una sola vez (guarda en `initialized.current`).
 * Si la carga falla, `initError` recibe un mensaje legible y `isReady`
 * permanece false para siempre — la app debe informar al usuario (EC-010).
 *
 * @returns `{ play, stop, isReady, initError }`
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

    import('@strudel/web')
      .then((mod) => {
        mod.initStrudel({
          prebake: () =>
            (globalThis as { samples?: (source: string) => void }).samples?.(
              'github:tidalcycles/dirt-samples',
            ),
        });

        // hush & evaluate are runtime exports not in the .d.ts types
        const runtime = mod as unknown as {
          hush?: () => void;
          evaluate?: (code: string, autoplay?: boolean) => Promise<unknown>;
        };
        _hush = runtime.hush ?? null;
        _evaluate = runtime.evaluate ?? null;

        // Also available on globalThis after initStrudel
        const g = globalThis as Record<string, unknown>;
        if (!_hush && typeof g.hush === 'function') _hush = g.hush as () => void;
        if (!_evaluate && typeof g.evaluate === 'function')
          _evaluate = g.evaluate as (code: string, autoplay?: boolean) => Promise<unknown>;

        console.log('[Strudel] ready — hush:', !!_hush, 'evaluate:', !!_evaluate);
        initErrorRef.current = null;
        setInitError(null);
        setIsReady(true);
      })
      .catch((error: unknown) => {
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
      });
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
    await _evaluate(code, autoplay);
  }, []);

  const stop = useCallback(() => {
    if (_hush) {
      _hush();
      return;
    }
    console.warn('[Strudel] hush not available');
  }, []);

  return { play, stop, isReady, initError };
}
