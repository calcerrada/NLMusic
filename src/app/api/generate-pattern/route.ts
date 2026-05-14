import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ClaudeAdapter } from '@lib/llm/adapters/claude.adapter';
import { runV0Pipeline } from '@lib/llm/pipeline';
import type { SessionContext } from '@lib/types';

/**
 * Snapshot acotado de pistas previas aceptado por la API.
 * Replica solo el subset que el pipeline necesita para evitar payloads arbitrarios o desproporcionados.
 * @see BR-011
 */
const previousTrackSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  tag: z.string().max(50).optional(),
  sample: z.string().max(100).optional(),
  steps: z.array(z.union([z.literal(0), z.literal(1)])).length(16),
  volume: z.number().min(0).max(1),
  muted: z.boolean(),
  solo: z.boolean(),
});

/**
 * Valida el body completo antes de tocar el provider o el pipeline.
 * Los límites mantienen el contrato acotado y evitan abusos de tamaño en turns, tracks y código Strudel.
 * @see BR-002
 * @see BR-011
 */
const requestBodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  context: z.object({
    turns: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().max(500),
    })).max(40).optional(),
    previous: z.object({
      bpm: z.number().int().min(60).max(220),
      tracks: z.array(previousTrackSchema).max(5),
      strudelCode: z.string().max(5000).optional(),
    }).optional(),
    codeMode: z.object({
      enabled: z.literal(true),
      strudelCode: z.string().max(5000),
      bpmHint: z.number().int().min(60).max(220),
    }).optional(),
    language: z.enum(['es', 'en', 'mixed']).optional(),
  }).optional(),
});

/**
 * Genera un patrón musical y devuelve un contrato API explícito.
 * Un fallback válido responde con ok=true para no bloquear reproducción;
 * solo errores reales de request/configuración responden con ok=false.
 *
 * @see BR-002 La respuesta aplicada debe cumplir schema válido
 * @see BR-011 La API key nunca se expone al cliente
 */
export async function POST(req: NextRequest) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Body inválido' },
        { status: 400 }
      );
    }

    const parsed = requestBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Body inválido', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { prompt, context } = parsed.data;

    // BR-010: prompt vacío o solo espacios no avanza al pipeline LLM
    if (!prompt.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Prompt inválido' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // BR-011: sin key de servidor no se puede proxear la llamada al proveedor
      return NextResponse.json(
        { ok: false, error: 'Servidor no configurado: ANTHROPIC_API_KEY faltante' },
        { status: 500 }
      );
    }

    const model = process.env.ANTHROPIC_MODEL;
    const provider = new ClaudeAdapter({ apiKey, model });

    /**
     * Normaliza el contexto para que el pipeline reciba una sola fuente de verdad.
     * En modo código se descarta `previous` porque puede haber quedado obsoleto respecto al editor.
     * @see BR-009
     */
    const sessionContext: SessionContext = {
      turns: context?.turns ?? [],
      previous: context?.codeMode ? undefined : context?.previous,
      codeMode: context?.codeMode,
      language: context?.language ?? 'mixed',
    };

    const result = await runV0Pipeline(provider, prompt, sessionContext);

    if (result.usedFallback) {
      // EC-001/EC-002: si falla LLM/red, mantener flujo con patrón fallback válido
      return NextResponse.json({
        ok: true,
        trackJson: result.trackJson,
        source: 'fallback' as const,
        warning: result.error ?? 'LLM no disponible',
      });
    }

    // LLM success — include any delta warnings (BR-005/BR-006)
    return NextResponse.json({
      ok: true,
      trackJson: result.trackJson,
      source: 'llm' as const,
      warnings: result.warnings ?? [],
    });
  } catch (error) {
    console.error('[API] generate-pattern error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
