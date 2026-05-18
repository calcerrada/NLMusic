import type { StateCreator } from "zustand";
import type { Language } from "@lib/i18n";
import type { SessionStore } from "../sessionStore";

export type SessionSlice = {
  turns: { role: "user" | "assistant"; content: string }[];
  language: Language;
  addTurn: (role: "user" | "assistant", content: string) => void;
  // TASK-13: cambio de idioma manual — causa rerender inmediato sin reload
  setLanguage: (lang: Language) => void;
};

/**
 * Detecta idioma inicial desde navegador con fallback seguro para SSR/tests.
 * Sin navigator disponible, fuerza ES para mantener render determinista.
 */
function detectLanguage(): Language {
  if (typeof navigator === "undefined") return "es";
  return navigator.language.startsWith("en") ? "en" : "es";
}

/**
 * Slice de contexto conversacional y preferencia de idioma de la sesión.
 * Mantiene historial de turns para prompts incrementales y debugging.
 */
export const createSessionSlice: StateCreator<
  SessionStore,
  [["zustand/devtools", never], ["zustand/persist", unknown]],
  [],
  SessionSlice
> = (set) => ({
  turns: [],
  language: detectLanguage(),

  addTurn: (role, content) =>
    set((state) => ({
      turns: [...state.turns, { role, content }],
    })),

  setLanguage: (lang) => set({ language: lang }),
});
