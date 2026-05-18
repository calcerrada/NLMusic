import type { StateCreator } from "zustand";
import type { Track, TrackJSON } from "@lib/types";
import { deriveUiState, compileCode } from "../helpers";
import type { SessionStore } from "../sessionStore";

export const defaultKickTrack: Track = {
  id: "kick-1",
  name: "Kick",
  tag: "kick",
  steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] as (0 | 1)[],
  volume: 0.8,
  muted: false,
  solo: false,
};

export const initialTracks: Track[] = [defaultKickTrack];
export const initialBpm = 138;

export type TracksSlice = {
  tracks: Track[];
  bpm: number;
  setTracks: (tracks: Track[]) => void;
  setBpm: (bpm: number) => void;
  toggleStep: (trackId: string, stepIndex: number) => void;
  setVolume: (trackId: string, volume: number) => void;
  toggleMute: (trackId: string) => void;
  toggleSolo: (trackId: string) => void;
  addTrack: (track: Track) => void;
  updateTrack: (id: string, patch: Partial<Track>) => boolean;
  deleteTrack: (id: string) => void;
  loadPattern: (pattern: TrackJSON) => void;
  syncCodePattern: (pattern: TrackJSON, code: string) => void;
};

/**
 * Slice de pistas y BPM con acciones de edición y sincronización de código.
 * Incluye transiciones que afectan transporte/UI cuando cambian las pistas.
 */
export const createTracksSlice: StateCreator<
  SessionStore,
  [["zustand/devtools", never], ["zustand/persist", unknown]],
  [],
  TracksSlice
> = (set, get) => ({
  tracks: initialTracks,
  bpm: initialBpm,

  // EC-007: al eliminar la última pista forzamos IDLE y detenemos reproducción.
  /**
   * Reemplaza todas las pistas y recalcula transporte, UI y código derivado.
   * Si no quedan pistas, fuerza parada para evitar estado PLAYING inválido.
   * @see EC-007
   */
  setTracks: (tracks) =>
    set((state) => {
      const nextIsPlaying = tracks.length > 0 ? state.isPlaying : false;
      return {
        tracks,
        currentCode: compileCode(state.bpm, tracks),
        isCodeManuallyEdited: false,
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
        isCodeManuallyEdited: false,
      };
    }),

  toggleStep: (trackId, stepIndex) =>
    set((state) => {
      const tracks = state.tracks.map((track) => {
        if (track.id !== trackId) return track;
        const steps = track.steps.map((value, index) => {
          if (index !== stepIndex) return value;
          return value === 1 ? 0 : 1;
        }) as (0 | 1)[];
        return { ...track, steps };
      });
      return {
        tracks,
        currentCode: compileCode(state.bpm, tracks),
        isCodeManuallyEdited: false,
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
        isCodeManuallyEdited: false,
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
        isCodeManuallyEdited: false,
      };
    }),

  toggleSolo: (trackId) =>
    set((state) => {
      const target = state.tracks.find((track) => track.id === trackId);
      if (!target) return state;
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
        isCodeManuallyEdited: false,
      };
    }),

  addTrack: (track) =>
    set((state) => {
      if (state.tracks.length >= 5) return state;
      const nextTracks = [...state.tracks, track];
      return {
        tracks: nextTracks,
        currentCode: compileCode(state.bpm, nextTracks),
        isCodeManuallyEdited: false,
      };
    }),

  // BR-004: modifica pista por id; devuelve false si no existe (BR-005)
  /**
   * Aplica un patch parcial por id y reporta si la pista objetivo no existe.
   * Permite al flujo de prompt distinguir "no-op" por referencia inválida.
   * @see BR-005
   */
  updateTrack: (id, patch) => {
    const { tracks } = get();
    if (!tracks.some((t) => t.id === id)) return false;
    const nextTracks = tracks.map((t) => (t.id === id ? { ...t, ...patch } : t));
    set((state) => ({
      tracks: nextTracks,
      currentCode: compileCode(state.bpm, nextTracks),
      isCodeManuallyEdited: false,
    }));
    return true;
  },

  // EC-007/EC-008: al quedar 0 pistas, el transporte debe caer a IDLE.
  /**
   * Elimina una pista y ajusta transporte/UI cuando era la última activa.
   * Mantiene coherente el estado global en PLAYING y PAUSED.
   * @see EC-007
   * @see EC-008
   */
  deleteTrack: (id) =>
    set((state) => {
      const nextTracks = state.tracks.filter((t) => t.id !== id);
      const nextIsPlaying = nextTracks.length > 0 ? state.isPlaying : false;
      return {
        tracks: nextTracks,
        currentCode: compileCode(state.bpm, nextTracks),
        isCodeManuallyEdited: false,
        isPlaying: nextIsPlaying,
        uiState: deriveUiState(nextTracks, nextIsPlaying),
      };
    }),

  // FIX-6: reusar código ya compilado por usePatternGen para evitar doble compilación
  /**
   * Carga un patrón completo desde LLM respetando límite defensivo de 5 pistas.
   * Prioriza strudelCode precompilado para evitar recompilación redundante.
   * @see BR-006
   */
  loadPattern: (pattern) =>
    set(() => {
      const nextTracks = pattern.tracks.slice(0, 5); // BR-006 defensa
      const code = pattern.strudelCode ?? compileCode(pattern.bpm, nextTracks);
      return {
        bpm: pattern.bpm,
        tracks: nextTracks,
        currentCode: code,
        isCodeManuallyEdited: false,
        isPlaying: nextTracks.length > 0,
        uiState: nextTracks.length > 0 ? "playing" : "idle",
        lastError: null,
      };
    }),

  // BR-009: el grid vuelve a reflejar el código — limpiar la marca de edición manual
  /**
   * Sincroniza tracks + código cuando el parser reconstruye el patrón desde editor.
   * Limpia modo manual para reactivar coherencia bidireccional grid/código.
   * @see BR-009
   */
  syncCodePattern: (pattern, code) =>
    set((state) => {
      const nextTracks = pattern.tracks.slice(0, 5); // BR-006 cap defensivo
      const nextIsPlaying = nextTracks.length > 0 ? state.isPlaying : false;
      return {
        bpm: pattern.bpm,
        tracks: nextTracks,
        currentCode: code,
        isCodeManuallyEdited: false,
        isPlaying: nextIsPlaying,
        uiState: deriveUiState(nextTracks, nextIsPlaying),
      };
    }),
});
