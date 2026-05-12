import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ClaudeAdapter } from '@lib/llm/adapters/claude.adapter';
import { runV0Pipeline } from '@lib/llm/pipeline';
import type { SessionContext } from '@lib/types';

const requestBodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  context: z.object({
    turns: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().max(500),
    })).max(40).optional(),
    previous: z.object({
      bpm: z.number().int().min(60).max(220),
      tracks: z.array(z.any()).max(5),
      strudelCode: z.string().optional(),
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
    const parsed = requestBodySchema.safeParse(await req.json());
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

    // BR-009: propagar codeMode si existe; en code mode no incluir `previous` obsoleto
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
