// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { validatePatternDelta, validateTrackJson } from '@lib/llm/validation'

const STEPS_16 = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] as const

const minimalTrack = {
  id: 'kick-1',
  name: 'Kick',
  steps: [...STEPS_16],
  volume: 0.8,
  muted: false,
  solo: false,
}

const minimalPayload = {
  bpm: 120,
  tracks: [minimalTrack],
}

describe('validateTrackJson — alias resolution + schema smoke test', () => {
  it('accepts a minimal valid payload', () => {
    const result = validateTrackJson(minimalPayload)
    expect(result.bpm).toBe(120)
    expect(result.tracks).toHaveLength(1)
    expect(result.tracks[0].id).toBe('kick-1')
  })

  it('accepts optional strudelCode', () => {
    const result = validateTrackJson({ ...minimalPayload, strudelCode: 's("bd")' })
    expect(result.strudelCode).toBe('s("bd")')
  })

  it('throws on empty tracks array (BR-002)', () => {
    expect(() => validateTrackJson({ bpm: 120, tracks: [] })).toThrow()
  })

  it('throws when bpm is below 60', () => {
    expect(() => validateTrackJson({ ...minimalPayload, bpm: 30 })).toThrow()
  })

  it('throws when bpm is above 220', () => {
    expect(() => validateTrackJson({ ...minimalPayload, bpm: 300 })).toThrow()
  })

  it('throws when steps length is not 16', () => {
    const badTrack = { ...minimalTrack, steps: [1, 0, 0, 0] }
    expect(() => validateTrackJson({ bpm: 120, tracks: [badTrack] })).toThrow()
  })

  it('throws on more than 5 tracks (BR-006)', () => {
    const tracks = Array.from({ length: 6 }, (_, i) => ({ ...minimalTrack, id: `t-${i}` }))
    expect(() => validateTrackJson({ bpm: 120, tracks })).toThrow()
  })

  it('throws on null input', () => {
    expect(() => validateTrackJson(null)).toThrow()
  })

  it('throws on non-object input', () => {
    expect(() => validateTrackJson('invalid-string')).toThrow()
  })
})

describe('validatePatternDelta — BR-004 incremental operations', () => {
  it('accepts add/update/remove/replace operations', () => {
    const result = validatePatternDelta({
      bpm: 128,
      operations: [
        { type: 'add', track: { ...minimalTrack, id: 'hihat-1', name: 'Hi-Hat' } },
        { type: 'update', id: 'kick-1', patch: { volume: 0.95 } },
        { type: 'remove', id: 'snare-1' },
        { type: 'replace', tracks: [{ ...minimalTrack, id: 'new-kick-1' }] },
      ],
    })

    expect(result.bpm).toBe(128)
    expect(result.operations).toHaveLength(4)
  })

  it('throws when operations is empty', () => {
    expect(() => validatePatternDelta({ bpm: 128, operations: [] })).toThrow()
  })

  it('throws when update patch contains invalid value', () => {
    expect(() =>
      validatePatternDelta({
        operations: [{ type: 'update', id: 'kick-1', patch: { volume: 2 } }],
      }),
    ).toThrow()
  })

  it('throws when add track has invalid steps length', () => {
    expect(() =>
      validatePatternDelta({
        operations: [
          {
            type: 'add',
            track: { ...minimalTrack, id: 'bad-steps', steps: [1, 0, 0, 1] },
          },
        ],
      }),
    ).toThrow()
  })
})
