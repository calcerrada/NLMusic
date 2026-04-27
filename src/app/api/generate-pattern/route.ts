import { NextRequest, NextResponse } from 'next/server';
import { ClaudeAdapter } from '@lib/llm/adapters/claude.adapter';
import { runV0Pipeline } from '@lib/llm/pipeline';
import type { SessionContext } from '@lib/types';

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
    const { prompt, context } = await req.json();

    if (typeof prompt !== 'string' || prompt.trim() === '') {
      // BR-010: prompt vacío o inválido no avanza al pipeline LLM
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
