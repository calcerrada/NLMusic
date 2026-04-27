import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, SessionContext, PatternDelta } from "@lib/types";
import type { Track } from "@lib/types";
import { buildSystemPrompt } from "../prompts/systemPrompt";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";

interface ClaudeAdapterOptions {
  apiKey: string;
  model?: string;
}

function tryParseJson(raw: string): unknown {
  const trimmed = raw.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(trimmed.slice(first, last + 1));
    }
    throw new Error("Claude did not return valid JSON.");
  }
}

/**
 * Convierte el formato viejo { bpm, tracks } al nuevo { operations: [replace] }.
 * Permite desplegar sin romper si el LLM no sigue las nuevas instrucciones.
 */
function normalizeToDelta(raw: unknown): PatternDelta {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("LLM returned non-object response.");
  }

  const obj = raw as Record<string, unknown>;

  // Ya tiene el formato nuevo con operations
  if (Array.isArray(obj.operations)) {
    return raw as PatternDelta;
  }

  // Tolerancia: formato viejo { bpm, tracks } → envolver como replace
  if (Array.isArray(obj.tracks)) {
    return {
      bpm: typeof obj.bpm === "number" ? obj.bpm : undefined,
      operations: [{ type: "replace", tracks: obj.tracks as Track[] }],
    };
  }

  throw new Error("LLM returned unexpected format (no 'operations' or 'tracks').");
}

/**
 * Construye el prompt de usuario con snapshot del patrón previo y turnos recientes.
 *
 * En grid mode usa `previous.tracks` como fuente de verdad para operaciones incrementales.
 * En code mode usa `codeMode.strudelCode` como fuente de verdad; los track ids no son fiables.
 *
 * @see BR-009 Editor y pipeline comparten fuente de verdad coherente
 * @see BR-004 Deltas incrementales solo sobre base fiable
 */
function buildUserPrompt(prompt: string, context: SessionContext): string {
  const lines: string[] = [`User request: ${prompt}`, ""];

  if (context.codeMode?.enabled) {
    // BR-009: en code mode el código Strudel es la única fuente de verdad
    lines.push(
      "SOURCE OF TRUTH: Strudel code (user has edited the code directly)",
      "Track ids in this context are NOT reliable — do NOT use add/update/remove.",
      "You MUST use 'replace' as the operation type.",
      "",
      "Current Strudel code (what is actually playing):",
      context.codeMode.strudelCode,
      "",
      `BPM hint: ${context.codeMode.bpmHint}`,
    );
  } else {
    const currentTracks = context.previous?.tracks ?? [];
    const currentBpm = context.previous?.bpm;

    const trackLines =
      currentTracks.length > 0
        ? currentTracks.map(
            (t) => `  - id: "${t.id}", name: "${t.name}", sample: "${t.sample ?? t.tag ?? ""}", volume: ${t.volume}`
          )
        : ["  (no tracks yet — use replace to create a fresh pattern)"];

    lines.push(
      "Current pattern state:",
      currentBpm ? `  BPM: ${currentBpm}` : "  BPM: (none)",
      "  Tracks:",
      ...trackLines,
    );
  }

  if (context.turns.length > 0) {
    lines.push("", "Recent conversation:");
    context.turns.slice(-4).forEach((t) => {
      lines.push(`  ${t.role}: ${t.content}`);
    });
  }

  return lines.join("\n");
}

export class ClaudeAdapter implements LLMProvider {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(options: ClaudeAdapterOptions) {
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model ?? DEFAULT_ANTHROPIC_MODEL;
  }

  // BR-004: devuelve PatternDelta en lugar de TrackJSON completo
  async generatePattern(prompt: string, context: SessionContext): Promise<PatternDelta> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1400,
      temperature: 0.3,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: buildUserPrompt(prompt, context) }],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude response has no text block.");
    }

    const parsed = tryParseJson(textBlock.text);
    return normalizeToDelta(parsed);
  }
}
