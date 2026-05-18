import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '@store/sessionStore'
import type { Track } from '@lib/types'

vi.mock('@features/audio', () => ({
  compileToStrudel: vi.fn(() => 'stack(...).slow(4).cpm(138.00)'),
}))

const makeTrack = (id: string): Track => ({
  id,
  name: id,
  steps: Array(16).fill(0) as (0 | 1)[],
  volume: 0.8,
  muted: false,
  solo: false,
})

describe('TASK-15 - sessionStore slices regression', () => {
  beforeEach(() => {
    localStorage.clear()
    useSessionStore.setState({
      tracks: [],
      bpm: 138,
      isPlaying: false,
      currentCode: 'stack(...).slow(4).cpm(138.00)',
      isCodeManuallyEdited: false,
      activeTab: 'sequencer',
      uiState: 'idle',
      lastError: null,
      lastPrompt: null,
      promptDraft: null,
      turns: [],
      language: 'es',
      editorMode: 'advanced',
      highlightingEnabled: true,
      hapVisualizationEnabled: true,
    })
  })

  it('keeps a unified public API from @store/sessionStore after splitting into slices', () => {
    const state = useSessionStore.getState()

    expect(typeof state.setTracks).toBe('function')
    expect(typeof state.setPlaying).toBe('function')
    expect(typeof state.startLoading).toBe('function')
    expect(typeof state.addTurn).toBe('function')
    expect(typeof state.setEditorMode).toBe('function')
  })

  it('cross-slice action: deleting the last track in PLAYING transitions to IDLE', () => {
    useSessionStore.setState({
      tracks: [makeTrack('kick-1')],
      isPlaying: true,
      uiState: 'playing',
    })

    useSessionStore.getState().deleteTrack('kick-1')

    const state = useSessionStore.getState()
    expect(state.tracks).toHaveLength(0)
    expect(state.isPlaying).toBe(false)
    expect(state.uiState).toBe('idle')
  })

  it('cross-slice action: setTracks([]) recalculates transport and uiState consistently', () => {
    useSessionStore.setState({
      tracks: [makeTrack('kick-1')],
      isPlaying: true,
      uiState: 'playing',
      isCodeManuallyEdited: true,
    })

    useSessionStore.getState().setTracks([])

    const state = useSessionStore.getState()
    expect(state.tracks).toEqual([])
    expect(state.isPlaying).toBe(false)
    expect(state.uiState).toBe('idle')
    expect(state.isCodeManuallyEdited).toBe(false)
  })

  it('persists only the expected fields in localStorage', () => {
    useSessionStore.getState().setBpm(140)
    useSessionStore.getState().setTracks([makeTrack('kick-1'), makeTrack('snare-1'), makeTrack('hh-1')])
    useSessionStore.getState().addTurn('user', 'add hats')
    useSessionStore.getState().setEditorMode('simple')
    useSessionStore.getState().setHighlightingEnabled(false)
    useSessionStore.getState().setHapVisualizationEnabled(false)
    useSessionStore.getState().setLanguage('en')
    useSessionStore.getState().setError('transient error')

    const raw = localStorage.getItem('nlmusic-session')
    expect(raw).not.toBeNull()

    const persisted = JSON.parse(raw as string).state

    expect(Object.keys(persisted).sort()).toEqual([
      'bpm',
      'editorMode',
      'hapVisualizationEnabled',
      'highlightingEnabled',
      'language',
      'tracks',
      'turns',
    ])

    expect(persisted.bpm).toBe(140)
    expect(persisted.tracks).toHaveLength(3)
    expect(persisted.language).toBe('en')
    expect(persisted.uiState).toBeUndefined()
    expect(persisted.lastError).toBeUndefined()
    expect(persisted.isPlaying).toBeUndefined()
  })

  it('restores persisted state after rehydrate (reload simulation)', async () => {
    useSessionStore.getState().setBpm(140)
    useSessionStore.getState().setTracks([makeTrack('kick-1'), makeTrack('snare-1'), makeTrack('hh-1')])
    useSessionStore.getState().setLanguage('en')

    const snapshot = localStorage.getItem('nlmusic-session')
    expect(snapshot).not.toBeNull()

    useSessionStore.setState({
      bpm: 60,
      tracks: [],
      language: 'es',
      isPlaying: false,
      uiState: 'idle',
    })

    localStorage.setItem('nlmusic-session', snapshot as string)
    await (useSessionStore as unknown as { persist: { rehydrate: () => Promise<void> } }).persist.rehydrate()

    const state = useSessionStore.getState()
    expect(state.bpm).toBe(140)
    expect(state.tracks).toHaveLength(3)
    expect(state.language).toBe('en')
  })
})
