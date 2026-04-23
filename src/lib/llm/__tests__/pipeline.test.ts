import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runV0Pipeline } from '@lib/llm/pipeline'
import { fallbackPattern } from '@lib/llm/fallbackPattern'
import type { LLMProvider, SessionContext, TrackJSON } from '@lib/types'

// Mock del adapter de LLM
const mockProvider: LLMProvider = {
  generatePattern: vi.fn(),
}

describe('pipeline — runV0Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('happy path — BR-002: valid response', () => {
    it('returns compiled TrackJSON on successful generation', async () => {
      const validResponse = {
        bpm: 120,
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
      }

      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce(validResponse)

      const context: SessionContext = {
        turns: [],
        currentPattern: null,
      }

      const result = await runV0Pipeline(mockProvider, 'test prompt', context)

      expect(result.usedFallback).toBe(false)
      expect(result.error).toBeUndefined()
      expect(result.trackJson.bpm).toBe(120)
      expect(result.trackJson.tracks).toHaveLength(1)
      expect(result.trackJson.strudelCode).toBeDefined()
    })

    it('populates strudelCode from compiler', async () => {
      const validResponse = {
        bpm: 120,
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
      }

      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce(validResponse)

      const context: SessionContext = { turns: [], currentPattern: null }
      const result = await runV0Pipeline(mockProvider, 'test', context)

      expect(result.trackJson.strudelCode).toBeTruthy()
      expect(typeof result.trackJson.strudelCode).toBe('string')
    })
  })

  describe('EC-001: LLM returns invalid JSON or schema mismatch', () => {
    it('activates fallback when validation fails', async () => {
      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce({
        bpm: 'invalid-bpm' as any,
        tracks: [],
      })

      const context: SessionContext = { turns: [], currentPattern: null }
      const result = await runV0Pipeline(mockProvider, 'test', context)

      expect(result.usedFallback).toBe(true)
      expect(result.error).toBeDefined()
      expect(result.trackJson).toMatchObject(fallbackPattern())
      expect(result.trackJson.strudelCode).toBeDefined()
    })

    it('returns valid fallback pattern on schema validation error', async () => {
      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce({
        bpm: 120,
        tracks: [], // empty tracks — violates min(1)
      })

      const context: SessionContext = { turns: [], currentPattern: null }
      const result = await runV0Pipeline(mockProvider, 'test', context)

      expect(result.usedFallback).toBe(true)
      const fallback = fallbackPattern()
      expect(result.trackJson.tracks).toEqual(fallback.tracks)
      expect(result.trackJson.strudelCode).toBeDefined()
    })

    it('EC-004: fallback covers BR-006 — max 5 tracks', async () => {
      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce({
        bpm: 120,
        tracks: Array(6).fill({
          id: 'track',
          name: 'Track',
          steps: Array(16).fill(0),
          volume: 0.8,
          muted: false,
          solo: false,
        }),
      })

      const context: SessionContext = { turns: [], currentPattern: null }
      const result = await runV0Pipeline(mockProvider, 'test', context)

      expect(result.usedFallback).toBe(true)
      expect(result.trackJson.tracks.length).toBeLessThanOrEqual(5)
    })
  })

  describe('EC-002: Network or provider error', () => {
    it('catches provider rejection and returns fallback', async () => {
      const networkError = new Error('Network timeout')
      vi.mocked(mockProvider.generatePattern).mockRejectedValueOnce(networkError)

      const context: SessionContext = { turns: [], currentPattern: null }
      const result = await runV0Pipeline(mockProvider, 'test', context)

      expect(result.usedFallback).toBe(true)
      expect(result.error).toContain('Network timeout')
      expect(result.trackJson).toMatchObject(fallbackPattern())
      expect(result.trackJson.strudelCode).toBeDefined()
    })

    it('catches non-Error rejections gracefully', async () => {
      vi.mocked(mockProvider.generatePattern).mockRejectedValueOnce('Unknown error string')

      const context: SessionContext = { turns: [], currentPattern: null }
      const result = await runV0Pipeline(mockProvider, 'test', context)

      expect(result.usedFallback).toBe(true)
      expect(result.error).toBeTruthy()
    })
  })

  describe('BR-001: audio never interrupts — state preservation', () => {
    it('does not modify context or previous state on error', async () => {
      const originalContext: SessionContext = {
        turns: [{ role: 'user', content: 'first prompt' }],
        currentPattern: {
          bpm: 120,
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
      }

      vi.mocked(mockProvider.generatePattern).mockRejectedValueOnce(new Error('API error'))

      const result = await runV0Pipeline(mockProvider, 'new prompt', originalContext)

      // Context was not modified
      expect(originalContext.turns).toHaveLength(1)
      expect(originalContext.currentPattern?.bpm).toBe(120)

      // Result contains safe fallback
      expect(result.usedFallback).toBe(true)
    })
  })

  describe('BR-003: uniform error handling', () => {
    it('treats validation error and network error identically', async () => {
      const context: SessionContext = { turns: [], currentPattern: null }

      // Test 1: validation error
      vi.mocked(mockProvider.generatePattern).mockResolvedValueOnce({ bpm: 'invalid' as any })
      const result1 = await runV0Pipeline(mockProvider, 'test', context)

      // Test 2: network error
      vi.mocked(mockProvider.generatePattern).mockRejectedValueOnce(new Error('Network'))
      const result2 = await runV0Pipeline(mockProvider, 'test', context)

      // Both should return fallback consistently
      expect(result1.usedFallback).toBe(true)
      expect(result2.usedFallback).toBe(true)
      expect(result1.trackJson).toEqual(result2.trackJson)
    })
  })
})
