export type TrackId = string;

export interface Track {
  id: TrackId;
  name: string;
  sample: string;
  steps: number[];
  volume: number;
  muted: boolean;
  solo: boolean;
}

export interface TrackJSON {
  bpm: number;
  tracks: Track[];
  strudelCode?: string;
}

export interface SessionTurn {
  prompt: string;
  responseSummary: string;
  timestampISO: string;
}

export interface SessionContext {
  turns: SessionTurn[];
  previous?: TrackJSON;
  language?: "es" | "en" | "mixed";
}

export interface LLMProvider {
  generatePattern(prompt: string, context: SessionContext): Promise<TrackJSON>;
}
