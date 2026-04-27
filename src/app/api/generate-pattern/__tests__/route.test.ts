// @vitest-environment node
import { beforeEach, afterAll, describe, expect, it, vi } from 'vitest'

const { runV0PipelineMock, ClaudeAdapterMock } = vi.hoisted(() => ({
  runV0PipelineMock: vi.fn(),
  ClaudeAdapterMock: vi.fn(),
}))

vi.mock('@lib/llm/pipeline', () => ({
  runV0Pipeline: runV0PipelineMock,
}))

vi.mock('@lib/llm/adapters/claude.adapter', () => ({
  ClaudeAdapter: class MockClaudeAdapter {
    constructor(options: unknown) {
      ClaudeAdapterMock(options)
    }
  },
}))

import { POST } from '../route'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/generate-pattern', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/generate-pattern — TASK-06 contract coherence', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, ANTHROPIC_API_KEY: 'test-key' }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('returns { ok: false } with 400 for invalid prompt', async () => {
    const response = await POST(makeRequest({ prompt: '   ' }) as never)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({ ok: false, error: 'Prompt inválido' })
    expect(runV0PipelineMock).not.toHaveBeenCalled()
  })

  it('returns { ok: false } with 500 when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY

    const response = await POST(makeRequest({ prompt: 'kick', context: {} }) as never)
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload.ok).toBe(false)
    expect(payload.error).toContain('ANTHROPIC_API_KEY')
    expect(runV0PipelineMock).not.toHaveBeenCalled()
  })

  it('returns { ok: true, source: llm } with warnings on successful LLM response', async () => {
    runV0PipelineMock.mockResolvedValueOnce({
      usedFallback: false,
      trackJson: {
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
      },
      warnings: ['Reemplazo propuso 7 pistas; se mantuvieron 5 (BR-006).'],
    })

    const response = await POST(makeRequest({
      prompt: 'añade un kick',
      context: {
        turns: [],
        previous: {
          bpm: 120,
          tracks: [],
        },
      },
    }) as never)

    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.source).toBe('llm')
    expect(payload.warning).toBeUndefined()
    expect(payload.warnings).toHaveLength(1)
  })

  it('returns { ok: true, source: fallback, warning } when pipeline used fallback', async () => {
    runV0PipelineMock.mockResolvedValueOnce({
      usedFallback: true,
      error: 'Network timeout',
      trackJson: {
        bpm: 138,
        tracks: [
          {
            id: 'fallback-kick',
            name: 'Kick 909',
            steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
            volume: 0.85,
            muted: false,
            solo: false,
          },
        ],
      },
    })

    const response = await POST(makeRequest({ prompt: 'kick', context: { turns: [] } }) as never)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.source).toBe('fallback')
    expect(payload.warning).toContain('Network timeout')
    expect(payload.trackJson).toBeDefined()
  })

  it('builds SessionContext using previous (not currentPattern alias)', async () => {
    runV0PipelineMock.mockResolvedValueOnce({
      usedFallback: false,
      trackJson: {
        bpm: 120,
        tracks: [],
      },
    })

    const previous = {
      bpm: 110,
      tracks: [
        {
          id: 'kick-1',
          name: 'Kick',
          steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
          volume: 0.8,
          muted: false,
          solo: false,
        },
      ],
      strudelCode: 'stack(s("bd ~ ~ ~").gain(0.8))',
    }

    await POST(makeRequest({
      prompt: 'keep groove',
      context: {
        turns: [{ role: 'user', content: 'initial groove' }],
        previous,
        currentPattern: { bpm: 999, tracks: [] },
      },
    }) as never)

    expect(runV0PipelineMock).toHaveBeenCalledTimes(1)
    expect(runV0PipelineMock).toHaveBeenCalledWith(
      expect.anything(),
      'keep groove',
      expect.objectContaining({
        previous,
        language: 'mixed',
      })
    )
  })

  it('TASK-09: propagates codeMode and clears previous when in code mode', async () => {
    runV0PipelineMock.mockResolvedValueOnce({
      usedFallback: false,
      trackJson: { bpm: 120, tracks: [] },
    })

    const codeMode = {
      enabled: true,
      strudelCode: 'stack(s("bd ~ hh ~"))',
      bpmHint: 138,
    }

    await POST(makeRequest({
      prompt: 'make it slower',
      context: {
        turns: [],
        codeMode,
        previous: { bpm: 138, tracks: [] },
      },
    }) as never)

    expect(runV0PipelineMock).toHaveBeenCalledWith(
      expect.anything(),
      'make it slower',
      expect.objectContaining({
        codeMode,
        previous: undefined,
      })
    )
  })
})
