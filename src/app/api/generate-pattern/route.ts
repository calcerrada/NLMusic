import { NextRequest, NextResponse } from 'next/server';
import { ClaudeAdapter } from '@lib/llm/adapters/claude.adapter';
import { runV0Pipeline } from '@lib/llm/pipeline';
import type { SessionContext } from '@lib/types';

export async function POST(req: NextRequest) {
  try {
    const { prompt, context } = await req.json();

    if (typeof prompt !== 'string' || prompt.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          usedFallback: false,
          error: 'Prompt inválido',
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          usedFallback: false,
          error: 'Servidor no configurado: ANTHROPIC_API_KEY faltante',
        },
        { status: 500 }
      );
    }

    const model = process.env.ANTHROPIC_MODEL;
    const provider = new ClaudeAdapter({ apiKey, model });
    
    const sessionContext: SessionContext = {
      turns: context?.turns ?? [],
      previous: context?.previous,
      language: context?.language ?? 'mixed',
    };

    const result = await runV0Pipeline(provider, prompt, sessionContext);

    if (result.usedFallback) {
      return NextResponse.json({
        success: false,
        trackJson: result.trackJson,
        usedFallback: true,
        error: result.error,
      });
    }

    // EC-005: propagamos el truncamiento para que la UI pueda informar al usuario.
    return NextResponse.json({
      success: true,
      trackJson: result.trackJson,
      usedFallback: false,
      truncated: result.truncated ?? false,
      truncatedFrom: result.truncatedFrom,
    });
  } catch (error) {
    console.error('[API] generate-pattern error:', error);
    return NextResponse.json(
      {
        success: false,
        usedFallback: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
