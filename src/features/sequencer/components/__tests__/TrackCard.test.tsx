// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TrackCard } from '../TrackCard'
import { useSessionStore } from '@store/sessionStore'
import type { Track } from '@lib/types'

vi.mock('@features/audio', () => ({
  useBeatClock: vi.fn(() => ({ step: 0 })),
  compileToStrudel: vi.fn(() => 'stack(...).slow(4).cpm(138.00)'),
}))

describe('TrackCard — TASK-07: Eliminar pista desde UI (CAP-NLM-003)', () => {
  const mockTrack: Track = {
    id: 'kick-1',
    name: 'Kick',
    tag: 'kick',
    steps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    volume: 0.8,
    muted: false,
    solo: false,
  }

  beforeEach(() => {
    useSessionStore.setState({
      tracks: [mockTrack],
      bpm: 138,
      isPlaying: false,
      activeTab: 'sequencer',
      currentCode: 'stack(...).slow(4).cpm(138.00)',
      turns: [],
    })
  })

  describe('Delete button rendering', () => {
    it('renders the delete button (✕)', () => {
      render(<TrackCard track={mockTrack} activeStep={0} />)

      const deleteButton = screen.getByRole('button', { name: /Eliminar pista Kick/i })
      expect(deleteButton).toBeInTheDocument()
      expect(deleteButton).toHaveTextContent('✕')
    })

    it('has aria-label for accessibility', () => {
      render(<TrackCard track={mockTrack} activeStep={0} />)

      const deleteButton = screen.getByRole('button', { name: /Eliminar pista Kick/i })
      expect(deleteButton).toHaveAttribute('aria-label', 'Eliminar pista Kick')
    })

    it('has correct styling classes for delete button', () => {
      render(<TrackCard track={mockTrack} activeStep={0} />)

      const deleteButton = screen.getByRole('button', { name: /Eliminar pista Kick/i })
      expect(deleteButton).toHaveClass('h-7', 'w-7', 'rounded-[4px]')
    })

    it('BR-007: delete button has visual feedback on hover', () => {
      render(<TrackCard track={mockTrack} activeStep={0} />)

      const deleteButton = screen.getByRole('button', { name: /Eliminar pista Kick/i })
      // The button should have hover:text-[var(--red)] class
      expect(deleteButton.className).toContain('hover:text-[var(--red)]')
    })
  })

  describe('Delete button interaction', () => {
    it('BR-007: clicking delete button calls deleteTrack with correct track id', () => {
      const spy = vi.spyOn(useSessionStore.getState(), 'deleteTrack')
      render(<TrackCard track={mockTrack} activeStep={0} />)

      const deleteButton = screen.getByRole('button', { name: /Eliminar pista Kick/i })
      fireEvent.click(deleteButton)

      expect(spy).toHaveBeenCalledWith('kick-1')
      spy.mockRestore()
    })

    it('BR-007: delete action is destructive and irreversible (no confirmation dialog)', () => {
      render(<TrackCard track={mockTrack} activeStep={0} />)

      const deleteButton = screen.getByRole('button', { name: /Eliminar pista Kick/i })
      fireEvent.click(deleteButton)

      // No dialog or confirmation should appear
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.queryByText(/confirm|Confirmar/i)).not.toBeInTheDocument()
    })

    it('EC-007: deleting last track in PLAYING state transitions to IDLE and stops audio', () => {
      useSessionStore.setState({
        tracks: [mockTrack],
        isPlaying: true,
        uiState: 'playing',
      })

      render(<TrackCard track={mockTrack} activeStep={0} />)
      const deleteButton = screen.getByRole('button', { name: /Eliminar pista Kick/i })
      fireEvent.click(deleteButton)

      const state = useSessionStore.getState()
      expect(state.tracks).toHaveLength(0)
      expect(state.isPlaying).toBe(false)
      expect(state.uiState).toBe('idle')
    })

    it('EC-008: deleting last track in PAUSED state transitions to IDLE', () => {
      useSessionStore.setState({
        tracks: [mockTrack],
        isPlaying: false,
        uiState: 'paused',
      })

      render(<TrackCard track={mockTrack} activeStep={0} />)
      const deleteButton = screen.getByRole('button', { name: /Eliminar pista Kick/i })
      fireEvent.click(deleteButton)

      const state = useSessionStore.getState()
      expect(state.tracks).toHaveLength(0)
      expect(state.isPlaying).toBe(false)
      expect(state.uiState).toBe('idle')
    })

    it('BR-001: deleting a track with remaining tracks maintains PLAYING state', () => {
      const snareTrack: Track = {
        id: 'snare-1',
        name: 'Snare',
        tag: 'snare',
        steps: Array(16).fill(0) as (0 | 1)[],
        volume: 0.75,
        muted: false,
        solo: false,
      }

      useSessionStore.setState({
        tracks: [mockTrack, snareTrack],
        isPlaying: true,
        uiState: 'playing',
      })

      render(<TrackCard track={mockTrack} activeStep={0} />)
      const deleteButton = screen.getByRole('button', { name: /Eliminar pista Kick/i })
      fireEvent.click(deleteButton)

      const state = useSessionStore.getState()
      expect(state.tracks).toHaveLength(1)
      expect(state.tracks[0].id).toBe('snare-1')
      expect(state.isPlaying).toBe(true)
      expect(state.uiState).toBe('playing')
    })

    it('BR-007: deleteTrack eliminates only the specified track by id', () => {
      const snareTrack: Track = {
        id: 'snare-1',
        name: 'Snare',
        tag: 'snare',
        steps: Array(16).fill(0) as (0 | 1)[],
        volume: 0.75,
        muted: false,
        solo: false,
      }
      const hhTrack: Track = {
        id: 'hh-1',
        name: 'Hi-Hat',
        tag: 'hihat',
        steps: Array(16).fill(0) as (0 | 1)[],
        volume: 0.6,
        muted: false,
        solo: false,
      }

      useSessionStore.setState({
        tracks: [mockTrack, snareTrack, hhTrack],
        isPlaying: false,
        uiState: 'paused',
      })

      render(<TrackCard track={snareTrack} activeStep={0} />)
      const deleteButton = screen.getByRole('button', { name: /Eliminar pista Snare/i })
      fireEvent.click(deleteButton)

      const ids = useSessionStore.getState().tracks.map((t) => t.id)
      expect(ids).toEqual(['kick-1', 'hh-1'])
    })
  })

  describe('Delete button with different track states', () => {
    it('renders delete button on muted track', () => {
      const mutedTrack = { ...mockTrack, muted: true }
      render(<TrackCard track={mutedTrack} activeStep={0} />)

      const deleteButton = screen.getByRole('button', { name: /Eliminar pista Kick/i })
      expect(deleteButton).toBeInTheDocument()
    })

    it('renders delete button on soloed track', () => {
      const soloedTrack = { ...mockTrack, solo: true }
      render(<TrackCard track={soloedTrack} activeStep={0} />)

      const deleteButton = screen.getByRole('button', { name: /Eliminar pista Kick/i })
      expect(deleteButton).toBeInTheDocument()
    })

    it('renders delete button regardless of track volume', () => {
      [0, 0.5, 1.0].forEach((volume) => {
        const trackWithVolume = { ...mockTrack, volume }
        const { unmount } = render(<TrackCard track={trackWithVolume} activeStep={0} />)

        const deleteButton = screen.getByRole('button', { name: /Eliminar pista Kick/i })
        expect(deleteButton).toBeInTheDocument()

        unmount()
      })
    })
  })

  describe('Track identification in delete', () => {
    it('correctly identifies track to delete when multiple tracks are present', () => {
      const track1: Track = {
        id: 'track-1',
        name: 'Track 1',
        tag: 'kick',
        steps: Array(16).fill(0) as (0 | 1)[],
        volume: 0.8,
        muted: false,
        solo: false,
      }
      const track2: Track = {
        id: 'track-2',
        name: 'Track 2',
        tag: 'snare',
        steps: Array(16).fill(0) as (0 | 1)[],
        volume: 0.75,
        muted: false,
        solo: false,
      }

      useSessionStore.setState({
        tracks: [track1, track2],
        isPlaying: true,
      })

      const { unmount } = render(<TrackCard track={track1} activeStep={0} />)
      const deleteButton1 = screen.getByRole('button', { name: /Eliminar pista Track 1/i })
      fireEvent.click(deleteButton1)

      let state = useSessionStore.getState()
      expect(state.tracks[0].id).toBe('track-2')

      unmount()

      // Re-render with track2
      useSessionStore.setState({
        tracks: [track2],
        isPlaying: true,
      })

      render(<TrackCard track={track2} activeStep={0} />)
      const deleteButton2 = screen.getByRole('button', { name: /Eliminar pista Track 2/i })
      fireEvent.click(deleteButton2)

      state = useSessionStore.getState()
      expect(state.tracks).toHaveLength(0)
    })
  })
})
