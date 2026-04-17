export type TrackTag = 'kick' | 'snare' | 'hihat' | 'clap' | 'perc' | string;

export interface Track {
  id: string;
  name: string;
  tag?: TrackTag;
  sample?: string;
  steps: (0 | 1)[];
  volume: number;
  muted: boolean;
  solo: boolean;
}

export interface TrackJSON {
  bpm: number;
  tracks: Track[];
  strudelCode?: string;
}
