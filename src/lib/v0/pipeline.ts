import type { LLMProvider, SessionContext, TrackJSON } from "../llm/types.js";
import { compileToStrudel } from "../strudel/compiler.js";
import { validateTrackJson } from "../validation/trackSchema.js";
import { fallbackPattern } from "./fallbackPattern.js";

export interface PipelineResult {
  trackJson: TrackJSON;
  usedFallback: boolean;
  error?: string;
}

export async function runV0Pipeline(
  provider: LLMProvider,
  prompt: string,
  context: SessionContext
): Promise<PipelineResult> {
  try {
    const raw = await provider.generatePattern(prompt, context);
    const parsed = validateTrackJson(raw);
    return {
      trackJson: {
        ...parsed,
        strudelCode: parsed.strudelCode ?? compileToStrudel(parsed)
      },
      usedFallback: false
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
