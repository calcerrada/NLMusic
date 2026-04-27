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
 * Devuelve true si el delta contiene operaciones incrementales (add/update/remove)
 * que no son seguras cuando no hay un snapshot de pistas fiable.
 */
function hasUnsafeDelta(delta: { operations: Array<{ type: string }> }): boolean {
  return delta.operations.some(
    (op) => op.type === "add" || op.type === "update" || op.type === "remove"
  );
}

/**
 * Ejecuta el pipeline v1: adapter devuelve PatternDelta → validar → aplicar
 * sobre el patrón actual → compilar Strudel. Fallback solo ante errores no recuperables.
 *
 * En code mode, solo se acepta `replace` como operación segura. Si el LLM devuelve
 * un delta incremental (add/update/remove) sin base fiable, se trata como error
 * uniforme (BR-003) y activa el fallback.
 *
 * @see BR-001 El audio no se interrumpe — Strudel actualiza en el siguiente ciclo
 * @see BR-003 Errores → fallback uniforme, informar, ofrecer reintento
 * @see BR-004 Las pistas se crean de forma secuencial
 * @see BR-009 Fuente de verdad coherente entre editor y pipeline
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

    // BR-009/BR-004: en code mode sin snapshot fiable, solo replace es seguro.
    // Un delta incremental aplicado sobre pistas obsoletas generaría resultados inconsistentes.
    if (context.codeMode?.enabled && !context.previous && hasUnsafeDelta(delta)) {
      throw new Error(
        "Delta incremental recibido en code mode sin snapshot estructurado fiable. " +
        "Solo se acepta 'replace' cuando el contexto es código Strudel editado manualmente."
      );
    }

    // BR-009: en code mode sin snapshot estructurado, conservar BPM usando bpmHint.
    // Evita saltos de tempo al default cuando el LLM devuelve replace sin bpm explícito.
    const previous = context.previous
      ?? (context.codeMode
        ? { bpm: context.codeMode.bpmHint, tracks: [] }
        : EMPTY_PATTERN);
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
