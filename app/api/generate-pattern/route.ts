import { NextRequest, NextResponse } from 'next/server';
import { ClaudeAdapter } from '@/lib/llm/providers/claude.adapter';
import { runV0Pipeline } from '@/lib/v0/pipeline';
import type { SessionContext } from '@/lib/llm/types';

export async function POST(req: NextRequest) {
  try {
    const { prompt, context } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt inválido' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Servidor no configurado: ANTHROPIC_API_KEY faltante' },
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

    return NextResponse.json({
      success: true,
      trackJson: result.trackJson,
      usedFallback: false,
    });
  } catch (error) {
    console.error('[API] generate-pattern error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
