'use client';

import { useSessionStore } from '../store/sessionStore';

export function usePlaybackState() {
  return useSessionStore((s) => ({
    isGenerating: s.isGenerating,
    error: s.error,
    strudelCode: s.strudelCode,
    bpm: s.bpm,
  }));
}
