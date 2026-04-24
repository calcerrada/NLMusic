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

// BR-004: incremental operations so the LLM can add/update/remove/replace tracks
export type PatternOperation =
  | { type: 'add';     track: Track }
  | { type: 'update';  id: string; patch: Partial<Omit<Track, 'id'>> }
  | { type: 'remove';  id: string }
  | { type: 'replace'; tracks: Track[] };

export interface PatternDelta {
  bpm?: number;
  operations: PatternOperation[];
}
