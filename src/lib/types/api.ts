import type { TrackJSON } from './audio';
import type { SessionContext } from './session';

export interface LLMProvider {
  generatePattern(prompt: string, context: SessionContext): Promise<TrackJSON>;
}
