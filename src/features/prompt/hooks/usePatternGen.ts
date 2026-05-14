'use client';

import { useCallback, useState } from 'react';
import { useSessionStore } from '@store/sessionStore';
import type { TrackJSON } from '@lib/types';

/**
 * Ejecuta la transición de reintento desde estado ERROR.
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
 *
 * @see BR-001 El audio existente no se interrumpe durante LOADING
 * @see BR-010 Prompt vacío no genera llamada al LLM
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

  const isCodeManuallyEdited = useSessionStore((s) => s.isCodeManuallyEdited);

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

    // BR-009: construir contexto según modo activo
    // En grid mode, `previous` tiene el snapshot fiable de tracks.
    // En code mode, `tracks` puede estar desfasado — solo enviamos el código actual.
    const contextPayload = isCodeManuallyEdited
      ? {
          turns,
          codeMode: { enabled: true, strudelCode: currentCode, bpmHint: bpm },
          language: "mixed",
        }
      : {
          turns,
          previous: { bpm, tracks, strudelCode: currentCode },
          language: "mixed",
        };

    try {
      const response = await fetch("/api/generate-pattern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context: contextPayload }),
      });

      const payload = await response.json();

      // Hard error: non-OK HTTP or explicit ok: false in body
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }

      // Pipeline already normalized tracks and compiled strudelCode in a single pass (BR-009).
      // Reuse the payload directly — no client-side normalization or recompilation (FIX-6).
      const trackJson = payload.trackJson as TrackJSON;
      loadPattern(trackJson);

      if (payload.source === 'fallback') {
        // EC-001/EC-002: fallback válido informa sin forzar estado ERROR
        const fallbackMsg = payload.warning ?? 'LLM no disponible — patrón de fallback cargado';
        setInfo(fallbackMsg);
        addTurn("assistant", `Fallback: ${trackJson.tracks.length} pistas — ${fallbackMsg}`);
      } else {
        // LLM success — surface any delta warnings (BR-005/BR-006)
        const warnings: string[] = Array.isArray(payload.warnings) ? payload.warnings : [];
        if (warnings.length > 0) {
          const warningText = warnings.join(" | ");
          setInfo(warningText);
          addTurn("assistant", `Generado: ${trackJson.tracks.length} pistas a ${trackJson.bpm} BPM. Avisos: ${warningText}`);
        } else {
          addTurn("assistant", `Generado: ${trackJson.tracks.length} pistas a ${trackJson.bpm} BPM`);
        }
      }

      return true;
    } catch (err) {
      // BR-003: cualquier error real → informar, mantener estado y habilitar reintento
      const message = err instanceof Error ? err.message : "Error desconocido";
      storeSetError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [addTurn, bpm, currentCode, isCodeManuallyEdited, loadPattern, setLastPrompt, startLoading, storeSetError, tracks, turns]);

  // BR-003: reintento — reutiliza lastPrompt del store sin que el usuario reescriba
  const retry = useCallback(() => {
    retryFromStore(storeRetry, generate);
  }, [generate, storeRetry]);

  return { generate, retry, isLoading, error: lastError, info };
}
