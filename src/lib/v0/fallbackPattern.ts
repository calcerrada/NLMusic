import type { TrackJSON } from "../llm/types";

export function fallbackPattern(): TrackJSON {
  return {
    bpm: 138,
    tracks: [
      {
        id: "kick",
        name: "Kick 909",
        sample: "bd",
        steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        volume: 0.9,
        muted: false,
        solo: false
      },
      {
        id: "snare",
        name: "Snare",
        sample: "sd",
        steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        volume: 0.75,
        muted: false,
        solo: false
      },
      {
        id: "hihat",
        name: "Hi-Hat",
        sample: "hh",
        steps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        volume: 0.55,
        muted: false,
        solo: false
      }
    ]
  };
}
