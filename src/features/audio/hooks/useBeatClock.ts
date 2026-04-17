'use client';

import { useEffect, useState } from 'react';
import { useSessionStore } from '@store/sessionStore';

interface BeatClockState {
  beat: number;
  step: number;
  isPlaying: boolean;
}

export function useBeatClock(): BeatClockState {
  const bpm = useSessionStore((s) => s.bpm);
  const isPlaying = useSessionStore((s) => s.isPlaying);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isPlaying) {
      setStep(0);
      return;
    }

    // 16 steps = 16 sixteenth notes (semicorcheas) in 4/4 time
    // Each sixteenth note = 60000 / (bpm * 4) ms
    const interval = 60000 / (bpm * 4);
    const timerId = setInterval(() => {
      setStep((prev) => (prev + 1) % 16);
    }, interval);


    return () => clearInterval(timerId);
  }, [bpm, isPlaying]);

  return {
    beat: step % 4,
    step,
    isPlaying,
  };
}

