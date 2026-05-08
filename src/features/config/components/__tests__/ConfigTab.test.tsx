// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { UseStrudelResult } from '@features/audio'
import { ConfigTab } from '../ConfigTab'
import { PromptBox } from '@features/prompt'
import { useSessionStore } from '@store/sessionStore'

vi.mock('@features/prompt/hooks/usePatternGen', () => ({
  usePatternGen: () => ({
    generate: vi.fn().mockResolvedValue(true),
    retry: vi.fn(),
    isLoading: false,
    error: null,
    info: null,
  }),
}))

function makeTrack(id: string) {
  return {
    id,
    name: id,
    tag: 'kick',
    steps: Array(16).fill(0) as (0 | 1)[],
    volume: 0.8,
    muted: false,
    solo: false,
  }
}

function makeStrudel(overrides: Partial<UseStrudelResult> = {}): UseStrudelResult {
  return {
    play: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    isReady: true,
    initError: null,
    getHapState: () => ({ pattern: null, miniLocations: [], getTime: () => 0 }),
    ...overrides,
  }
}

describe('ConfigTab TASK-12', () => {
  beforeEach(() => {
    useSessionStore.setState({
      activeTab: 'config',
      promptDraft: null,
      bpm: 138,
      tracks: [makeTrack('kick-1'), makeTrack('snare-1'), makeTrack('hh-1')],
      editorMode: 'advanced',
      highlightingEnabled: true,
      hapVisualizationEnabled: true,
      uiState: 'paused',
      isPlaying: false,
      language: 'es',
    })
  })

  it('renders system status from store and Strudel readiness', () => {
    render(<ConfigTab strudel={makeStrudel({ isReady: false })} />)

    expect(screen.getByText('Estado del sistema')).toBeInTheDocument()
    expect(screen.getByText('○ No iniciado')).toBeInTheDocument()
    expect(screen.getByText('138')).toBeInTheDocument()
    expect(screen.getByText('3 / 5')).toBeInTheDocument()
  })

  it('injects clicked prompt example into PromptBox and returns to Sequencer tab', async () => {
    const strudel = makeStrudel()

    render(
      <>
        <ConfigTab strudel={strudel} />
        <PromptBox motorAvailable />
      </>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Un kick 909 en 4x4 techno a 138 BPM/i }))

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveValue('Un kick 909 en 4x4 techno a 138 BPM')
    })

    const state = useSessionStore.getState()
    expect(state.activeTab).toBe('sequencer')
    expect(state.promptDraft).toBeNull()
  })

  it('persists editor preferences and hides hap toggle in simple mode', () => {
    render(<ConfigTab strudel={makeStrudel()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Simple (textarea)' }))
    expect(useSessionStore.getState().editorMode).toBe('simple')
    expect(screen.queryByText('Visualización haps')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Avanzado (CodeMirror)' }))
    expect(useSessionStore.getState().editorMode).toBe('advanced')
    expect(screen.getByText('Visualización haps')).toBeInTheDocument()

    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[0])
    fireEvent.click(switches[1])

    const state = useSessionStore.getState()
    expect(state.highlightingEnabled).toBe(false)
    expect(state.hapVisualizationEnabled).toBe(false)
  })

  it('renders reserved API key space for v1+', () => {
    render(<ConfigTab strudel={makeStrudel()} />)

    expect(screen.getByText('Configuración de API key — disponible en v1+')).toBeInTheDocument()
  })
})
