import type { TrackJSON } from './audio';

export interface SessionTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface SessionContext {
  turns: SessionTurn[];
  currentPattern?: TrackJSON | null;
  previous?: TrackJSON;
  language?: 'es' | 'en' | 'mixed';
}
