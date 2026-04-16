import type { TrackJSON, SessionTurn } from '../llm/types';

export interface GeneratePatternRequest {
  prompt: string;
  context: {
    turns: SessionTurn[];
    previous?: TrackJSON | null;
    language?: 'es' | 'en' | 'mixed';
  };
}

export interface GeneratePatternResponse {
  success: boolean;
  trackJson?: TrackJSON;
  usedFallback?: boolean;
  error?: string;
}
