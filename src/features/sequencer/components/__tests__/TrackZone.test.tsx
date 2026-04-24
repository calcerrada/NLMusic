// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrackZone } from '../TrackZone'
import { useSessionStore } from '@store/sessionStore'
import type { Track } from '@lib/types'

vi.mock('@features/audio', () => ({
  useBeatClock: vi.fn(() => ({ step: 0 })),
}))

vi.mock('../TrackCard', () => ({
  TrackCard: ({ track }: { track: Track }) => <div>{track.name}</div>,
}))

describe('TrackZone — TASK-03 counter visibility', () => {
  beforeEach(() => {
    useSessionStore.setState({
      tracks: [],
      bpm: 138,
      isPlaying: false,
      activeTab: 'sequencer',
      currentCode: 'stack(...)',
      turns: [],
      isCodeManuallyEdited: false,
    })
  })

  it('shows the track counter in empty state', () => {
    render(<TrackZone />)

    expect(screen.getByText('Pistas: 0 / 5')).toBeInTheDocument()
    expect(screen.getByText('Describe tu patrón abajo para empezar')).toBeInTheDocument()
  })

  it('EC-004: shows the track counter in amber when the limit is reached', () => {
    useSessionStore.setState({
      tracks: Array.from({ length: 5 }, (_, index) => ({
        id: `track-${index + 1}`,
        name: `Track ${index + 1}`,
        steps: Array(16).fill(0) as (0 | 1)[],
        volume: 0.8,
        muted: false,
        solo: false,
      })),
    })

    render(<TrackZone />)

    const counter = screen.getByText('Pistas: 5 / 5')
    expect(counter).toBeInTheDocument()
    expect(counter).toHaveStyle({ color: 'var(--amber)' })
  })

  it('TASK-08: shows code mode banner and dims the grid when code was edited manually', () => {
    useSessionStore.setState({
      tracks: [
        {
          id: 'track-1',
          name: 'Track 1',
          tag: 'kick',
          steps: Array(16).fill(0) as (0 | 1)[],
          volume: 0.8,
          muted: false,
          solo: false,
        },
      ],
      isCodeManuallyEdited: true,
    })

    const { container } = render(<TrackZone />)

    expect(
      screen.getByText('Editado manualmente — el grid puede no reflejar el código actual')
    ).toBeInTheDocument()
    expect(container.querySelector('.transition-opacity')).toHaveStyle({ opacity: '0.5' })
  })
})
