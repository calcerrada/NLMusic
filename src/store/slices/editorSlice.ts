import type { StateCreator } from "zustand";
import type { EditorMode } from "../helpers";
import type { SessionStore } from "../sessionStore";

export type EditorSlice = {
  editorMode: EditorMode;
  highlightingEnabled: boolean;
  hapVisualizationEnabled: boolean;
  setEditorMode: (mode: EditorMode) => void;
  setHighlightingEnabled: (enabled: boolean) => void;
  setHapVisualizationEnabled: (enabled: boolean) => void;
};

/**
 * Slice de preferencias del editor Strudel persistidas entre sesiones.
 * Aisla flags de UX para no mezclar estado musical con configuración visual.
 */
export const createEditorSlice: StateCreator<
  SessionStore,
  [["zustand/devtools", never], ["zustand/persist", unknown]],
  [],
  EditorSlice
> = (set) => ({
  editorMode: "advanced",
  highlightingEnabled: true,
  hapVisualizationEnabled: true,

  setEditorMode: (mode) => set({ editorMode: mode }),
  setHighlightingEnabled: (enabled) => set({ highlightingEnabled: enabled }),
  setHapVisualizationEnabled: (enabled) => set({ hapVisualizationEnabled: enabled }),
});
