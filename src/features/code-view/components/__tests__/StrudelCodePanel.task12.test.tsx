// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { UseStrudelResult } from '@features/audio'
import { StrudelContext } from '@features/audio'
import { StrudelCodePanel } from '../StrudelCodePanel'
import { useSessionStore } from '@store/sessionStore'

vi.mock('next/dynamic', () => ({
  default: () => {
    function MockAdvancedEditor() {
      return <div data-testid="advanced-editor">CodeMirror editor</div>
    }

    return MockAdvancedEditor
  },
}))

vi.mock('@features/audio', async () => {
  const actual = await vi.importActual<typeof import('@features/audio')>('@features/audio')
  return {
    ...actual,
    useBeatClock: () => ({ step: 0 }),
    useHapEvents: () => undefined,
    parseStrudelToTrackJson: () => null,
  }
})

function makeTrack() {
  return {
    id: 'kick-1',
    name: 'Kick',
    tag: 'kick',
    steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] as (0 | 1)[],
    volume: 0.8,
    muted: false,
    solo: false,
  }
}

function makeStrudel(): UseStrudelResult {
  return {
    play: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    isReady: true,
    initError: null,
    getHapState: () => ({ pattern: null, miniLocations: [], getTime: () => 0 }),
  }
}

function renderWithStrudel(ui: React.ReactElement, strudel: UseStrudelResult) {
  return render(
    <StrudelContext.Provider value={strudel}>
      {ui}
    </StrudelContext.Provider>
  )
}

describe('StrudelCodePanel TASK-12 editor mode toggle', () => {
  beforeEach(() => {
    useSessionStore.setState({
      tracks: [makeTrack()],
      bpm: 138,
      isPlaying: false,
      currentCode: 'note("c")',
      uiState: 'paused',
      editorMode: 'advanced',
      highlightingEnabled: true,
      hapVisualizationEnabled: true,
      isCodeManuallyEdited: false,
      language: 'es',
    })
  })

  it('renders advanced editor when editorMode is advanced', () => {
    renderWithStrudel(<StrudelCodePanel />, makeStrudel())

    expect(screen.getByTestId('advanced-editor')).toBeInTheDocument()
  })

  it('renders simple textarea and not CodeMirror when editorMode is simple', () => {
    useSessionStore.setState({ editorMode: 'simple' })

    renderWithStrudel(<StrudelCodePanel />, makeStrudel())

    expect(screen.queryByTestId('advanced-editor')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Código Strudel editable' })).toBeInTheDocument()
  })
})
