"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { Track, TrackJSON } from "@lib/types";
import { compileToStrudel } from "@features/audio/compiler";

type ActiveTab = "sequencer" | "code";
export type UiState = "idle" | "loading" | "playing" | "paused" | "error";

/**
 * Deriva el estado visual principal a partir de pistas y reproducción real.
 * Evita estados inconsistentes cuando cambian pistas o transporte por separado.
 *
 * @param tracks - Pistas activas en sesión (0..5).
 * @param isPlaying - Flag de reproducción del motor actual.
 * @returns Estado de UI coherente para la máquina global.
 * @see EC-007 Sin pistas, la app debe volver a IDLE
 */
function deriveUiState(tracks: Track[], isPlaying: boolean): UiState {
  if (tracks.length === 0) {
    return "idle";
  }

  return isPlaying ? "playing" : "paused";
}

interface PersistedState {
  bpm: number;
  tracks: Track[];
  turns: { role: "user" | "assistant"; content: string }[];
}

export interface SessionStore {
  tracks: Track[];
  bpm: number;
  isPlaying: boolean;
  activeTab: ActiveTab;
  currentCode: string;
  turns: { role: "user" | "assistant"; content: string }[];
  uiState: UiState;
  lastError: string | null;
  lastPrompt: string | null;

  setTracks: (tracks: Track[]) => void;
  setBpm: (bpm: number) => void;
  setPlaying: (value: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setCurrentCode: (code: string) => void;
  toggleStep: (trackId: string, stepIndex: number) => void;
  setVolume: (trackId: string, volume: number) => void;
  toggleMute: (trackId: string) => void;
  toggleSolo: (trackId: string) => void;
  addTurn: (role: "user" | "assistant", content: string) => void;
  loadPattern: (pattern: TrackJSON) => void;
  // BR-003: estado ERROR — mantener estado, informar, ofrecer reintento
  startLoading: () => void;
  setError: (message: string) => void;
  clearError: () => void;
  setLastPrompt: (prompt: string) => void;
  retry: () => string | null;
}

function compileCode(bpm: number, tracks: Track[]): string {
  return compileToStrudel({ bpm, tracks });
}

const defaultKickTrack: Track = {
  id: "kick-1",
  name: "Kick",
  tag: "kick",
  steps: [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0] as (0 | 1)[],
  volume: 0.8,
  muted: false,
  solo: false,
};

const initialTracks: Track[] = [defaultKickTrack];
const initialBpm = 138;

export const useSessionStore = create<SessionStore>()(
  devtools(
    persist(
      (set, get) => ({
        tracks: initialTracks,
        bpm: initialBpm,
        isPlaying: false,
        activeTab: "sequencer",
        currentCode: compileCode(initialBpm, initialTracks),
        turns: [],
        uiState: deriveUiState(initialTracks, false),
        lastError: null,
        lastPrompt: null,

        // EC-007: al eliminar la última pista forzamos IDLE y detenemos reproducción.
        setTracks: (tracks) =>
          set((state) => {
            const nextIsPlaying = tracks.length > 0 ? state.isPlaying : false;
            return {
              tracks,
              currentCode: compileCode(state.bpm, tracks),
              isPlaying: nextIsPlaying,
              uiState: deriveUiState(tracks, nextIsPlaying),
            };
          }),

        setBpm: (bpm) =>
          set((state) => {
            const clamped = Math.min(220, Math.max(60, bpm));
            return {
              bpm: clamped,
              currentCode: compileCode(clamped, state.tracks),
            };
          }),

        // BR-001: el transporte actualiza estado sin tocar el patrón activo.
        setPlaying: (value) =>
          set((state) => ({
            isPlaying: value,
            uiState: deriveUiState(state.tracks, value),
          })),
        setActiveTab: (tab) => set({ activeTab: tab }),
        setCurrentCode: (code) => set({ currentCode: code }),

        toggleStep: (trackId, stepIndex) =>
          set((state) => {
            const tracks = state.tracks.map((track) => {
              if (track.id !== trackId) {
                return track;
              }

              const steps = track.steps.map((value, index) => {
                if (index !== stepIndex) {
                  return value;
                }
                return value === 1 ? 0 : 1;
              }) as (0 | 1)[];

              return { ...track, steps };
            });

            return {
              tracks,
              currentCode: compileCode(state.bpm, tracks),
            };
          }),

        setVolume: (trackId, volume) =>
          set((state) => {
            const tracks = state.tracks.map((track) =>
              track.id === trackId
                ? { ...track, volume: Math.max(0, Math.min(1, volume)) }
                : track,
            );

            return {
              tracks,
              currentCode: compileCode(state.bpm, tracks),
            };
          }),

        toggleMute: (trackId) =>
          set((state) => {
            const tracks = state.tracks.map((track) =>
              track.id === trackId ? { ...track, muted: !track.muted } : track,
            );

            return {
              tracks,
              currentCode: compileCode(state.bpm, tracks),
            };
          }),

        toggleSolo: (trackId) =>
          set((state) => {
            const target = state.tracks.find((track) => track.id === trackId);
            if (!target) {
              return state;
            }

            const shouldUnsolo = target.solo;
            const tracks = state.tracks.map((track) => {
              if (shouldUnsolo) {
                return track.id === trackId ? { ...track, solo: false } : track;
              }
              return track.id === trackId
                ? { ...track, solo: true }
                : { ...track, solo: false };
            });

            return {
              tracks,
              currentCode: compileCode(state.bpm, tracks),
            };
          }),

        addTurn: (role, content) =>
          set((state) => ({
            turns: [...state.turns, { role, content }],
          })),

        loadPattern: (pattern) =>
          set(() => {
            const nextTracks = pattern.tracks.slice(0, 5); // BR-006 defensa
            return {
              bpm: pattern.bpm,
              tracks: nextTracks,
              currentCode: compileCode(pattern.bpm, nextTracks),
              isPlaying: nextTracks.length > 0,
              uiState: nextTracks.length > 0 ? "playing" : "idle",
              lastError: null,
            };
          }),

        // BR-003: submit o retry entra en LOADING sin perder el patrón actual.
        startLoading: () =>
          set({ uiState: "loading", lastError: null }),

        // BR-003: transición → ERROR, guarda mensaje y prompt para reintento
        setError: (message) =>
          set({ uiState: "error", lastError: message }),

        // BR-003: al salir de ERROR recuperamos el estado real del audio/patrón.
        clearError: () =>
          set((state) => ({
            uiState: deriveUiState(state.tracks, state.isPlaying),
            lastError: null,
          })),

        setLastPrompt: (prompt) =>
          set({ lastPrompt: prompt }),

        // BR-003: ERROR -> LOADING reutilizando el último prompt fallido.
        retry: () => {
          const prompt = get().lastPrompt;
          if (!prompt) {
            return null;
          }

          set({ uiState: "loading", lastError: null });
          return prompt;
        },
      }),
      {
        name: "nlmusic-session",
        partialize: (state): PersistedState => ({
          bpm: state.bpm,
          tracks: state.tracks,
          turns: state.turns,
        }),
      },
    ),
  ),
);
