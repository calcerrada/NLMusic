"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { Language } from "@lib/i18n";
import type { UiState as _UiState, EditorMode as _EditorMode } from "./helpers";
import { createTracksSlice, type TracksSlice } from "./slices/tracksSlice";
import { createAudioSlice, type AudioSlice } from "./slices/audioSlice";
import { createUiSlice, type UiSlice } from "./slices/uiSlice";
import { createSessionSlice, type SessionSlice } from "./slices/sessionSlice";
import { createEditorSlice, type EditorSlice } from "./slices/editorSlice";

// Re-export types that consumers import from this module
export type { UiState, EditorMode } from "./helpers";

/**
 * Estado unificado de sesión construido por composición de slices.
 * Mantiene estable la API pública para consumidores de useSessionStore.
 */
export type SessionStore = TracksSlice & AudioSlice & UiSlice & SessionSlice & EditorSlice;

/**
 * Subconjunto persistido en localStorage para rehidratación de sesión.
 * Excluye estado efímero de UI/transporte para evitar incoherencias al recargar.
 */
interface PersistedState {
  bpm: number;
  tracks: SessionStore["tracks"];
  turns: { role: "user" | "assistant"; content: string }[];
  editorMode: _EditorMode;
  highlightingEnabled: boolean;
  hapVisualizationEnabled: boolean;
  language: Language;
}

export const useSessionStore = create<SessionStore>()(
  devtools(
    persist(
      (...args) => ({
        ...createTracksSlice(...args),
        ...createAudioSlice(...args),
        ...createUiSlice(...args),
        ...createSessionSlice(...args),
        ...createEditorSlice(...args),
      }),
      {
        name: "nlmusic-session",
        // TASK-12/TASK-13: editor preferences and language persist between sessions.
        partialize: (state): PersistedState => ({
          bpm: state.bpm,
          tracks: state.tracks,
          turns: state.turns.slice(-40),
          editorMode: state.editorMode,
          highlightingEnabled: state.highlightingEnabled,
          hapVisualizationEnabled: state.hapVisualizationEnabled,
          language: state.language,
        }),
      },
    ),
  ),
);
