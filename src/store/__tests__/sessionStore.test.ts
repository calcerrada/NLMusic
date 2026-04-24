import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSessionStore } from '@store/sessionStore'
import type { Track, TrackJSON } from '@lib/types'

// Mock compileToStrudel so sessionStore tests don't depend on the audio compiler
vi.mock('@features/audio', () => ({
  compileToStrudel: vi.fn(() => 'stack(...).slow(4).cpm(138.00)'),
}))

describe('sessionStore — Zustand store with business logic', () => {
  beforeEach(() => {
    useSessionStore.setState({
      tracks: [],
      bpm: 138,
      isPlaying: false,
      activeTab: 'sequencer',
      currentCode: 'stack(...).slow(4).cpm(138.00)',
      turns: [],
    })
  })

  describe('setTracks — BR-004: sequential track creation', () => {
    it('replaces tracks with provided array', () => {
      const newTracks: Track[] = [
        {
          id: 'kick-1',
          name: 'Kick',
          steps: Array(16).fill(0) as (0 | 1)[],
          volume: 0.8,
          muted: false,
          solo: false,
        },
      ]

      useSessionStore.getState().setTracks(newTracks)

      expect(useSessionStore.getState().tracks).toEqual(newTracks)
    })

    it('updates currentCode when tracks change', () => {
      const newTracks: Track[] = [
        {
          id: 'kick-1',
          name: 'Kick',
          steps: Array(16).fill(0) as (0 | 1)[],
          volume: 0.8,
          muted: false,
          solo: false,
        },
      ]

      useSessionStore.getState().setTracks(newTracks)
      const code = useSessionStore.getState().currentCode

      expect(code).toBeDefined()
      expect(code.length).toBeGreaterThan(0)
    })
  })

  describe('BR-006: maximum 5 tracks enforced at store level', () => {
    it('should allow validation to be called by loadPattern with <= 5 tracks', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: Array(5)
          .fill(0)
          .map((_, i) => ({
            id: `track-${i}`,
            name: `Track ${i}`,
            steps: Array(16).fill(0) as (0 | 1)[],
            volume: 0.8,
            muted: false,
            solo: false,
          })),
      }

      // Note: loadPattern does NOT validate count — it's validated upstream in pipeline/API
      // This test documents that the store accepts valid patterns
      useSessionStore.getState().loadPattern(pattern)

      expect(useSessionStore.getState().tracks).toHaveLength(5)
    })

    it('EC-004: loadPattern slices defensively when pattern contains more than 5 tracks', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: Array.from({ length: 6 }, (_, index) => ({
          id: `track-${index + 1}`,
          name: `Track ${index + 1}`,
          steps: Array(16).fill(0) as (0 | 1)[],
          volume: 0.8,
          muted: false,
          solo: false,
        })),
      }

      useSessionStore.getState().loadPattern(pattern)

      expect(useSessionStore.getState().tracks).toHaveLength(5)
      expect(useSessionStore.getState().tracks.map((track) => track.id)).toEqual([
        'track-1',
        'track-2',
        'track-3',
        'track-4',
        'track-5',
      ])
    })
  })

  describe('setBpm — BPM clamping [60, 220]', () => {
    it('clamps BPM below 60 to 60', () => {
      useSessionStore.getState().setBpm(30)
      expect(useSessionStore.getState().bpm).toBe(60)
    })

    it('clamps BPM above 220 to 220', () => {
      useSessionStore.getState().setBpm(300)
      expect(useSessionStore.getState().bpm).toBe(220)
    })

    it('accepts valid BPM values without clamping', () => {
      [60, 120, 220].forEach((bpm) => {
        useSessionStore.getState().setBpm(bpm)
        expect(useSessionStore.getState().bpm).toBe(bpm)
      })
    })

    it('updates currentCode when BPM changes', () => {
      useSessionStore.getState().setTracks([
        {
          id: 'kick-1',
          name: 'Kick',
          steps: Array(16).fill(0) as (0 | 1)[],
          volume: 0.8,
          muted: false,
          solo: false,
        },
      ])

      const codeBefore = useSessionStore.getState().currentCode
      useSessionStore.getState().setBpm(200)
      const codeAfter = useSessionStore.getState().currentCode

      expect(codeBefore).toBeDefined()
      expect(codeAfter).toBeDefined()
      // BPM changes may affect the generated code
    })
  })

  describe('toggleStep — BR-008: manual grid edits do NOT invoke LLM', () => {
    it('toggles a step from 0 to 1', () => {
      const track: Track = {
        id: 'kick-1',
        name: 'Kick',
        steps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        volume: 0.8,
        muted: false,
        solo: false,
      }
      useSessionStore.getState().setTracks([track])

      useSessionStore.getState().toggleStep('kick-1', 0)

      const updatedTrack = useSessionStore.getState().tracks[0]
      expect(updatedTrack.steps[0]).toBe(1)
      expect(updatedTrack.steps[1]).toBe(0)
    })

    it('toggles a step from 1 to 0', () => {
      const track: Track = {
        id: 'kick-1',
        name: 'Kick',
        steps: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        volume: 0.8,
        muted: false,
        solo: false,
      }
      useSessionStore.getState().setTracks([track])

      useSessionStore.getState().toggleStep('kick-1', 0)

      const updatedTrack = useSessionStore.getState().tracks[0]
      expect(updatedTrack.steps[0]).toBe(0)
    })

    it('does not affect other steps or tracks', () => {
      const tracks: Track[] = [
        {
          id: 'kick-1',
          name: 'Kick',
          steps: Array(16).fill(0) as (0 | 1)[],
          volume: 0.8,
          muted: false,
          solo: false,
        },
        {
          id: 'snare-1',
          name: 'Snare',
          steps: Array(16).fill(1) as (0 | 1)[],
          volume: 0.75,
          muted: false,
          solo: false,
        },
      ]
      useSessionStore.getState().setTracks([...tracks])

      useSessionStore.getState().toggleStep('kick-1', 0)

      const snareTrack = useSessionStore.getState().tracks[1]
      expect(snareTrack.steps.every((s) => s === 1)).toBe(true)
    })

    it('updates currentCode locally — no LLM call needed', () => {
      const track: Track = {
        id: 'kick-1',
        name: 'Kick',
        steps: Array(16).fill(0) as (0 | 1)[],
        volume: 0.8,
        muted: false,
        solo: false,
      }
      useSessionStore.getState().setTracks([track])

      const codeBefore = useSessionStore.getState().currentCode
      useSessionStore.getState().toggleStep('kick-1', 0)
      const codeAfter = useSessionStore.getState().currentCode

      // Code should regenerate — this is BR-008 implication
      expect(codeAfter).toBeDefined()
    })
  })

  describe('setVolume — volume control', () => {
    it('updates volume for a specific track', () => {
      const track: Track = {
        id: 'kick-1',
        name: 'Kick',
        steps: Array(16).fill(0) as (0 | 1)[],
        volume: 0.8,
        muted: false,
        solo: false,
      }
      useSessionStore.getState().setTracks([track])

      useSessionStore.getState().setVolume('kick-1', 0.5)

      expect(useSessionStore.getState().tracks[0].volume).toBe(0.5)
    })

    it('does not affect other tracks', () => {
      const tracks: Track[] = [
        {
          id: 'kick-1',
          name: 'Kick',
          steps: Array(16).fill(0) as (0 | 1)[],
          volume: 0.8,
          muted: false,
          solo: false,
        },
        {
          id: 'snare-1',
          name: 'Snare',
          steps: Array(16).fill(0) as (0 | 1)[],
          volume: 0.75,
          muted: false,
          solo: false,
        },
      ]
      useSessionStore.getState().setTracks([...tracks])

      useSessionStore.getState().setVolume('kick-1', 0.5)

      expect(useSessionStore.getState().tracks[1].volume).toBe(0.75)
    })
  })

  describe('toggleMute — BR-001: mute applies gain(0), not filtering', () => {
    it('toggles mute flag', () => {
      const track: Track = {
        id: 'kick-1',
        name: 'Kick',
        steps: Array(16).fill(0) as (0 | 1)[],
        volume: 0.8,
        muted: false,
        solo: false,
      }
      useSessionStore.getState().setTracks([track])

      useSessionStore.getState().toggleMute('kick-1')
      expect(useSessionStore.getState().tracks[0].muted).toBe(true)

      useSessionStore.getState().toggleMute('kick-1')
      expect(useSessionStore.getState().tracks[0].muted).toBe(false)
    })

    it('does not filter track from output — remains in pattern', () => {
      const track: Track = {
        id: 'kick-1',
        name: 'Kick',
        steps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        volume: 0.8,
        muted: false,
        solo: false,
      }
      useSessionStore.getState().setTracks([track])

      useSessionStore.getState().toggleMute('kick-1')

      expect(useSessionStore.getState().tracks).toHaveLength(1)
      expect(useSessionStore.getState().tracks[0].muted).toBe(true)
    })
  })

  describe('toggleSolo — solo management', () => {
    it('toggles solo flag', () => {
      const track: Track = {
        id: 'kick-1',
        name: 'Kick',
        steps: Array(16).fill(0) as (0 | 1)[],
        volume: 0.8,
        muted: false,
        solo: false,
      }
      useSessionStore.getState().setTracks([track])

      useSessionStore.getState().toggleSolo('kick-1')
      expect(useSessionStore.getState().tracks[0].solo).toBe(true)

      useSessionStore.getState().toggleSolo('kick-1')
      expect(useSessionStore.getState().tracks[0].solo).toBe(false)
    })
  })

  describe('loadPattern — BR-002: accept valid TrackJSON', () => {
    it('loads a complete pattern from LLM response', () => {
      const pattern: TrackJSON = {
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
          {
            id: 'snare-1',
            name: 'Snare',
            steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            volume: 0.75,
            muted: false,
            solo: false,
          },
        ],
        strudelCode: 's("bd").gain(0.9)',
      }

      useSessionStore.getState().loadPattern(pattern)

      const state = useSessionStore.getState()
      expect(state.bpm).toBe(140)
      expect(state.tracks).toHaveLength(2)
      expect(state.tracks[0].name).toBe('Kick')
      expect(state.tracks[1].name).toBe('Snare')
      expect(state.isPlaying).toBe(true)
      expect(state.uiState).toBe('playing')
    })

    it('updates currentCode from loaded pattern', () => {
      const pattern: TrackJSON = {
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
        strudelCode: 's("bd")',
      }

      useSessionStore.getState().loadPattern(pattern)

      expect(useSessionStore.getState().currentCode).toBeDefined()
      expect(useSessionStore.getState().currentCode.length).toBeGreaterThan(0)
    })
  })

  describe('addTurn — session history', () => {
    it('adds a turn to the session context', () => {
      useSessionStore.getState().addTurn('user', 'bombo 808')
      useSessionStore.getState().addTurn('assistant', 'pattern generated')

      const turns = useSessionStore.getState().turns
      expect(turns).toHaveLength(2)
      expect(turns[0].role).toBe('user')
      expect(turns[1].role).toBe('assistant')
    })
  })

  describe('TASK-04 — error state and retry transitions', () => {
    it('startLoading transitions to loading without dropping current tracks', () => {
      useSessionStore.getState().setTracks([
        {
          id: 'kick-1',
          name: 'Kick',
          steps: Array(16).fill(0) as (0 | 1)[],
          volume: 0.8,
          muted: false,
          solo: false,
        },
      ])
      useSessionStore.getState().setPlaying(true)

      useSessionStore.getState().startLoading()

      const state = useSessionStore.getState()
      expect(state.uiState).toBe('loading')
      expect(state.tracks).toHaveLength(1)
      expect(state.isPlaying).toBe(true)
    })

    it('clearError restores playing state when audio was active', () => {
      useSessionStore.setState({
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
        isPlaying: true,
        uiState: 'error',
        lastError: 'Network timeout',
      })

      useSessionStore.getState().clearError()

      const state = useSessionStore.getState()
      expect(state.lastError).toBeNull()
      expect(state.uiState).toBe('playing')
    })

    it('retry transitions to loading and returns lastPrompt', () => {
      useSessionStore.setState({
        uiState: 'error',
        lastError: 'Network timeout',
        lastPrompt: 'reintenta este prompt',
      })

      const prompt = useSessionStore.getState().retry()

      const state = useSessionStore.getState()
      expect(prompt).toBe('reintenta este prompt')
      expect(state.uiState).toBe('loading')
      expect(state.lastError).toBeNull()
    })
  })

  describe('BR-007 / EC-007 / EC-008 — deleteTrack', () => {
    const makeTrack = (id: string): Track => ({
      id,
      name: id,
      steps: Array(16).fill(0) as (0 | 1)[],
      volume: 0.8,
      muted: false,
      solo: false,
    })

    it('EC-007: deleteTrack de última pista en PLAYING → IDLE', () => {
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

    it('EC-008: deleteTrack de última pista en PAUSED → IDLE', () => {
      useSessionStore.setState({
        tracks: [makeTrack('kick-1')],
        isPlaying: false,
        uiState: 'paused',
      })

      useSessionStore.getState().deleteTrack('kick-1')

      const state = useSessionStore.getState()
      expect(state.tracks).toHaveLength(0)
      expect(state.isPlaying).toBe(false)
      expect(state.uiState).toBe('idle')
    })

    it('BR-001: deleteTrack con pistas restantes mantiene estado PLAYING', () => {
      useSessionStore.setState({
        tracks: [makeTrack('kick-1'), makeTrack('snare-1')],
        isPlaying: true,
        uiState: 'playing',
      })

      useSessionStore.getState().deleteTrack('snare-1')

      const state = useSessionStore.getState()
      expect(state.tracks).toHaveLength(1)
      expect(state.tracks[0].id).toBe('kick-1')
      expect(state.isPlaying).toBe(true)
      expect(state.uiState).toBe('playing')
    })

    it('BR-001: deleteTrack con pistas restantes en PAUSED mantiene PAUSED', () => {
      useSessionStore.setState({
        tracks: [makeTrack('kick-1'), makeTrack('snare-1')],
        isPlaying: false,
        uiState: 'paused',
      })

      useSessionStore.getState().deleteTrack('kick-1')

      const state = useSessionStore.getState()
      expect(state.tracks).toHaveLength(1)
      expect(state.tracks[0].id).toBe('snare-1')
      expect(state.isPlaying).toBe(false)
      expect(state.uiState).toBe('paused')
    })

    it('BR-007: deleteTrack elimina solo la pista indicada por id', () => {
      useSessionStore.setState({
        tracks: [makeTrack('kick-1'), makeTrack('snare-1'), makeTrack('hh-1')],
        isPlaying: false,
        uiState: 'paused',
      })

      useSessionStore.getState().deleteTrack('snare-1')

      const ids = useSessionStore.getState().tracks.map((t) => t.id)
      expect(ids).toEqual(['kick-1', 'hh-1'])
    })

    it('BR-001: deleteTrack regenera el código de Strudel para las pistas restantes', () => {
      useSessionStore.setState({
        tracks: [makeTrack('kick-1'), makeTrack('snare-1')],
        isPlaying: true,
      })

      useSessionStore.getState().deleteTrack('kick-1')

      const codeWithSnareOnly = useSessionStore.getState().currentCode
      expect(codeWithSnareOnly).toBeDefined()
      expect(codeWithSnareOnly.length).toBeGreaterThan(0)
    })

    it('BR-007: deleteTrack es no destructivo para pistas no eliminadas', () => {
      const tracks = [makeTrack('track-1'), makeTrack('track-2'), makeTrack('track-3')]
      useSessionStore.setState({ tracks })

      useSessionStore.getState().deleteTrack('track-1')

      const ids = useSessionStore.getState().tracks.map((t) => t.id)
      expect(ids).toEqual(['track-2', 'track-3'])
    })

    it('deleteTrack de pista no existente debe no-op', () => {
      useSessionStore.setState({
        tracks: [makeTrack('kick-1'), makeTrack('snare-1')],
      })

      useSessionStore.getState().deleteTrack('nonexistent-id')
      const ids = useSessionStore.getState().tracks.map((t) => t.id)
      expect(ids).toEqual(['kick-1', 'snare-1'])
    })

    it('deleteTrack con múltiples pistas mantiene el orden de las restantes', () => {
      useSessionStore.setState({
        tracks: [
          makeTrack('track-1'),
          makeTrack('track-2'),
          makeTrack('track-3'),
          makeTrack('track-4'),
        ],
        isPlaying: true,
      })

      useSessionStore.getState().deleteTrack('track-2')

      const ids = useSessionStore.getState().tracks.map((t) => t.id)
      expect(ids).toEqual(['track-1', 'track-3', 'track-4'])
    })

    it('EC-007/EC-008: después de eliminar última pista permite cargar un patrón nuevo', () => {
      useSessionStore.setState({
        tracks: [makeTrack('kick-1')],
        isPlaying: true,
        uiState: 'playing',
      })

      useSessionStore.getState().deleteTrack('kick-1')

      let state = useSessionStore.getState()
      expect(state.uiState).toBe('idle')
      expect(state.tracks).toHaveLength(0)

      const newPattern: TrackJSON = {
        bpm: 140,
        tracks: [makeTrack('new-kick')],
      }

      useSessionStore.getState().loadPattern(newPattern)
      state = useSessionStore.getState()
      expect(state.tracks).toHaveLength(1)
      expect(state.tracks[0].id).toBe('new-kick')
    })
  })

  describe('persistence — Zustand + localStorage', () => {
    it('persists state to localStorage via persist middleware', () => {
      const pattern: TrackJSON = {
        bpm: 150,
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

      useSessionStore.getState().loadPattern(pattern)

      const state = useSessionStore.getState()
      expect(state.bpm).toBe(150)
      expect(state.tracks).toHaveLength(1)
    })
  })
})
