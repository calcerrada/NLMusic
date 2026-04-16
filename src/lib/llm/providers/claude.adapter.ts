import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, SessionContext, TrackJSON } from "../types";
import { buildSystemPrompt } from "../systemPrompt";

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
      const sliced = trimmed.slice(first, last + 1);
      return JSON.parse(sliced);
    }
    throw new Error("Claude did not return valid JSON.");
  }
}

function buildUserPrompt(prompt: string, context: SessionContext): string {
  const payload = {
    prompt,
    context
  };

  return JSON.stringify(payload);
}

export class ClaudeAdapter implements LLMProvider {
  private readonly client: Anthropic;

  private readonly model: string;

  constructor(options: ClaudeAdapterOptions) {
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model ?? DEFAULT_ANTHROPIC_MODEL;
  }

  async generatePattern(prompt: string, context: SessionContext): Promise<TrackJSON> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1400,
      temperature: 0.3,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: buildUserPrompt(prompt, context) }]
    });

    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude response has no text block.");
    }

    return tryParseJson(textBlock.text) as TrackJSON;
  }
}
