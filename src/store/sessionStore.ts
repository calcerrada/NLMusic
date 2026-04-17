'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Track, TrackJSON } from '@/types';
import { compileToStrudel } from '@/lib/strudel/compiler';

type ActiveTab = 'sequencer' | 'code';

interface PersistedState {
  bpm: number;
  tracks: Track[];
  turns: { role: 'user' | 'assistant'; content: string }[];
}

export interface SessionStore {
  tracks: Track[];
  bpm: number;
  isPlaying: boolean;
  activeTab: ActiveTab;
  currentCode: string;
  turns: { role: 'user' | 'assistant'; content: string }[];

  setTracks: (tracks: Track[]) => void;
  setBpm: (bpm: number) => void;
  setPlaying: (value: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setCurrentCode: (code: string) => void;
  toggleStep: (trackId: string, stepIndex: number) => void;
  setVolume: (trackId: string, volume: number) => void;
  toggleMute: (trackId: string) => void;
  toggleSolo: (trackId: string) => void;
  addTurn: (role: 'user' | 'assistant', content: string) => void;
  loadPattern: (pattern: TrackJSON) => void;
}

function compileCode(bpm: number, tracks: Track[]): string {
  return compileToStrudel({ bpm, tracks });
}

// Mock track: kick on steps 1, 5, 9, 13
const mockKickTrack: Track = {
  id: 'kick-1',
  name: 'Kick Test',
  tag: 'kick',
  steps: [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0] as (0 | 1)[],
  volume: 0.8,
  muted: false,
  solo: false,
};

const initialTracks: Track[] = [mockKickTrack];
const initialBpm = 138;

export const useSessionStore = create<SessionStore>()(
  devtools(
    persist(
      (set) => ({
        tracks: initialTracks,
        bpm: initialBpm,
        isPlaying: false,
        activeTab: 'sequencer',
        currentCode: compileCode(initialBpm, initialTracks),
        turns: [],

        setTracks: (tracks) =>
          set((state) => ({
            tracks,
            currentCode: compileCode(state.bpm, tracks),
          })),

        setBpm: (bpm) =>
          set((state) => ({
            bpm: Math.min(220, Math.max(60, bpm)),
            currentCode: compileCode(Math.min(220, Math.max(60, bpm)), state.tracks),
          })),

        setPlaying: (value) => set({ isPlaying: value }),
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
              track.id === trackId ? { ...track, volume: Math.max(0, Math.min(1, volume)) } : track
            );

            return {
              tracks,
              currentCode: compileCode(state.bpm, tracks),
            };
          }),

        toggleMute: (trackId) =>
          set((state) => {
            const tracks = state.tracks.map((track) =>
              track.id === trackId ? { ...track, muted: !track.muted } : track
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
              return track.id === trackId ? { ...track, solo: true } : { ...track, solo: false };
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
          set({
            bpm: pattern.bpm,
            tracks: pattern.tracks,
            currentCode: compileCode(pattern.bpm, pattern.tracks),
          }),
      }),
      {
        name: 'nlmusic-session',
        partialize: (state): PersistedState => ({
          bpm: state.bpm,
          tracks: state.tracks,
          turns: state.turns,
        }),
      }
    )
  )
);
