'use client';

import { useState } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';
import type { TrackJSON, SessionTurn } from '@/lib/llm/types';

export function PromptBox() {
  const [input, setInput] = useState('');
  const { isGenerating, setGenerating, setError, addTurn, loadPattern, turns } =
    useSessionStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    setError(null);
    setGenerating(true);

    try {
      const response = await fetch('/api/generate-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          context: { turns, previous: null, language: 'mixed' },
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error desconocido');
      }

      const result = await response.json();

      if (result.trackJson) {
        loadPattern(result.trackJson);

        // Registrar el turno
        const turn: SessionTurn = {
          prompt: input,
          responseSummary: `BPM: ${result.trackJson.bpm}, ${result.trackJson.tracks.length} pistas`,
          timestampISO: new Date().toISOString(),
        };
        addTurn(turn);
      }

      if (result.usedFallback) {
        setError(`Fallback activado: ${result.error}`);
      }

      setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Ej: kick 909 en 4x4..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isGenerating}
          className="flex-1 px-3 py-2 bg-dark-50 border border-gray-600 text-white disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isGenerating || !input.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600"
        >
          {isGenerating ? 'Generando...' : 'Generar'}
        </button>
      </form>
    </div>
  );
}
