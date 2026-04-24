// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { compileToStrudel } from '@features/audio/compiler'
import { useSessionStore } from '@store/sessionStore'
import type { UseStrudelResult } from '@features/audio'
import { StrudelCodePanel } from '../StrudelCodePanel'

async function flushDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(600)
  })
}

function makeTrack(overrides = {}) {
  return {
    id: 'kick-1',
    name: 'Kick',
    tag: 'kick',
    steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] as (0 | 1)[],
    volume: 0.8,
    muted: false,
    solo: false,
    ...overrides,
  }
}

function makeStrudel(playImpl?: UseStrudelResult['play']): UseStrudelResult {
  return {
    play: playImpl ?? vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    isReady: true,
    initError: null,
  }
}

describe('StrudelCodePanel TASK-08 editable sync', () => {
  beforeEach(() => {
    vi.useFakeTimers()

    useSessionStore.setState({
      tracks: [makeTrack()],
      bpm: 138,
      isPlaying: false,
      activeTab: 'code',
      currentCode: compileToStrudel({ bpm: 138, tracks: [makeTrack()] }),
      turns: [],
      uiState: 'paused',
      lastError: null,
      lastPrompt: null,
      isCodeManuallyEdited: false,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('validates paused edits without autoplay and resyncs parseable code to the grid', async () => {
    const nextCode = compileToStrudel({
      bpm: 144,
      tracks: [makeTrack({ steps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0] })],
    })
    const strudel = makeStrudel()

    render(<StrudelCodePanel strudel={strudel} />)

    fireEvent.change(screen.getByLabelText('Código Strudel editable'), {
      target: { value: nextCode },
    })

    await flushDebounce()

    expect(strudel.play).toHaveBeenCalledWith(nextCode, false)

    const state = useSessionStore.getState()
    expect(state.currentCode).toBe(nextCode)
    expect(state.bpm).toBe(144)
    expect(state.isCodeManuallyEdited).toBe(false)
    expect(state.tracks[0].steps).toEqual([1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0])
    expect(state.uiState).toBe('paused')
  })

  it('debounces edits for 600ms and evaluates only the last code change', async () => {
    const firstCode = 'note("c")'
    const lastCode = 'note("d")'
    const strudel = makeStrudel()

    render(<StrudelCodePanel strudel={strudel} />)

    const textarea = screen.getByLabelText('Código Strudel editable')

    fireEvent.change(textarea, { target: { value: firstCode } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    expect(strudel.play).not.toHaveBeenCalled()

    fireEvent.change(textarea, { target: { value: lastCode } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(599)
    })

    expect(strudel.play).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })

    expect(strudel.play).toHaveBeenCalledTimes(1)
    expect(strudel.play).toHaveBeenCalledWith(lastCode, false)
    expect(useSessionStore.getState().currentCode).toBe(lastCode)
  })

  it('falls back to code mode when valid Strudel cannot map back to the grid', async () => {
    const customCode = 'note("c a f e")'
    const strudel = makeStrudel()

    render(<StrudelCodePanel strudel={strudel} />)

    fireEvent.change(screen.getByLabelText('Código Strudel editable'), {
      target: { value: customCode },
    })

    await flushDebounce()

    expect(strudel.play).toHaveBeenCalledWith(customCode, false)

    const state = useSessionStore.getState()
    expect(state.currentCode).toBe(customCode)
    expect(state.isCodeManuallyEdited).toBe(true)
    expect(state.uiState).toBe('paused')
  })

  it('shows inline error and preserves store code when validation fails', async () => {
    const initialCode = useSessionStore.getState().currentCode
    const strudel = makeStrudel(vi.fn().mockRejectedValue(new Error('parse error')))

    render(<StrudelCodePanel strudel={strudel} />)

    fireEvent.change(screen.getByLabelText('Código Strudel editable'), {
      target: { value: 'broken(' },
    })

    await flushDebounce()

    expect(screen.getByRole('alert')).toHaveTextContent('parse error')

    expect(useSessionStore.getState().currentCode).toBe(initialCode)
  })

  it('syncs editor content from the store when code changes externally', async () => {
    const nextCode = compileToStrudel({
      bpm: 150,
      tracks: [makeTrack({ steps: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1] })],
    })
    const strudel = makeStrudel()

    render(<StrudelCodePanel strudel={strudel} />)

    const textarea = screen.getByLabelText('Código Strudel editable') as HTMLTextAreaElement
    expect(textarea.value).toBe(useSessionStore.getState().currentCode)

    act(() => {
      useSessionStore.getState().toggleStep('kick-1', 0)
    })

    expect(textarea.value).toBe(useSessionStore.getState().currentCode)
    expect(textarea.value).not.toBe(nextCode)

    act(() => {
      useSessionStore.getState().syncCodePattern(
        {
          bpm: 150,
          tracks: [makeTrack({ steps: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1] })],
        },
        nextCode,
      )
    })

    expect(textarea.value).toBe(nextCode)
  })

  it('clears the inline error after the code becomes valid again', async () => {
    const strudel = makeStrudel()
      
    vi.mocked(strudel.play)
      .mockRejectedValueOnce(new Error('parse error'))
      .mockResolvedValueOnce(undefined)

    render(<StrudelCodePanel strudel={strudel} />)

    const textarea = screen.getByLabelText('Código Strudel editable')

    fireEvent.change(textarea, {
      target: { value: 'broken(' },
    })

    await flushDebounce()

    expect(screen.getByRole('alert')).toHaveTextContent('parse error')

    fireEvent.change(textarea, {
      target: { value: 'note("c")' },
    })

    await flushDebounce()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(useSessionStore.getState().currentCode).toBe('note("c")')
  })
})
