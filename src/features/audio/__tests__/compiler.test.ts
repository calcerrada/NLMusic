import { describe, it, expect } from 'vitest'
import { compileToStrudel } from '@features/audio/compiler'
import type { TrackJSON } from '@lib/types'

describe('compiler — compileToStrudel: TrackJSON → Strudel code', () => {
  describe('happy path — single track', () => {
    it('generates valid Strudel code from a single kick track', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'kick-1',
            name: 'Kick',
            tag: 'kick',
            steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
            volume: 0.85,
            muted: false,
            solo: false,
          },
        ],
      }

      const code = compileToStrudel(pattern)

      expect(code).toContain('bd')
      expect(code).toContain('gain(0.85)')
      expect(code).toContain('slow(4)')
      expect(code).toContain('cpm(120.00)')
      expect(code).toContain('stack')
    })

    it('resolves tag=kick to sample bd', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'kick-1',
            name: 'Kick',
            tag: 'kick',
            steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
            volume: 0.8,
            muted: false,
            solo: false,
          },
        ],
      }

      const code = compileToStrudel(pattern)
      expect(code).toContain('s("bd')
    })

    it('resolves tag=snare to sample sd', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'snare-1',
            name: 'Snare',
            tag: 'snare',
            steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            volume: 0.75,
            muted: false,
            solo: false,
          },
        ],
      }

      const code = compileToStrudel(pattern)
      expect(code).toContain('sd')
    })

    it('resolves tag=hihat to sample hh', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'hihat-1',
            name: 'Hi-Hat',
            tag: 'hihat',
            steps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            volume: 0.55,
            muted: false,
            solo: false,
          },
        ],
      }

      const code = compileToStrudel(pattern)
      expect(code).toContain('hh')
    })

    it('uses explicit sample field if provided', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'custom-1',
            name: 'Custom',
            sample: 'my-sample',
            tag: 'perc',
            steps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            volume: 0.7,
            muted: false,
            solo: false,
          },
        ],
      }

      const code = compileToStrudel(pattern)
      expect(code).toContain('my-sample')
    })
  })

  describe('happy path — multiple tracks', () => {
    it('stacks multiple tracks with stack() function', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'kick-1',
            name: 'Kick',
            tag: 'kick',
            steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
            volume: 0.9,
            muted: false,
            solo: false,
          },
          {
            id: 'snare-1',
            name: 'Snare',
            tag: 'snare',
            steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            volume: 0.75,
            muted: false,
            solo: false,
          },
          {
            id: 'hihat-1',
            name: 'Hi-Hat',
            tag: 'hihat',
            steps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            volume: 0.55,
            muted: false,
            solo: false,
          },
        ],
      }

      const code = compileToStrudel(pattern)

      expect(code).toContain('bd')
      expect(code).toContain('sd')
      expect(code).toContain('hh')
      expect(code).toContain('stack(')
    })
  })

  describe('BR-001: muted track — gain(0.00), not filtered', () => {
    it('EC-006: muted track appears in stack with gain(0.00)', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'kick-1',
            name: 'Kick',
            tag: 'kick',
            steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
            volume: 0.85,
            muted: true, // MUTED
            solo: false,
          },
        ],
      }

      const code = compileToStrudel(pattern)

      // Muted track should appear in output with gain(0.00)
      expect(code).toContain('bd')
      expect(code).toContain('gain(0.00)')
      expect(code).not.toContain('gain(0.85)')
    })

    it('multiple tracks with some muted still appear in stack', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'kick-1',
            name: 'Kick',
            tag: 'kick',
            steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
            volume: 0.9,
            muted: false,
            solo: false,
          },
          {
            id: 'snare-1',
            name: 'Snare',
            tag: 'snare',
            steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            volume: 0.75,
            muted: true, // MUTED
            solo: false,
          },
        ],
      }

      const code = compileToStrudel(pattern)

      // Both tracks should be in stack
      expect(code).toContain('bd')
      expect(code).toContain('sd')
      // Kick keeps its volume, snare has gain(0.00)
      expect(code).toContain('gain(0.90)')
      expect(code).toContain('gain(0.00)')
    })
  })

  describe('solo — filter out non-solo tracks', () => {
    it('ignores muted tracks if solo is active', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'kick-1',
            name: 'Kick',
            tag: 'kick',
            steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
            volume: 0.9,
            muted: false,
            solo: true, // SOLO
          },
          {
            id: 'snare-1',
            name: 'Snare',
            tag: 'snare',
            steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            volume: 0.75,
            muted: false,
            solo: false,
          },
        ],
      }

      const code = compileToStrudel(pattern)

      // Only kick should be in output
      expect(code).toContain('bd')
      expect(code).not.toContain('sd')
    })

    it('respects multiple solo tracks together', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'kick-1',
            name: 'Kick',
            tag: 'kick',
            steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
            volume: 0.9,
            muted: false,
            solo: true,
          },
          {
            id: 'snare-1',
            name: 'Snare',
            tag: 'snare',
            steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            volume: 0.75,
            muted: false,
            solo: true,
          },
          {
            id: 'hihat-1',
            name: 'Hi-Hat',
            tag: 'hihat',
            steps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            volume: 0.55,
            muted: false,
            solo: false, // NOT SOLO
          },
        ],
      }

      const code = compileToStrudel(pattern)

      expect(code).toContain('bd')
      expect(code).toContain('sd')
      expect(code).not.toContain('hh')
    })
  })

  describe('volume — gain parameter', () => {
    it('preserves volume as gain with 2 decimal places', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'kick-1',
            name: 'Kick',
            tag: 'kick',
            steps: Array(16).fill(0) as (0 | 1)[],
            volume: 0.555,
            muted: false,
            solo: false,
          },
        ],
      }

      const code = compileToStrudel(pattern)
      expect(code).toContain('gain(0.56)') // Should round 0.555 → 0.56
    })

    it('handles full volume (1.0)', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'kick-1',
            name: 'Kick',
            tag: 'kick',
            steps: Array(16).fill(0) as (0 | 1)[],
            volume: 1,
            muted: false,
            solo: false,
          },
        ],
      }

      const code = compileToStrudel(pattern)
      expect(code).toContain('gain(1.00)')
    })

    it('handles silence volume (0.0)', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'kick-1',
            name: 'Kick',
            tag: 'kick',
            steps: Array(16).fill(0) as (0 | 1)[],
            volume: 0,
            muted: false,
            solo: false,
          },
        ],
      }

      const code = compileToStrudel(pattern)
      expect(code).toContain('gain(0.00)')
    })
  })

  describe('BPM — temporal contract', () => {
    it('compiles BPM correctly using cpm()', () => {
      const pattern: TrackJSON = {
        bpm: 140,
        tracks: [
          {
            id: 'kick-1',
            name: 'Kick',
            tag: 'kick',
            steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
            volume: 0.8,
            muted: false,
            solo: false,
          },
        ],
      }

      const code = compileToStrudel(pattern)
      expect(code).toContain('cpm(140.00)')
    })

    it('always includes .slow(4) for 16-step to bar mapping', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'kick-1',
            name: 'Kick',
            tag: 'kick',
            steps: Array(16).fill(0) as (0 | 1)[],
            volume: 0.8,
            muted: false,
            solo: false,
          },
        ],
      }

      const code = compileToStrudel(pattern)
      expect(code).toContain('cpm(120.00)')
    })
  })

  describe('edge case: empty tracks', () => {
    it('returns silence for empty tracks array', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: [],
      }

      const code = compileToStrudel(pattern)
      expect(code).toContain('silence')
      expect(code).toContain('slow(4)')
      expect(code).toContain('cpm(120.00)')
    })
  })

  describe('pattern generation — step encoding', () => {
    it('encodes 1 as sample, 0 as ~', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'kick-1',
            name: 'Kick',
            tag: 'kick',
            steps: [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0],
            volume: 0.8,
            muted: false,
            solo: false,
          },
        ],
      }

      const code = compileToStrudel(pattern)

      // Pattern should encode: bd ~ bd ~ ~ ~ bd ~ bd ~ bd ~ ~ ~ bd ~
      expect(code).toContain('bd ~ bd ~ ~ ~ bd ~ bd ~ bd ~ ~ ~ bd ~')
    })

    it('handles all-active steps (16 of 16)', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'hihat-1',
            name: 'Hi-Hat',
            tag: 'hihat',
            steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            volume: 0.5,
            muted: false,
            solo: false,
          },
        ],
      }

      const code = compileToStrudel(pattern)
      expect(code).toContain('hh hh hh hh hh hh hh hh hh hh hh hh hh hh hh hh')
    })

    it('handles no active steps (all 0)', () => {
      const pattern: TrackJSON = {
        bpm: 120,
        tracks: [
          {
            id: 'kick-1',
            name: 'Kick',
            tag: 'kick',
            steps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            volume: 0.8,
            muted: false,
            solo: false,
          },
        ],
      }

      const code = compileToStrudel(pattern)
      expect(code).toContain('~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~')
    })
  })

  describe('integration: 3-track drum pattern', () => {
    it('generates complete drum pattern matching spec section 4', () => {
      const pattern: TrackJSON = {
        bpm: 138,
        tracks: [
          {
            id: 'kick-1',
            name: 'Kick 909',
            tag: 'kick',
            sample: 'bd',
            steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
            volume: 0.9,
            muted: false,
            solo: false,
          },
          {
            id: 'snare-1',
            name: 'Snare',
            tag: 'snare',
            sample: 'sd',
            steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            volume: 0.75,
            muted: false,
            solo: false,
          },
          {
            id: 'hihat-1',
            name: 'Hi-Hat',
            tag: 'hihat',
            sample: 'hh',
            steps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            volume: 0.55,
            muted: false,
            solo: false,
          },
        ],
      }

      const code = compileToStrudel(pattern)

      expect(code).toContain('bd')
      expect(code).toContain('sd')
      expect(code).toContain('hh')
      expect(code).toContain('stack(')
      expect(code).toContain('cpm(138.00)')
      expect(code).toContain('slow(4)')
      expect(code).toContain('gain(0.90)')
      expect(code).toContain('gain(0.75)')
      expect(code).toContain('gain(0.55)')
    })
  })
})
