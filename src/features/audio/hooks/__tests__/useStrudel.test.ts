// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Mutable stub references — wrappers so each test can rebind behaviour
const stubbedInitStrudel = vi.fn()
const stubbedHush = vi.fn()
const stubbedEvaluate = vi.fn().mockResolvedValue(undefined)

// useStrudel uses module-level _hush/_evaluate singletons.
// We must reset modules between tests that need a clean slate,
// then re-import the hook so those variables start as null again.
// vi.doMock (not vi.mock) is used here because it is NOT hoisted — it only
// takes effect for imports that happen AFTER the call, which is what we need
// after vi.resetModules().
async function freshUseStrudel() {
  vi.resetModules()
  vi.doMock('@strudel/web', () => ({
    initStrudel: (...args: unknown[]) => stubbedInitStrudel(...args),
    hush: (...args: unknown[]) => stubbedHush(...args),
    evaluate: (...args: unknown[]) => stubbedEvaluate(...args),
  }))
  const mod = await import('../useStrudel')
  return mod.useStrudel
}

describe('useStrudel — EC-010: Strudel initialization robustness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stubbedInitStrudel.mockImplementation(() => undefined)
    stubbedEvaluate.mockResolvedValue(undefined)
  })

  describe('initial state', () => {
    it('starts with isReady=false and initError=null synchronously', async () => {
      const useStrudel = await freshUseStrudel()
      const { result } = renderHook(() => useStrudel())

      expect(result.current.isReady).toBe(false)
      expect(result.current.initError).toBeNull()
    })

    it('exposes play, stop, isReady and initError on the returned object', async () => {
      const useStrudel = await freshUseStrudel()
      const { result } = renderHook(() => useStrudel())

      expect(typeof result.current.play).toBe('function')
      expect(typeof result.current.stop).toBe('function')
      expect(typeof result.current.isReady).toBe('boolean')
      expect(
        result.current.initError === null || typeof result.current.initError === 'string'
      ).toBe(true)
    })
  })

  describe('EC-010: initStrudel throws — initError is populated', () => {
    it('sets initError when initStrudel throws during init', async () => {
      stubbedInitStrudel.mockImplementation(() => {
        throw new Error('AudioContext not available')
      })

      const useStrudel = await freshUseStrudel()
      const { result } = renderHook(() => useStrudel())

      await waitFor(() => {
        expect(result.current.initError).not.toBeNull()
      })

      expect(result.current.initError).toContain('AudioContext not available')
      expect(result.current.isReady).toBe(false)
    })

    it('play() throws "Motor de audio no disponible" when initError is present', async () => {
      stubbedInitStrudel.mockImplementation(() => {
        throw new Error('AudioContext not available')
      })

      const useStrudel = await freshUseStrudel()
      const { result } = renderHook(() => useStrudel())

      await waitFor(() => {
        expect(result.current.initError).not.toBeNull()
      })

      await expect(result.current.play('s("bd")')).rejects.toThrow(
        'Motor de audio no disponible'
      )
    })
  })

  describe('EC-010: play() guards before init completes', () => {
    it('play() throws "Strudel no inicializado todavía" before init resolves', async () => {
      const useStrudel = await freshUseStrudel()
      const { result } = renderHook(() => useStrudel())

      // _evaluate is null immediately — init hasn't resolved yet
      await expect(result.current.play('s("bd")')).rejects.toThrow(
        'Strudel no inicializado todavía'
      )

      // Drain the async init so React state updates settle inside act()
      await waitFor(() => expect(result.current.isReady).toBe(true))
    })

    it('stop() does not throw when called before hush is available', async () => {
      const useStrudel = await freshUseStrudel()
      const { result } = renderHook(() => useStrudel())

      expect(() => result.current.stop()).not.toThrow()
    })
  })
})
