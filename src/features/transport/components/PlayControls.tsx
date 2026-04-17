'use client';

import { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@store/sessionStore';
import type { UseStrudelResult } from '@features/audio';

interface PlayControlsProps {
  strudel: UseStrudelResult;
}

export function PlayControls({ strudel }: PlayControlsProps) {
  const { play, stop, isReady } = strudel;
  const isPlaying = useSessionStore((s) => s.isPlaying);
  const setPlaying = useSessionStore((s) => s.setPlaying);
  const currentCode = useSessionStore((s) => s.currentCode);
  const [stopFlash, setStopFlash] = useState(false);
  const syncedCode = useRef('');

  useEffect(() => {
    if (!isPlaying || !isReady || !currentCode || syncedCode.current === currentCode) {
      return;
    }

    syncedCode.current = currentCode;
    void play(currentCode);
  }, [currentCode, isPlaying, isReady, play]);

  const handlePlayToggle = async () => {
    if (!isReady || !currentCode) {
      return;
    }

    if (isPlaying) {
      stop();
      setPlaying(false);
      syncedCode.current = '';
      return;
    }

    try {
      syncedCode.current = currentCode;
      await play(currentCode);
      setPlaying(true);
    } catch {
      syncedCode.current = '';
    }
  };

  const handleStop = () => {
    setStopFlash(true);
    stop();
    setPlaying(false);
    syncedCode.current = '';

    window.setTimeout(() => setStopFlash(false), 200);
  };

  return (
    <div className="flex items-center gap-2.5">
      <span
        className={[
          'h-[5px] w-[5px] rounded-full transition-all',
          isPlaying ? 'bg-[var(--cyan)] animate-pulse-dot shadow-[0_0_8px_rgba(0,255,200,0.8)]' : 'bg-white/30',
        ].join(' ')}
      />

      <button
        type="button"
        aria-label="Stop"
        onClick={handleStop}
        className={[
          'h-7 w-7 rounded-[6px] border text-[12px] leading-none transition-all',
          stopFlash
            ? 'border-[var(--cyan)] bg-[rgba(0,255,200,0.16)] text-[var(--cyan)]'
            : 'border-[var(--border)] bg-transparent text-[var(--text)] hover:border-[var(--border-active)]',
        ].join(' ')}
      >
        ■
      </button>

      <button
        type="button"
        aria-label="Play"
        onClick={() => void handlePlayToggle()}
        className={[
          'h-7 w-7 rounded-[6px] border text-[12px] leading-none transition-all',
          isPlaying
            ? 'border-[var(--cyan)] bg-[rgba(0,255,200,0.12)] text-[var(--cyan)] shadow-[0_0_8px_rgba(0,255,200,0.35)]'
            : 'border-[var(--border)] bg-transparent text-[var(--text)] hover:border-[var(--border-active)]',
        ].join(' ')}
      >
        ▶
      </button>
    </div>
  );
}
