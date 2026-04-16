/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook para integrar @strudel/web en Next.js.
 *
 * API correcta (v1.x):
 *  - initStrudel()  → inicializa y expone funciones globales (evaluate, hush, samples…)
 *  - evaluate(code) → evalúa y ejecuta un patrón Strudel (igual que el REPL)
 *  - hush()         → para toda reproducción en curso
 *
 * Docs: https://www.npmjs.com/package/@strudel/web
 */
export function useStrudel() {
  const [initialized, setInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    // Dynamic import — evita problemas de SSR con WebAudio API
    import('@strudel/web')
      .then(({ initStrudel }) => {
        initStrudel({
          // Carga los samples de TidalCycles (bd, sd, hh, cp, etc.)
          prebake: () =>
            (globalThis as any).samples?.(
              'github:tidalcycles/dirt-samples'
            ),
        });
        setInitialized(true);
        console.log('[Strudel] Initialized via @strudel/web');
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Strudel init error: ${msg}`);
        console.error('[Strudel] init error:', err);
      });
  }, []);

  const play = useCallback(async (code: string) => {
    try {
      const normalizedCode = code
        .replace(/\.setcpm\(/g, '.cpm(')
        .replace(/\.setCpm\(/g, '.cpm(');

      // evaluate() es global después de initStrudel()
      await (globalThis as any).evaluate(normalizedCode);
      setIsPlaying(true);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Strudel play error: ${msg}`);
      console.error('[Strudel] play error:', err);
    }
  }, []);

  const stop = useCallback(() => {
    try {
      // hush() es global después de initStrudel()
      (globalThis as any).hush?.();
      setIsPlaying(false);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Strudel stop error: ${msg}`);
    }
  }, []);

  const reset = useCallback(() => stop(), [stop]);

  return { initialized, isPlaying, error, play, stop, reset };
}
