import type { LLMProvider, SessionContext, TrackJSON } from "@lib/types";
import { compileToStrudel } from "@features/audio";
import { validateTrackJson } from "./validation";
import { fallbackPattern } from "./fallbackPattern";

export interface PipelineResult {
  trackJson: TrackJSON;
  usedFallback: boolean;
  truncated?: boolean;       // BR-006: LLM returned > 5 tracks, we sliced
  truncatedFrom?: number;    // original track count before truncation
  error?: string;
}

/**
 * Ejecuta el pipeline v0 de generación musical desde el provider hasta TrackJSON.
 * Trunca respuestas útiles con exceso de pistas antes de validar para no perderlas.
 *
 * @param provider - Adaptador LLM responsable de generar el patrón bruto.
 * @param prompt - Intención musical del usuario.
 * @param context - Contexto de sesión actual enviado al LLM.
 * @returns Resultado compilado, con fallback solo ante errores no recuperables.
 * @see BR-003 Los errores se manejan de forma uniforme
 * @see BR-006 Máximo 5 pistas, con truncamiento informado
 * @see EC-005 Exceso de pistas del LLM se conserva truncando en vez de descartar
 */
export async function runV0Pipeline(
  provider: LLMProvider,
  prompt: string,
  context: SessionContext
): Promise<PipelineResult> {
  try {
    const raw = await provider.generatePattern(prompt, context);

    // BR-006 / EC-005: preservamos la respuesta útil truncando a 5 pistas.
    const candidate =
      typeof raw === "object" && raw !== null
        ? ({ ...raw } as Record<string, unknown>)
        : raw;

    let truncated = false;
    let truncatedFrom: number | undefined;

    if (
      typeof candidate === "object" &&
      candidate !== null &&
      Array.isArray(candidate.tracks) &&
      candidate.tracks.length > 5
    ) {
      truncated = true;
      truncatedFrom = candidate.tracks.length;
      candidate.tracks = candidate.tracks.slice(0, 5);
    }

    // BR-003: los errores restantes de red/schema caen al fallback uniforme.
    const parsed = validateTrackJson(candidate);
    return {
      trackJson: {
        ...parsed,
        strudelCode: compileToStrudel(parsed)
      },
      usedFallback: false,
      truncated,
      truncatedFrom,
    };
  } catch (error) {
    const fallback = fallbackPattern();
    return {
      trackJson: {
        ...fallback,
        strudelCode: compileToStrudel(fallback)
      },
      usedFallback: true,
      error: error instanceof Error ? error.message : "Unknown generation error"
    };
  }
}
