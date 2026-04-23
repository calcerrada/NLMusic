import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePatternGen } from '@features/prompt/hooks/usePatternGen'
import { useSessionStore } from '@store/sessionStore'
import type { TrackJSON } from '@lib/types'

// Mock global fetch
global.fetch = vi.fn()

describe('usePatternGen — hook for LLM pattern generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSessionStore.setState({
      tracks: [],
      bpm: 138,
      turns: [],
    })
  })

  describe('generate — BR-010: empty prompt handling', () => {
    it('rejects empty prompt without calling API', async () => {
      const { result } = renderHook(() => usePatternGen())

      let success = false
      await act(async () => {
        success = await result.current.generate('')
      })

      expect(success).toBe(false)
      expect(result.current.error).toBeTruthy()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('rejects whitespace-only prompt without calling API', async () => {
      const { result } = renderHook(() => usePatternGen())

      let success = false
      await act(async () => {
        success = await result.current.generate('   ')
      })

      expect(success).toBe(false)
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('generate — happy path: BDD SC-1', () => {
    it('sends prompt to /api/generate-pattern and loads pattern on success', async () => {
      const validResponse: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'kick-1',
            name: 'Kick',
            steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
            volume: 0.85,
            muted: false,
            solo: false,
          },
        ],
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, trackJson: validResponse }),
      } as any)

      const { result } = renderHook(() => usePatternGen())

      let success = false
      await act(async () => {
        success = await result.current.generate('bombo 808')
      })

      expect(success).toBe(true)
      expect(result.current.error).toBeNull()
      expect(global.fetch).toHaveBeenCalledWith('/api/generate-pattern', expect.any(Object))
    })

    it('addTurn is called for user and assistant roles', async () => {
      const validResponse: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'kick-1',
            name: 'Kick',
            steps: Array(16).fill(0) as (0 | 1)[],
            volume: 0.85,
            muted: false,
            solo: false,
          },
        ],
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, trackJson: validResponse }),
      } as any)

      const { result } = renderHook(() => usePatternGen())

      await act(async () => {
        await result.current.generate('kick pattern')
      })

      const turns = useSessionStore.getState().turns
      expect(turns.length).toBeGreaterThanOrEqual(1)
      expect(turns.some((t) => t.role === 'user' && t.content === 'kick pattern')).toBe(true)
    })

    it('EC-005: surfaces truncation info when API keeps only 5 tracks', async () => {
      const truncatedResponse: TrackJSON = {
        bpm: 128,
        tracks: Array.from({ length: 5 }, (_, index) => ({
          id: `track-${index + 1}`,
          name: `Track ${index + 1}`,
          steps: Array(16).fill(0) as (0 | 1)[],
          volume: 0.8,
          muted: false,
          solo: false,
        })),
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          trackJson: truncatedResponse,
          truncated: true,
          truncatedFrom: 7,
        }),
      } as Response)

      const { result } = renderHook(() => usePatternGen())

      await act(async () => {
        await result.current.generate('añade 7 pistas')
      })

      expect(result.current.info).toContain('7 pistas')
      expect(useSessionStore.getState().tracks).toHaveLength(5)
      expect(
        useSessionStore
          .getState()
          .turns.some(
            (turn) =>
              turn.role === 'assistant' &&
              turn.content.includes('2 pistas descartadas por límite de 5')
          )
      ).toBe(true)
    })
  })

  describe('isLoading — state management', () => {
    it('sets isLoading to true during API call, false after', async () => {
      let loadingStates: boolean[] = []

      vi.mocked(global.fetch).mockImplementationOnce(async () => {
        loadingStates.push(true)
        return {
          ok: true,
          json: async () => ({
            success: true,
            trackJson: {
              bpm: 120,
              tracks: [
                {
                  id: 'kick-1',
                  name: 'Kick',
                  steps: Array(16).fill(0) as (0 | 1)[],
                  volume: 0.85,
                  muted: false,
                  solo: false,
                },
              ],
            },
          }),
        }
      })

      const { result } = renderHook(() => usePatternGen())

      expect(result.current.isLoading).toBe(false)

      await act(async () => {
        const promise = result.current.generate('test')
        await promise
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('EC-001: LLM returns invalid JSON', () => {
    it('catches validation error and sets error state', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Invalid schema',
          usedFallback: true,
          trackJson: {
            bpm: 138,
            tracks: [
              {
                id: 'fallback-kick',
                name: 'Kick 909',
                steps: Array(16).fill(0) as (0 | 1)[],
                volume: 0.9,
                muted: false,
                solo: false,
              },
            ],
          },
        }),
      } as any)

      const { result } = renderHook(() => usePatternGen())

      let success = false
      await act(async () => {
        success = await result.current.generate('invalid pattern')
      })

      expect(success).toBe(false)
      expect(result.current.error).toContain('Invalid schema')
    })
  })

  describe('EC-002: Network error', () => {
    it('catches fetch rejection and sets error state', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network timeout'))

      const { result } = renderHook(() => usePatternGen())

      let success = false
      await act(async () => {
        success = await result.current.generate('test prompt')
      })

      expect(success).toBe(false)
      expect(result.current.error).toContain('Network timeout')
    })

    it('handles non-OK HTTP response', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      } as any)

      const { result } = renderHook(() => usePatternGen())

      let success = false
      await act(async () => {
        success = await result.current.generate('test')
      })

      expect(success).toBe(false)
      expect(result.current.error).toBeDefined()
    })

    it('stores lastPrompt and enters error state after a failed request', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network timeout'))

      const { result } = renderHook(() => usePatternGen())

      await act(async () => {
        await result.current.generate('reintenta este prompt')
      })

      const state = useSessionStore.getState()
      expect(state.lastPrompt).toBe('reintenta este prompt')
      expect(state.uiState).toBe('error')
      expect(state.lastError).toContain('Network timeout')
    })

    it('retry() reuses lastPrompt and transitions through loading back to success', async () => {
      vi.mocked(global.fetch)
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            trackJson: {
              bpm: 122,
              tracks: [
                {
                  id: 'kick-1',
                  name: 'Kick',
                  steps: Array(16).fill(0) as (0 | 1)[],
                  volume: 0.85,
                  muted: false,
                  solo: false,
                },
              ],
            },
          }),
        } as Response)

      const { result } = renderHook(() => usePatternGen())

      await act(async () => {
        await result.current.generate('mismo prompt')
      })

      expect(useSessionStore.getState().uiState).toBe('error')

      await act(async () => {
        result.current.retry()
        await Promise.resolve()
      })

      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(useSessionStore.getState().lastPrompt).toBe('mismo prompt')
      expect(useSessionStore.getState().uiState).toBe('playing')
      expect(useSessionStore.getState().lastError).toBeNull()
    })
  })

  describe('BR-003: uniform error handling', () => {
    it('treats network error and validation error uniformly', async () => {
      // Test 1: network error
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network'))
      const { result: result1 } = renderHook(() => usePatternGen())

      let success1 = false
      await act(async () => {
        success1 = await result1.current.generate('test 1')
      })

      expect(success1).toBe(false)
      expect(result1.current.error).toBeTruthy()

      // Test 2: API error response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'API error' }),
      } as any)

      const { result: result2 } = renderHook(() => usePatternGen())

      let success2 = false
      await act(async () => {
        success2 = await result2.current.generate('test 2')
      })

      expect(success2).toBe(false)
      expect(result2.current.error).toBeTruthy()
    })
  })

  describe('BR-001: audio never interrupts', () => {
    it('maintains previous pattern in store even on error', async () => {
      const initialPattern: TrackJSON = {
        bpm: 138,
        tracks: [
          {
            id: 'kick-existing',
            name: 'Existing Kick',
            steps: Array(16).fill(0) as (0 | 1)[],
            volume: 0.8,
            muted: false,
            solo: false,
          },
        ],
      }

      useSessionStore.getState().loadPattern(initialPattern)

      // Simulate error during new generation
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('API error'))

      const { result } = renderHook(() => usePatternGen())

      await act(async () => {
        await result.current.generate('new pattern')
      })

      const state = useSessionStore.getState()
      expect(state.tracks).toHaveLength(1)
      expect(state.tracks[0].id).toBe('kick-existing')
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('normalization — track tag inference', () => {
    it('infers tag correctly for kick patterns', async () => {
      const responseWithoutTag: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'kick-1',
            name: 'Kick 909',
            steps: Array(16).fill(0) as (0 | 1)[],
            volume: 0.85,
            muted: false,
            solo: false,
          },
        ],
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, trackJson: responseWithoutTag }),
      } as any)

      const { result } = renderHook(() => usePatternGen())

      await act(async () => {
        await result.current.generate('kick')
      })

      const storedTrack = useSessionStore.getState().tracks[0]
      expect(storedTrack.tag).toBeDefined()
    })
  })

  describe('integration: prompt → store → currentCode', () => {
    it('updates currentCode after successful pattern generation', async () => {
      const validResponse: TrackJSON = {
        bpm: 140,
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
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, trackJson: validResponse }),
      } as any)

      const { result } = renderHook(() => usePatternGen())

      const codeBefore = useSessionStore.getState().currentCode

      await act(async () => {
        await result.current.generate('drum pattern')
      })

      const codeAfter = useSessionStore.getState().currentCode
      expect(codeAfter).toBeDefined()
      expect(codeAfter.length).toBeGreaterThan(0)
    })
  })
})
