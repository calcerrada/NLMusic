'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseStrudelResult {
  play: (code: string) => Promise<void>;
  stop: () => void;
  isReady: boolean;
}

// Store module-level references captured from the dynamic import
let _hush: (() => void) | null = null;
let _evaluate: ((code: string) => Promise<unknown>) | null = null;

export function useStrudel(): UseStrudelResult {
  const [isReady, setIsReady] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
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
          evaluate?: (code: string) => Promise<unknown>;
        };
        _hush = runtime.hush ?? null;
        _evaluate = runtime.evaluate ?? null;

        // Also available on globalThis after initStrudel
        const g = globalThis as Record<string, unknown>;
        if (!_hush && typeof g.hush === 'function') _hush = g.hush as () => void;
        if (!_evaluate && typeof g.evaluate === 'function')
          _evaluate = g.evaluate as (code: string) => Promise<unknown>;

        console.log('[Strudel] ready — hush:', !!_hush, 'evaluate:', !!_evaluate);
        setIsReady(true);
      })
      .catch((error) => {
        console.error('[Strudel] init failed', error);
      });
  }, []);

  const play = useCallback(async (code: string) => {
    if (!_evaluate) {
      console.warn('[Strudel] evaluate not available yet');
      return;
    }
    await _evaluate(code);
  }, []);

  const stop = useCallback(() => {
    if (_hush) {
      _hush();
      return;
    }
    console.warn('[Strudel] hush not available');
  }, []);

  return { play, stop, isReady };
}
