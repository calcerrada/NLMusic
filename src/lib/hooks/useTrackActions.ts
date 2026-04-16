'use client';

import { useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';

export function useTrackActions(trackId: string) {
  const store = useSessionStore();

  const toggleMute = useCallback(
    () => store.toggleTrackMute(trackId),
    [store, trackId]
  );

  const toggleSolo = useCallback(
    () => store.toggleTrackSolo(trackId),
    [store, trackId]
  );

  const setVolume = useCallback(
    (volume: number) => store.updateTrackVolume(trackId, volume),
    [store, trackId]
  );

  const toggleStep = useCallback(
    (idx: number, value: 0 | 1) => store.updateTrackStep(trackId, idx, value),
    [store, trackId]
  );

  return { toggleMute, toggleSolo, setVolume, toggleStep };
}
