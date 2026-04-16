/**
 * NLMusic v0 — Batería de validación Go/No-Go
 * Uso: npm run v0:test
 */

import "dotenv/config";
import { ClaudeAdapter } from "./lib/llm/providers/claude.adapter";
import type { SessionContext, SessionTurn, TrackJSON } from "./lib/llm/types";
import { runV0Pipeline } from "./lib/v0/pipeline";

// ── 20 prompts en 4 categorías ────────────────────────────────────────────

interface TestCase {
  id: string;
  category: "simple" | "abstract" | "iterative" | "boundary";
  prompt: string;
  previousPattern?: TrackJSON;
}

const PREV_138: TrackJSON = {
  bpm: 138,
  tracks: [
    {
      id: "kick", name: "Kick", sample: "bd",
      steps: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
      volume: 0.9, muted: false, solo: false
    },
    {
      id: "snare", name: "Snare", sample: "sd",
      steps: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      volume: 0.75, muted: false, solo: false
    },
    {
      id: "hihat", name: "Hi-Hat", sample: "hh",
      steps: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      volume: 0.55, muted: false, solo: false
    }
  ]
};

const TEST_CASES: TestCase[] = [
  // Simple — concretos y directos, deben acertar siempre
  { id: "S01", category: "simple",    prompt: "kick 909 en 4x4" },
  { id: "S02", category: "simple",    prompt: "kick y snare en negras y contratiempos" },
  { id: "S03", category: "simple",    prompt: "hihat cerrado cada corchea" },
  { id: "S04", category: "simple",    prompt: "bombo, caja y hihat techno a 130 BPM" },
  { id: "S05", category: "simple",    prompt: "drum and bass break roto a 174 BPM" },

  // Abstract — intención artística, el LLM debe interpretar
  { id: "A01", category: "abstract",  prompt: "algo oscuro y minimal" },
  { id: "A02", category: "abstract",  prompt: "energía rave berlinés, muy duro" },
  { id: "A03", category: "abstract",  prompt: "groove hipnótico y repetitivo" },
  { id: "A04", category: "abstract",  prompt: "lo más lento y pesado posible" },
  { id: "A05", category: "abstract",  prompt: "techno industrial, casi noise" },

  // Iterative — el LLM debe usar el patrón previo como contexto
  { id: "I01", category: "iterative", prompt: "hazlo más rápido",        previousPattern: PREV_138 },
  { id: "I02", category: "iterative", prompt: "añade un clap en el 3",   previousPattern: PREV_138 },
  { id: "I03", category: "iterative", prompt: "quita el hihat",          previousPattern: PREV_138 },
  { id: "I04", category: "iterative", prompt: "hazlo más oscuro",        previousPattern: PREV_138 },
  { id: "I05", category: "iterative", prompt: "dobla el BPM",            previousPattern: PREV_138 },

  // Boundary — edge cases y robustez del fallback
  { id: "B01", category: "boundary",  prompt: "silence" },
  { id: "B02", category: "boundary",  prompt: "asdfghjkl" },
  { id: "B03", category: "boundary",  prompt: "todos los pasos activos a máximo volumen" },
  { id: "B04", category: "boundary",  prompt: "220 BPM gabber hardcore kick" },
  { id: "B05", category: "boundary",  prompt: "60 BPM doom metal muy lento" }
];

// ── Thresholds Go/No-Go ───────────────────────────────────────────────────

const THRESHOLD_SUCCESS_RATE = 0.9;   // ≥90%  (máx 2 fallbacks sobre 20)
const THRESHOLD_P95_MS       = 8000;  // p95 ≤ 8s

// ── Helpers ───────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ── Runner ────────────────────────────────────────────────────────────────

interface TestResult {
  id: string;
  category: TestCase["category"];
  prompt: string;
  success: boolean;
  latencyMs: number;
  bpm?: number;
  trackCount?: number;
  error?: string;
}

