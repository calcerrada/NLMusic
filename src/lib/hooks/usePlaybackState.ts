'use client';

import { useSessionStore } from '../store/sessionStore';

export function usePlaybackState() {
  const isGenerating = useSessionStore((s) => s.isGenerating);
  const error = useSessionStore((s) => s.error);
  const strudelCode = useSessionStore((s) => s.strudelCode);
  const bpm = useSessionStore((s) => s.bpm);

  return { isGenerating, error, strudelCode, bpm };
}
