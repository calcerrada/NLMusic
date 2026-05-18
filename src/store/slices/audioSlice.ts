import type { StateCreator } from "zustand";
import { deriveUiState } from "../helpers";
import { initialBpm, initialTracks } from "./tracksSlice";
import { compileCode } from "../helpers";
import type { SessionStore } from "../sessionStore";

export type AudioSlice = {
  isPlaying: boolean;
  currentCode: string;
  isCodeManuallyEdited: boolean;
  setPlaying: (value: boolean) => void;
  setCurrentCode: (code: string) => void;
  // BR-009: set code from manual editor edit (marks isCodeManuallyEdited)
  setManualCode: (code: string) => void;
};

/**
 * Slice de transporte y código activo reproducible por Strudel.
 * Conserva la separación entre reproducción y edición manual de código.
 */
export const createAudioSlice: StateCreator<
  SessionStore,
  [["zustand/devtools", never], ["zustand/persist", unknown]],
  [],
  AudioSlice
> = (set) => ({
  isPlaying: false,
  currentCode: compileCode(initialBpm, initialTracks),
  isCodeManuallyEdited: false,

  // BR-001: el transporte actualiza estado sin tocar el patrón activo.
  /**
   * Cambia reproducción sin mutar tracks ni recompilar patrón.
   * La UI se deriva desde estado actual para preservar continuidad sonora.
   * @see BR-001
   */
  setPlaying: (value) =>
    set((state) => ({
      isPlaying: value,
      uiState: deriveUiState(state.tracks, value),
    })),

  setCurrentCode: (code) => set({ currentCode: code }),

  // BR-009: edición manual del editor — marca el grid como desincronizado con el código
  /**
   * Registra edición directa del editor y marca desincronización temporal.
   * La marca evita sobreescrituras hasta reconciliar con parseo de grid.
   * @see BR-009
   */
  setManualCode: (code) => set({ currentCode: code, isCodeManuallyEdited: true }),
});
