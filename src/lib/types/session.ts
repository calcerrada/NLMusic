import type { TrackJSON } from './audio';

export interface SessionTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Contexto conversacional enviado al adaptador LLM.
 * `previous` es el único snapshot vigente del patrón anterior para evitar
 * ambiguedad con aliases históricos del contrato.
 */
export interface SessionContext {
  turns: SessionTurn[];
  previous?: TrackJSON;
  language?: 'es' | 'en' | 'mixed';
}
