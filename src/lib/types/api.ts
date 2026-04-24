import type { PatternDelta } from './audio';
import type { SessionContext } from './session';

export interface LLMProvider {
  generatePattern(prompt: string, context: SessionContext): Promise<PatternDelta>;
}
