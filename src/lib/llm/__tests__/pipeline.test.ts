import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runV0Pipeline } from '@lib/llm/pipeline'
import { fallbackPattern } from '@lib/llm/fallbackPattern'
import type { LLMProvider, SessionContext, PatternDelta } from '@lib/types'

const mockProvider: LLMProvider = {
  generatePattern: vi.fn(),
}

const replaceOneDelta = (bpm: number): PatternDelta => ({
  bpm,
  operations: [
    {
      type: 'replace',
      tracks: [
        {
          id: 'kick-1',
          name: 'Kick',
          steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] as (0 | 1)[],
          volume: 0.85,
          muted: false,
          solo: false,
        },
      ],
    },
  ],
})

describe('pipeline — runV0Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('happy path — BR-002: valid response', () => {
    it('returns compiled TrackJSON on successful replace operation', async () => {
      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce(replaceOneDelta(120))

      const context: SessionContext = { turns: [] }
      const result = await runV0Pipeline(mockProvider, 'test prompt', context)

      expect(result.usedFallback).toBe(false)
      expect(result.error).toBeUndefined()
      expect(result.trackJson.bpm).toBe(120)
      expect(result.trackJson.tracks).toHaveLength(1)
      expect(result.trackJson.strudelCode).toBeDefined()
    })

    it('populates strudelCode from compiler', async () => {
      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce({
        bpm: 120,
        operations: [
          {
            type: 'replace',
            tracks: [
              {
                id: 'kick-1',
                name: 'Kick',
                steps: Array(16).fill(0) as (0 | 1)[],
                volume: 0.8,
                muted: false,
                solo: false,
              },
            ],
          },
        ],
      })

      const context: SessionContext = { turns: [] }
      const result = await runV0Pipeline(mockProvider, 'test', context)

      expect(result.trackJson.strudelCode).toBeTruthy()
      expect(typeof result.trackJson.strudelCode).toBe('string')
    })
  })

  describe('BR-004: incremental delta operations', () => {
    it('add operation appends track to existing pattern', async () => {
      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce({
        operations: [
          {
            type: 'add',
            track: {
              id: 'hihat-1',
              name: 'Hi-Hat',
              steps: Array(16).fill(0) as (0 | 1)[],
              volume: 0.6,
              muted: false,
              solo: false,
            },
          },
        ],
      })

      const context: SessionContext = {
        turns: [],
        previous: {
          bpm: 138,
          tracks: [
            {
              id: 'kick-1',
              name: 'Kick',
              steps: Array(16).fill(0) as (0 | 1)[],
              volume: 0.9,
              muted: false,
              solo: false,
            },
          ],
        },
      }

      const result = await runV0Pipeline(mockProvider, 'add hihat', context)

      expect(result.usedFallback).toBe(false)
      // BR-004: original kick preserved + new hihat added
      expect(result.trackJson.tracks).toHaveLength(2)
      expect(result.trackJson.tracks[0].id).toBe('kick-1')
      expect(result.trackJson.tracks[1].id).toBe('hihat-1')
    })

    it('update operation modifies existing track without replacing others', async () => {
      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce({
        operations: [{ type: 'update', id: 'snare-1', patch: { volume: 0.95 } }],
      })

      const context: SessionContext = {
        turns: [],
        previous: {
          bpm: 138,
          tracks: [
            { id: 'kick-1', name: 'Kick', steps: Array(16).fill(0) as (0 | 1)[], volume: 0.9, muted: false, solo: false },
            { id: 'snare-1', name: 'Snare', steps: Array(16).fill(0) as (0 | 1)[], volume: 0.7, muted: false, solo: false },
          ],
        },
      }

      const result = await runV0Pipeline(mockProvider, 'louder snare', context)

      expect(result.usedFallback).toBe(false)
      expect(result.trackJson.tracks).toHaveLength(2)
      expect(result.trackJson.tracks.find(t => t.id === 'snare-1')?.volume).toBe(0.95)
      expect(result.trackJson.tracks.find(t => t.id === 'kick-1')?.volume).toBe(0.9)
    })

    it('remove operation deletes the target track', async () => {
      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce({
        operations: [{ type: 'remove', id: 'hihat-1' }],
      })

      const context: SessionContext = {
        turns: [],
        previous: {
          bpm: 138,
          tracks: [
            { id: 'kick-1', name: 'Kick', steps: Array(16).fill(0) as (0 | 1)[], volume: 0.9, muted: false, solo: false },
            { id: 'hihat-1', name: 'Hi-Hat', steps: Array(16).fill(0) as (0 | 1)[], volume: 0.6, muted: false, solo: false },
          ],
        },
      }

      const result = await runV0Pipeline(mockProvider, 'remove hihat', context)

      expect(result.usedFallback).toBe(false)
      expect(result.trackJson.tracks).toHaveLength(1)
      expect(result.trackJson.tracks[0].id).toBe('kick-1')
    })
  })

  describe('BR-005/BR-006: delta warnings', () => {
    it('BR-005: unknown id in update produces a warning, does not fail', async () => {
      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce({
        operations: [{ type: 'update', id: 'ghost-99', patch: { volume: 0.5 } }],
      })

      const context: SessionContext = {
        turns: [],
        previous: { bpm: 138, tracks: [{ id: 'kick-1', name: 'Kick', steps: Array(16).fill(0) as (0 | 1)[], volume: 0.9, muted: false, solo: false }] },
      }

      const result = await runV0Pipeline(mockProvider, 'update ghost', context)

      expect(result.usedFallback).toBe(false)
      expect(result.warnings).toBeDefined()
      expect(result.warnings!.length).toBeGreaterThan(0)
      expect(result.trackJson.tracks).toHaveLength(1) // unchanged
    })

    it('EC-005/BR-006: replace with > 5 tracks truncates and adds warning', async () => {
      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce({
        bpm: 120,
        operations: [
          {
            type: 'replace',
            tracks: Array.from({ length: 6 }, (_, i) => ({
              id: `track-${i}`,
              name: `Track ${i}`,
              steps: Array(16).fill(0) as (0 | 1)[],
              volume: 0.8,
              muted: false,
              solo: false,
            })),
          },
        ],
      })

      const context: SessionContext = { turns: [] }
      const result = await runV0Pipeline(mockProvider, 'test', context)

      expect(result.usedFallback).toBe(false)
      expect(result.trackJson.tracks).toHaveLength(5)
      expect(result.warnings).toBeDefined()
      expect(result.warnings!.some(w => w.includes('BR-006'))).toBe(true)
    })

    it('BR-006: add when already at 5 tracks produces warning, no new track', async () => {
      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce({
        operations: [
          {
            type: 'add',
            track: { id: 'extra', name: 'Extra', steps: Array(16).fill(0) as (0 | 1)[], volume: 0.5, muted: false, solo: false },
          },
        ],
      })

      const previous5Tracks = {
        bpm: 138,
        tracks: Array.from({ length: 5 }, (_, i) => ({
          id: `t-${i}`,
          name: `T${i}`,
          steps: Array(16).fill(0) as (0 | 1)[],
          volume: 0.8,
          muted: false,
          solo: false,
        })),
      }

      const context: SessionContext = { turns: [], previous: previous5Tracks }
      const result = await runV0Pipeline(mockProvider, 'add track', context)

      expect(result.usedFallback).toBe(false)
      expect(result.trackJson.tracks).toHaveLength(5) // unchanged
      expect(result.warnings).toBeDefined()
    })
  })

  describe('EC-001: LLM returns invalid schema', () => {
    it('activates fallback when validation fails', async () => {
      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce({
        bpm: 'invalid-bpm' as unknown as number,
        operations: [],
      } as unknown as PatternDelta)

      const context: SessionContext = { turns: [] }
      const result = await runV0Pipeline(mockProvider, 'test', context)

      expect(result.usedFallback).toBe(true)
      expect(result.error).toBeDefined()
      expect(result.trackJson).toMatchObject(fallbackPattern())
      expect(result.trackJson.strudelCode).toBeDefined()
    })
  })

  describe('EC-002: Network or provider error', () => {
    it('catches provider rejection and returns fallback', async () => {
      vi.mocked(mockProvider.generatePattern).mockRejectedValueOnce(new Error('Network timeout'))

      const context: SessionContext = { turns: [] }
      const result = await runV0Pipeline(mockProvider, 'test', context)

      expect(result.usedFallback).toBe(true)
      expect(result.error).toContain('Network timeout')
      expect(result.trackJson).toMatchObject(fallbackPattern())
      expect(result.trackJson.strudelCode).toBeDefined()
    })

    it('catches non-Error rejections gracefully', async () => {
      vi.mocked(mockProvider.generatePattern).mockRejectedValueOnce('Unknown error string')

      const context: SessionContext = { turns: [] }
      const result = await runV0Pipeline(mockProvider, 'test', context)

      expect(result.usedFallback).toBe(true)
      expect(result.error).toBeTruthy()
    })
  })

  describe('BR-001: audio never interrupts — state preservation', () => {
    it('does not modify context or previous state on error', async () => {
      const originalContext: SessionContext = {
        turns: [{ role: 'user', content: 'first prompt' }],
        previous: {
          bpm: 120,
          tracks: [{ id: 'kick-1', name: 'Kick', steps: Array(16).fill(0) as (0 | 1)[], volume: 0.8, muted: false, solo: false }],
        },
      }

      vi.mocked(mockProvider.generatePattern).mockRejectedValueOnce(new Error('API error'))

      const result = await runV0Pipeline(mockProvider, 'new prompt', originalContext)

      expect(originalContext.turns).toHaveLength(1)
      expect(originalContext.previous?.bpm).toBe(120)
      expect(result.usedFallback).toBe(true)
    })
  })

  describe('BR-003: uniform error handling', () => {
    it('treats validation error and network error identically', async () => {
      const context: SessionContext = { turns: [] }

      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce({ bpm: 'invalid' as unknown as number } as unknown as PatternDelta)
      const result1 = await runV0Pipeline(mockProvider, 'test', context)

      vi.mocked(mockProvider.generatePattern).mockRejectedValueOnce(new Error('Network'))
      const result2 = await runV0Pipeline(mockProvider, 'test', context)

      expect(result1.usedFallback).toBe(true)
      expect(result2.usedFallback).toBe(true)
      expect(result1.trackJson).toEqual(result2.trackJson)
    })
  })

  describe('TASK-09 — code mode guards (BR-009, BR-004)', () => {
    it('accepts replace in code mode without previous snapshot', async () => {
      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce(replaceOneDelta(120))

      const context: SessionContext = {
        turns: [],
        codeMode: { enabled: true, strudelCode: 'stack(s("bd"))', bpmHint: 120 },
      }

      const result = await runV0Pipeline(mockProvider, 'make it slower', context)

      expect(result.usedFallback).toBe(false)
      expect(result.trackJson.tracks).toHaveLength(1)
    })

    it('rejects add operation in code mode without previous — triggers fallback (BR-003)', async () => {
      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce({
        operations: [
          {
            type: 'add',
            track: { id: 'hh-1', name: 'Hi-Hat', steps: Array(16).fill(0) as (0 | 1)[], volume: 0.6, muted: false, solo: false },
          },
        ],
      })

      const context: SessionContext = {
        turns: [],
        codeMode: { enabled: true, strudelCode: 'stack(s("bd"))', bpmHint: 138 },
      }

      const result = await runV0Pipeline(mockProvider, 'add a hihat', context)

      expect(result.usedFallback).toBe(true)
      expect(result.error).toContain('code mode')
    })

    it('rejects update operation in code mode without previous — triggers fallback', async () => {
      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce({
        operations: [{ type: 'update', id: 'kick-1', patch: { volume: 0.5 } }],
      })

      const context: SessionContext = {
        turns: [],
        codeMode: { enabled: true, strudelCode: 'stack(s("bd"))', bpmHint: 138 },
      }

      const result = await runV0Pipeline(mockProvider, 'lower kick', context)

      expect(result.usedFallback).toBe(true)
    })

    it('rejects remove operation in code mode without previous — triggers fallback', async () => {
      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce({
        operations: [{ type: 'remove', id: 'kick-1' }],
      })

      const context: SessionContext = {
        turns: [],
        codeMode: { enabled: true, strudelCode: 'stack(s("bd"))', bpmHint: 138 },
      }

      const result = await runV0Pipeline(mockProvider, 'remove kick', context)

      expect(result.usedFallback).toBe(true)
    })

    it('grid mode with previous snapshot still applies incremental deltas normally', async () => {
      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce({
        operations: [
          {
            type: 'add',
            track: { id: 'hh-1', name: 'Hi-Hat', steps: Array(16).fill(0) as (0 | 1)[], volume: 0.6, muted: false, solo: false },
          },
        ],
      })

      const context: SessionContext = {
        turns: [],
        previous: {
          bpm: 138,
          tracks: [{ id: 'kick-1', name: 'Kick', steps: Array(16).fill(0) as (0 | 1)[], volume: 0.9, muted: false, solo: false }],
        },
      }

      const result = await runV0Pipeline(mockProvider, 'add hihat', context)

      expect(result.usedFallback).toBe(false)
      expect(result.trackJson.tracks).toHaveLength(2)
    })

    it('preserves bpmHint in code mode when replace omits bpm', async () => {
      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce({
        operations: [
          {
            type: 'replace',
            tracks: [{ id: 'kick-1', name: 'Kick', steps: Array(16).fill(0) as (0 | 1)[], volume: 0.9, muted: false, solo: false }],
          },
        ],
      })

      const context: SessionContext = {
        turns: [],
        codeMode: { enabled: true, strudelCode: 'stack(s("bd"))', bpmHint: 96 },
      }

      const result = await runV0Pipeline(mockProvider, 'make it slower', context)

      expect(result.usedFallback).toBe(false)
      expect(result.trackJson.bpm).toBe(96)
    })
  })
})
