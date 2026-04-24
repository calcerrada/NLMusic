import type { LLMProvider, SessionContext, TrackJSON } from "@lib/types";
import { compileToStrudel } from "@features/audio";
import { validatePatternDelta } from "./validation";
import { applyDelta } from "./applyDelta";
import { fallbackPattern } from "./fallbackPattern";

export interface PipelineResult {
  trackJson: TrackJSON;
  usedFallback: boolean;
  warnings?: string[];
  error?: string;
}

const EMPTY_PATTERN: TrackJSON = { bpm: 138, tracks: [] };

/**
 * Ejecuta el pipeline v1: adapter devuelve PatternDelta → validar → aplicar
 * sobre el patrón actual → compilar Strudel. Fallback solo ante errores no recuperables.
 *
 * @see BR-001 El audio no se interrumpe — Strudel actualiza en el siguiente ciclo
 * @see BR-003 Errores → fallback uniforme, informar, ofrecer reintento
 * @see BR-004 Las pistas se crean de forma secuencial
 */
export async function runV0Pipeline(
  provider: LLMProvider,
  prompt: string,
  context: SessionContext
): Promise<PipelineResult> {
  try {
    const raw = await provider.generatePattern(prompt, context);

    // BR-002: validar contrato de operaciones
    const delta = validatePatternDelta(raw);

    // BR-004: aplicar delta sobre patrón previo (incremental, no snapshot)
    const previous = context.previous ?? context.currentPattern ?? EMPTY_PATTERN;
    const { next, warnings } = applyDelta(previous, delta);

    return {
      trackJson: {
        ...next,
        strudelCode: compileToStrudel(next),
      },
      usedFallback: false,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    // BR-003: cualquier error → fallback uniforme
    const fallback = fallbackPattern();
    return {
      trackJson: {
        ...fallback,
        strudelCode: compileToStrudel(fallback),
      },
      usedFallback: true,
      error: error instanceof Error ? error.message : "Unknown generation error",
    };
  }
}
