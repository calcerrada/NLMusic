// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SessionContext } from '@lib/types'

const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      create: createMock,
    }

    constructor(_options: unknown) {}
  },
}))

import { ClaudeAdapter } from '@lib/llm/adapters/claude.adapter'

const context: SessionContext = {
  turns: [],
  previous: {
    bpm: 138,
    tracks: [
      {
        id: 'kick-1',
        name: 'Kick',
        steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        volume: 0.9,
        muted: false,
        solo: false,
      },
    ],
  },
}

describe('ClaudeAdapter — PatternDelta contract and legacy compatibility', () => {
  beforeEach(() => {
    createMock.mockReset()
  })

  it('returns operations payload as PatternDelta', async () => {
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            bpm: 140,
            operations: [{ type: 'update', id: 'kick-1', patch: { volume: 0.95 } }],
          }),
        },
      ],
    })

    const adapter = new ClaudeAdapter({ apiKey: 'test-key' })
    const result = await adapter.generatePattern('louder kick', context)

    expect(result.operations).toHaveLength(1)
    expect(result.operations[0]).toMatchObject({ type: 'update', id: 'kick-1' })
    expect(result.bpm).toBe(140)
  })

  it('wraps legacy { bpm, tracks } format as replace operation', async () => {
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            bpm: 128,
            tracks: [
              {
                id: 'kick-1',
                name: 'Kick',
                steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                volume: 0.9,
                muted: false,
                solo: false,
              },
            ],
          }),
        },
      ],
    })

    const adapter = new ClaudeAdapter({ apiKey: 'test-key' })
    const result = await adapter.generatePattern('new pattern', context)

    expect(result.bpm).toBe(128)
    expect(result.operations).toHaveLength(1)
    expect(result.operations[0].type).toBe('replace')
    if (result.operations[0].type === 'replace') {
      expect(result.operations[0].tracks).toHaveLength(1)
      expect(result.operations[0].tracks[0].id).toBe('kick-1')
    }
  })

  it('parses json embedded in extra text', async () => {
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: `Here is your pattern:\n{ "operations": [{"type":"remove","id":"kick-1"}] }\nDone.`,
        },
      ],
    })

    const adapter = new ClaudeAdapter({ apiKey: 'test-key' })
    const result = await adapter.generatePattern('remove kick', context)

    expect(result.operations).toEqual([{ type: 'remove', id: 'kick-1' }])
  })

  describe('TASK-09 — code mode prompt (BR-009)', () => {
    it('includes codeMode instructions in user prompt when codeMode is set', async () => {
      createMock.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify({ operations: [{ type: 'replace', tracks: [] }] }) }],
      })

      const codeModeContext: SessionContext = {
        turns: [],
        codeMode: { enabled: true, strudelCode: 'stack(s("bd ~ hh ~"))', bpmHint: 140 },
      }

      const adapter = new ClaudeAdapter({ apiKey: 'test-key' })
      await adapter.generatePattern('make it faster', codeModeContext)

      const callArgs = createMock.mock.calls[0][0] as { messages: Array<{ content: string }> }
      const userPrompt = callArgs.messages[0].content

      expect(userPrompt).toContain('SOURCE OF TRUTH: Strudel code')
      expect(userPrompt).toContain('stack(s("bd ~ hh ~"))')
      expect(userPrompt).toContain('replace')
      expect(userPrompt).not.toContain('Current pattern state:')
    })

    it('includes grid state in user prompt when in normal mode', async () => {
      createMock.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify({ operations: [{ type: 'replace', tracks: [] }] }) }],
      })

      const adapter = new ClaudeAdapter({ apiKey: 'test-key' })
      await adapter.generatePattern('louder kick', context)

      const callArgs = createMock.mock.calls[0][0] as { messages: Array<{ content: string }> }
      const userPrompt = callArgs.messages[0].content

      expect(userPrompt).toContain('Current pattern state:')
      expect(userPrompt).toContain('kick-1')
      expect(userPrompt).not.toContain('SOURCE OF TRUTH: Strudel code')
    })
  })
})