async function runTests(provider: ClaudeAdapter): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const tc of TEST_CASES) {
    const label = `"${tc.prompt.slice(0, 46)}"`;
    process.stdout.write(`  [${tc.id}] ${tc.category.padEnd(10)} ${label.padEnd(50)}… `);

    const turns: SessionTurn[] = tc.previousPattern
      ? [{
          prompt: "(prev)",
          responseSummary: JSON.stringify(tc.previousPattern).slice(0, 120),
          timestampISO: new Date().toISOString()
        }]
      : [];

    const ctx: SessionContext = { turns, previous: tc.previousPattern, language: "mixed" };

    const t0 = Date.now();
    const result = await runV0Pipeline(provider, tc.prompt, ctx);
    const latencyMs = Date.now() - t0;

    const row: TestResult = {
      id: tc.id,
      category: tc.category,
      prompt: tc.prompt,
      success: !result.usedFallback,
      latencyMs,
      bpm: result.trackJson.bpm,
      trackCount: result.trackJson.tracks.length,
      error: result.error
    };

    results.push(row);
    process.stdout.write(`${row.success ? "✓" : "✗ FALLBACK"}  (${latencyMs}ms)\n`);
  }

  return results;
}

// ── Report ────────────────────────────────────────────────────────────────

function printReport(results: TestResult[]): boolean {
  const total       = results.length;
  const successes   = results.filter((r) => r.success).length;
  const successRate = successes / total;
  const latencies   = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const avgMs       = Math.round(latencies.reduce((a, b) => a + b, 0) / total);
  const p95Ms       = percentile(latencies, 95);

  console.log("\n" + "═".repeat(70));
  console.log("  NLMusic v0 — Informe Go/No-Go");
  console.log("═".repeat(70));

  for (const cat of ["simple", "abstract", "iterative", "boundary"] as const) {
    const cr = results.filter((r) => r.category === cat);
    const ok = cr.filter((r) => r.success).length;
    const bar = "█".repeat(ok) + "░".repeat(cr.length - ok);
    console.log(`  ${cat.padEnd(12)} ${bar}  ${ok}/${cr.length}`);
  }

  console.log(`\n  Latencia   media: ${avgMs}ms   p95: ${p95Ms}ms   (umbral ≤${THRESHOLD_P95_MS}ms)`);
  console.log(`  Éxito      ${successes}/${total} (${Math.round(successRate * 100)}%)   (umbral ≥${THRESHOLD_SUCCESS_RATE * 100}%)`);

  const fallbacks = results.filter((r) => !r.success);
  if (fallbacks.length > 0) {
    console.log("\n  FALLBACKS:");
    for (const f of fallbacks) {
      console.log(`    [${f.id}] "${f.prompt.slice(0, 55)}" — ${f.error ?? "?"}`);
    }
  }

  const go = successRate >= THRESHOLD_SUCCESS_RATE && p95Ms <= THRESHOLD_P95_MS;

  console.log("\n" + "─".repeat(70));
  if (go) {
    console.log("  VEREDICTO: ✅  GO — pipeline listo para MVP");
  } else {
    console.log("  VEREDICTO: ❌  NO-GO");
    if (successRate < THRESHOLD_SUCCESS_RATE) {
      console.log(`    → Tasa baja (${Math.round(successRate * 100)}%). Iterar system prompt con más ejemplos.`);
    }
    if (p95Ms > THRESHOLD_P95_MS) {
      console.log(`    → Latencia p95 alta (${p95Ms}ms). Revisar max_tokens o modelo.`);
    }
  }
  console.log("─".repeat(70) + "\n");

  return go;
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model  = process.env.ANTHROPIC_MODEL;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY no definido en .env");
  }

  console.log(`\n  NLMusic v0 — Batería (${TEST_CASES.length} prompts)   modelo: ${model ?? "default"}\n`);

  const provider = new ClaudeAdapter({ apiKey, model });
  const results  = await runTests(provider);
  const go       = printReport(results);

  process.exitCode = go ? 0 : 1;
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
