'use client';

import { useCallback, useState } from 'react';
import { useSessionStore } from '@store/sessionStore';
import { compileToStrudel } from '@features/audio';
import type { SessionContext, Track, TrackJSON } from '@lib/types';

function inferTag(track: { name: string; sample?: string; tag?: string }): string {
  const base = `${track.tag ?? ''} ${track.sample ?? ''} ${track.name}`.toLowerCase();
  if (base.includes('kick') || base.includes('bd')) return 'kick';
  if (base.includes('snare') || base.includes('sd')) return 'snare';
  if (base.includes('hat') || base.includes('hh')) return 'hihat';
  if (base.includes('clap') || base.includes('cp')) return 'clap';
  if (base.includes('perc')) return 'perc';
  return 'perc';
}

function normalizeTrack(track: Track): Track {
  return {
    ...track,
    tag: track.tag ?? inferTag(track),
    steps: track.steps.map((step) => (step === 1 ? 1 : 0)) as (0 | 1)[],
  };
}

/**
 * Orquesta la generación de patrones desde la UI hacia la API de NLMusic.
 * Mantiene el estado local de carga/error y expone avisos informativos de truncamiento.
 *
 * @returns API de generación con estados de carga, error y aviso informativo.
 * @see BR-001 El audio existente no se interrumpe durante LOADING
 * @see BR-010 Prompt vacío no genera llamada al LLM
 * @see EC-005 Respuestas con más de 5 pistas se informan sin tratarlas como error fatal
 */
export function usePatternGen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const turns = useSessionStore((s) => s.turns);
  const bpm = useSessionStore((s) => s.bpm);
  const tracks = useSessionStore((s) => s.tracks);
  const currentCode = useSessionStore((s) => s.currentCode);
  const loadPattern = useSessionStore((s) => s.loadPattern);
  const addTurn = useSessionStore((s) => s.addTurn);

const generate = useCallback(async (prompt: string): Promise<boolean> => {
  if (!prompt.trim()) {
    setError("Prompt vacio");
    return false;
  }

  setIsLoading(true);
  setError(null);
  setInfo(null);
  addTurn("user", prompt);

  try {
    const context: SessionContext = {
      turns,
      currentPattern: { bpm, tracks, strudelCode: currentCode },
    };

    const response = await fetch("/api/generate-pattern", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        context: {
          turns: context.turns,
          previous: context.currentPattern,
          language: "mixed",
        },
      }),
    });

    const payload = await response.json();
    if (!response.ok || payload.success === false) {
      throw new Error(payload.error ?? `HTTP ${response.status}`);
    }

    const trackJson = payload.trackJson as TrackJSON;
    const normalizedTracks = trackJson.tracks.map(normalizeTrack);
    const normalizedPattern: TrackJSON = {
      bpm: trackJson.bpm,
      tracks: normalizedTracks,
      strudelCode: compileToStrudel({ bpm: trackJson.bpm, tracks: normalizedTracks }),
    };

    loadPattern(normalizedPattern);

    // EC-005: informamos el truncamiento sin convertirlo en error fatal.
    if (payload.truncated && payload.truncatedFrom) {
      const notice = `El LLM propuso ${payload.truncatedFrom} pistas; se mantuvieron 5 (límite BR-006). Elimina alguna para añadir más.`;
      setInfo(notice);
      addTurn("assistant", `Generado: ${normalizedTracks.length} pistas a ${normalizedPattern.bpm} BPM (${payload.truncatedFrom - 5} pistas descartadas por límite de 5)`);
    } else {
      addTurn("assistant", `Generado: ${normalizedTracks.length} pistas a ${normalizedPattern.bpm} BPM`);
    }

    if (payload.usedFallback) {
      setError(`Fallback activado: ${payload.error ?? "LLM no disponible"}`);
    }

    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    setError(message);
    return false;
  } finally {
    setIsLoading(false);
  }
}, [addTurn, bpm, currentCode, loadPattern, tracks, turns]);

  return { generate, isLoading, error, info };
}
