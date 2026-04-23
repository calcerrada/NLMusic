// Quick diagnostic: check what the compiler actually outputs
import { compileToStrudel } from '@features/audio/compiler'
import type { TrackJSON } from '@lib/types'

const testPattern: TrackJSON = {
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

const code = compileToStrudel(testPattern)
console.log('=== COMPILER OUTPUT ===')
console.log(code)
console.log('=== CHECKING EXPECTATIONS ===')
console.log('Contains "bd":', code.includes('bd'))
console.log('Contains "gain(0.85)":', code.includes('gain(0.85)'))
console.log('Contains "cpm(120.00)":', code.includes('cpm(120.00)'))
console.log('Contains "slow(4)":', code.includes('slow(4)'))
console.log('=== END ===')
