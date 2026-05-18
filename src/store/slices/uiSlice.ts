import type { StateCreator } from "zustand";
import { deriveUiState, type ActiveTab, type UiState } from "../helpers";
import type { SessionStore } from "../sessionStore";

export type UiSlice = {
  activeTab: ActiveTab;
  uiState: UiState;
  lastError: string | null;
  lastPrompt: string | null;
  promptDraft: string | null;
  setActiveTab: (tab: ActiveTab) => void;
  startLoading: () => void;
  setError: (message: string) => void;
  clearError: () => void;
  setLastPrompt: (prompt: string) => void;
  retry: () => string | null;
  setPromptDraft: (text: string | null) => void;
};

/**
 * Slice de UI de sesión: pestaña activa, estado de máquina y errores de flujo.
 * Centraliza transiciones LOADING/ERROR sin alterar datos musicales.
 */
export const createUiSlice: StateCreator<
  SessionStore,
  [["zustand/devtools", never], ["zustand/persist", unknown]],
  [],
  UiSlice
> = (set, get) => ({
  activeTab: "sequencer",
  uiState: "paused",
  lastError: null,
  lastPrompt: null,
  promptDraft: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  // BR-003: submit o retry entra en LOADING sin perder el patrón actual.
  /**
   * Inicia ciclo de generación y limpia error previo manteniendo pistas activas.
   * Se usa tanto en submit inicial como en reintentos.
   * @see BR-003
   */
  startLoading: () => set({ uiState: "loading", lastError: null }),

  // BR-003: transición → ERROR, guarda mensaje y prompt para reintento
  /**
   * Publica fallo uniforme de LLM/red sin tocar el estado musical vigente.
   * Conserva contexto para mostrar feedback y habilitar retry.
   * @see BR-003
   */
  setError: (message) => set({ uiState: "error", lastError: message }),

  // BR-003: al salir de ERROR recuperamos el estado real del audio/patrón.
  /**
   * Sale de ERROR recomputando estado UI desde tracks + transporte reales.
   * Evita quedarse en estado transitorio tras errores recuperables.
   * @see BR-003
   */
  clearError: () =>
    set((state) => ({
      uiState: deriveUiState(state.tracks, state.isPlaying),
      lastError: null,
    })),

  setLastPrompt: (prompt) => set({ lastPrompt: prompt }),

  // BR-003: ERROR -> LOADING reutilizando el último prompt fallido.
  /**
   * Reintenta con el último prompt fallido y devuelve null si no existe contexto.
   * Permite a la capa de prompt decidir llamada sin duplicar lógica.
   * @see BR-003
   */
  retry: () => {
    const prompt = get().lastPrompt;
    if (!prompt) return null;
    set({ uiState: "loading", lastError: null });
    return prompt;
  },

  setPromptDraft: (text) => set({ promptDraft: text }),
});
