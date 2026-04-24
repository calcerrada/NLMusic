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
 * Ejecuta la transición de reintento desde estado ERROR.
 * Centraliza ERROR -> LOADING en el store y relanza el flujo con el último prompt válido.
 *
 * @param storeRetry - Acción global que devuelve el prompt a reintentar.
 * @param generate - Función principal de generación usada también en submit normal.
 * @see BR-003 Errores y reintento se gestionan de forma uniforme
 * @see EC-002 Reintento tras error de red sin reescribir prompt
 */
function retryFromStore(
  storeRetry: () => string | null,
  generate: (prompt: string) => Promise<boolean>
): void {
  const prompt = storeRetry();
  if (prompt) {
    void generate(prompt);
  }
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
  const [info, setInfo] = useState<string | null>(null);

  const turns = useSessionStore((s) => s.turns);
  const bpm = useSessionStore((s) => s.bpm);
  const tracks = useSessionStore((s) => s.tracks);
  const currentCode = useSessionStore((s) => s.currentCode);
  const lastError = useSessionStore((s) => s.lastError);
  const loadPattern = useSessionStore((s) => s.loadPattern);
  const addTurn = useSessionStore((s) => s.addTurn);
  const startLoading = useSessionStore((s) => s.startLoading);
  const storeRetry = useSessionStore((s) => s.retry);
  const storeSetError = useSessionStore((s) => s.setError);
  const setLastPrompt = useSessionStore((s) => s.setLastPrompt);

  const generate = useCallback(async (prompt: string): Promise<boolean> => {
    // BR-010: prompt vacío no llama al LLM
    if (!prompt.trim()) {
      storeSetError("Prompt vacío");
      return false;
    }

    setIsLoading(true);
    startLoading();
    setInfo(null);
    setLastPrompt(prompt);
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

      const warnings: string[] = Array.isArray(payload.warnings) ? payload.warnings : [];

      if (warnings.length > 0) {
        // BR-005/BR-006: warnings son informativos, no fatales — mostrar como turno de asistente
        const warningText = warnings.join(" | ");
        setInfo(warningText);
        addTurn("assistant", `Generado: ${normalizedTracks.length} pistas a ${normalizedPattern.bpm} BPM. Avisos: ${warningText}`);
      } else {
        addTurn("assistant", `Generado: ${normalizedTracks.length} pistas a ${normalizedPattern.bpm} BPM`);
      }

      // BR-003: fallback también se comunica como estado de error recuperable.
      if (payload.usedFallback) {
        storeSetError(`Fallback activado: ${payload.error ?? "LLM no disponible"}`);
      }

      return true;
    } catch (err) {
      // BR-003: cualquier error → informar, mantener estado, ofrecer reintento
      const message = err instanceof Error ? err.message : "Error desconocido";
      storeSetError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [addTurn, bpm, currentCode, loadPattern, setLastPrompt, startLoading, storeSetError, tracks, turns]);

  // BR-003: reintento — reutiliza lastPrompt del store sin que el usuario reescriba
  const retry = useCallback(() => {
    retryFromStore(storeRetry, generate);
  }, [generate, storeRetry]);

  return { generate, retry, isLoading, error: lastError, info };
}
