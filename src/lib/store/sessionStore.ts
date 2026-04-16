import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { TrackJSON, SessionTurn } from '../llm/types';
import { compileToStrudel } from '../strudel/compiler';

export interface SessionState {
  bpm: number;
  tracks: TrackJSON['tracks'];
  strudelCode: string;
  turns: SessionTurn[];
  isGenerating: boolean;
  error: string | null;
  
  // Actions
  updateBpm: (bpm: number) => void;
  updateTracks: (tracks: TrackJSON['tracks']) => void;
  updateStrudelCode: (code: string) => void;
  setGenerating: (isGenerating: boolean) => void;
  setError: (error: string | null) => void;
  addTurn: (turn: SessionTurn) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackSolo: (trackId: string) => void;
  updateTrackStep: (trackId: string, stepIndex: number, value: 0 | 1) => void;
  updateTrackVolume: (trackId: string, volume: number) => void;
  loadPattern: (pattern: TrackJSON) => void;
  reset: () => void;
}

const initialPattern: TrackJSON = {
  bpm: 138,
  tracks: [
    {
      id: 'kick',
      name: 'Kick 909',
      sample: 'bd',
      steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      volume: 0.9,
      muted: false,
      solo: false,
    },
    {
      id: 'snare',
      name: 'Snare',
      sample: 'sd',
      steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      volume: 0.75,
      muted: false,
      solo: false,
    },
    {
      id: 'hihat',
      name: 'Hi-Hat',
      sample: 'hh',
      steps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      volume: 0.55,
      muted: false,
      solo: false,
    },
  ],
  strudelCode: 'stack(s("bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~").gain(0.90), s("~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~").gain(0.75), s("hh ~ hh ~ hh ~ hh ~ hh ~ hh ~ hh ~ hh ~").gain(0.55)).cpm(138.00)',
};

function compileSessionPattern(bpm: number, tracks: TrackJSON['tracks']) {
  return compileToStrudel({ bpm, tracks });
}

export const useSessionStore = create<SessionState>()(
  devtools(
    persist(
      (set) => ({
        bpm: initialPattern.bpm,
        tracks: initialPattern.tracks,
        strudelCode: compileSessionPattern(initialPattern.bpm, initialPattern.tracks),
        turns: [],
        isGenerating: false,
        error: null,

        updateBpm: (bpm) =>
          set((state) => ({
            bpm,
            strudelCode: compileSessionPattern(bpm, state.tracks),
          })),
        updateTracks: (tracks) =>
          set((state) => ({
            tracks,
            strudelCode: compileSessionPattern(state.bpm, tracks),
          })),
        updateStrudelCode: (strudelCode) => set({ strudelCode }),
        setGenerating: (isGenerating) => set({ isGenerating }),
        setError: (error) => set({ error }),
        addTurn: (turn) =>
          set((state) => ({
            turns: [...state.turns, turn],
          })),

        toggleTrackMute: (trackId) =>
          set((state) => {
            const tracks = state.tracks.map((t) =>
              t.id === trackId ? { ...t, muted: !t.muted } : t
            );

            return {
              tracks,
              strudelCode: compileSessionPattern(state.bpm, tracks),
            };
          }),

        toggleTrackSolo: (trackId) =>
          set((state) => {
            const hasAnySolo = state.tracks.some((t) => t.solo);
            if (hasAnySolo && state.tracks.find((t) => t.id === trackId)?.solo) {
              const tracks = state.tracks.map((t) =>
                t.id === trackId ? { ...t, solo: false } : t
              );

              // Unsolo this track
              return {
                tracks,
                strudelCode: compileSessionPattern(state.bpm, tracks),
              };
            }

            const tracks = state.tracks.map((t) =>
              t.id === trackId ? { ...t, solo: true } : { ...t, solo: false }
            );

            // Solo only this track
            return {
              tracks,
              strudelCode: compileSessionPattern(state.bpm, tracks),
            };
          }),

        updateTrackStep: (trackId, stepIndex, value) =>
          set((state) => {
            const tracks = state.tracks.map((t) =>
              t.id === trackId
                ? {
                    ...t,
                    steps: t.steps.map((s, i) => (i === stepIndex ? value : s)),
                  }
                : t
            );

            return {
              tracks,
              strudelCode: compileSessionPattern(state.bpm, tracks),
            };
          }),

        updateTrackVolume: (trackId, volume) =>
          set((state) => {
            const tracks = state.tracks.map((t) =>
              t.id === trackId ? { ...t, volume } : t
            );

            return {
              tracks,
              strudelCode: compileSessionPattern(state.bpm, tracks),
            };
          }),

        loadPattern: (pattern) =>
          set({
            bpm: pattern.bpm,
            tracks: pattern.tracks,
            strudelCode: compileSessionPattern(pattern.bpm, pattern.tracks),
          }),

        reset: () =>
          set({
            bpm: initialPattern.bpm,
            tracks: initialPattern.tracks,
            strudelCode: compileSessionPattern(initialPattern.bpm, initialPattern.tracks),
            turns: [],
            isGenerating: false,
            error: null,
          }),
      }),
      {
        name: 'nlmusic-session',
      }
    )
  )
);
