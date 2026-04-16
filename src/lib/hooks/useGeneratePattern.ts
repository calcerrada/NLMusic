'use client';

import { useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';
import type { GeneratePatternResponse } from '../types/api';

export function useGeneratePattern() {
  const { setGenerating, setError, addTurn, loadPattern, turns } =
    useSessionStore();

  const generate = useCallback(
    async (prompt: string): Promise<GeneratePatternResponse | undefined> => {
      if (!prompt.trim()) {
        setError('Prompt vacío');
        return;
      }

      setError(null);
      setGenerating(true);

      try {
        const res = await fetch('/api/generate-pattern', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            context: { turns, previous: null, language: 'mixed' },
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }

        const result: GeneratePatternResponse = await res.json();

        if (result.trackJson) {
          loadPattern(result.trackJson);
          addTurn({
            prompt,
            responseSummary: `BPM: ${result.trackJson.bpm}, ${result.trackJson.tracks.length} pistas`,
            timestampISO: new Date().toISOString(),
          });
        }

        if (result.usedFallback) {
          setError(`Fallback: ${result.error}`);
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [turns]
  );

  return { generate };
}
