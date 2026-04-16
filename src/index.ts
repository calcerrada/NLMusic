import "dotenv/config";
import { ClaudeAdapter } from "./lib/llm/providers/claude.adapter.js";
import type { SessionContext } from "./lib/llm/types.js";
import { runV0Pipeline } from "./lib/v0/pipeline.js";

function readPromptFromArgs(): string {
  const args = process.argv.slice(2);
  const promptIndex = process.argv.indexOf("--prompt");
  if (promptIndex === -1) {
    const freeText = args.filter((arg) => !arg.startsWith("--")).join(" ").trim();
    return freeText || "un bombo 909 en 4x4 techno, oscuro y acelerado";
  }

  const value = process.argv.slice(promptIndex + 1).join(" ").trim();
  if (!value) {
    throw new Error("Missing prompt value after --prompt");
  }

  return value;
}

function shouldForceFallback(): boolean {
  return process.argv.includes("--fallback") || process.env.NLMUSIC_FORCE_FALLBACK === "1";
}

function createContext(): SessionContext {
  return {
    turns: [],
    language: "mixed"
  };
}

async function main(): Promise<void> {
  const prompt = readPromptFromArgs();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const forceFallback = shouldForceFallback();

  if (!apiKey && !forceFallback) {
    throw new Error("ANTHROPIC_API_KEY is not set. Copy .env.example to .env and set the key, or run with --fallback.");
  }

  const provider = forceFallback
    ? {
        async generatePattern(): Promise<never> {
          throw new Error("Forced fallback enabled");
        }
      }
    : new ClaudeAdapter({ apiKey: apiKey as string });
  const result = await runV0Pipeline(provider, prompt, createContext());

  if (result.usedFallback) {
    console.error("[v0] Used fallback pattern:", result.error ?? "Unknown error");
  }

  console.log(JSON.stringify(result.trackJson, null, 2));
}

main().catch((error) => {
  console.error("[v0] Pipeline failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
