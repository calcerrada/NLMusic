// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { applyDelta } from '@lib/llm/applyDelta'
import type { PatternDelta, TrackJSON } from '@lib/types'

const basePattern: TrackJSON = {
  bpm: 138,
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
      volume: 0.7,
      muted: false,
      solo: false,
    },
  ],
}

describe('applyDelta — BR-004/BR-005/BR-006', () => {
  it('is pure and deterministic for the same input', () => {
    const current = structuredClone(basePattern)
    const delta: PatternDelta = {
      bpm: 140,
      operations: [{ type: 'update', id: 'snare-1', patch: { volume: 0.95 } }],
    }

    const r1 = applyDelta(current, delta)
    const r2 = applyDelta(current, delta)

    expect(r1).toEqual(r2)
    expect(current).toEqual(basePattern)
  })

  it('BR-004: add appends track without replacing existing ones', () => {
    const result = applyDelta(basePattern, {
      operations: [
        {
          type: 'add',
          track: {
            id: 'hihat-1',
            name: 'Hi-Hat',
            steps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            volume: 0.6,
            muted: false,
            solo: false,
          },
        },
      ],
    })

    expect(result.next.tracks).toHaveLength(3)
    expect(result.next.tracks[0].id).toBe('kick-1')
    expect(result.next.tracks[1].id).toBe('snare-1')
    expect(result.next.tracks[2].id).toBe('hihat-1')
    expect(result.warnings).toEqual([])
  })

  it('BR-005: update with missing id yields warning and keeps state', () => {
    const result = applyDelta(basePattern, {
      operations: [{ type: 'update', id: 'ghost-99', patch: { volume: 0.2 } }],
    })

    expect(result.next).toEqual(basePattern)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('ghost-99')
  })

  it('BR-005: remove with missing id yields warning and keeps state', () => {
    const result = applyDelta(basePattern, {
      operations: [{ type: 'remove', id: 'ghost-42' }],
    })

    expect(result.next).toEqual(basePattern)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('ghost-42')
  })

  it('BR-006: add is rejected when pattern already has 5 tracks', () => {
    const fullPattern: TrackJSON = {
      bpm: 138,
      tracks: Array.from({ length: 5 }, (_, i) => ({
        id: `t-${i}`,
        name: `Track ${i}`,
        steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] as (0 | 1)[],
        volume: 0.8,
        muted: false,
        solo: false,
      })),
    }

    const result = applyDelta(fullPattern, {
      operations: [
        {
          type: 'add',
          track: {
            id: 'extra-1',
            name: 'Extra',
            steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
            volume: 0.8,
            muted: false,
            solo: false,
          },
        },
      ],
    })

    expect(result.next.tracks).toHaveLength(5)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('BR-006')
  })
})
