import type { Track } from "@lib/types";
import { compileToStrudel } from "@features/audio/compiler";

export type UiState = "idle" | "loading" | "playing" | "paused" | "error";
export type EditorMode = "advanced" | "simple";
export type ActiveTab = "sequencer" | "code" | "config";

/**
 * Deriva el estado UI estable a partir de presencia de pistas y transporte.
 * Evita estados imposibles al recomputar desde la fuente de verdad del store.
 */
export function deriveUiState(tracks: Track[], isPlaying: boolean): UiState {
  if (tracks.length === 0) return "idle";
  return isPlaying ? "playing" : "paused";
}

/**
 * Compila el snapshot actual (BPM + tracks) a Strudel de forma determinista.
 * Se reutiliza en slices para mantener coherencia grid <-> código.
 * @see BR-009
 */
export function compileCode(bpm: number, tracks: Track[]): string {
  return compileToStrudel({ bpm, tracks });
}
