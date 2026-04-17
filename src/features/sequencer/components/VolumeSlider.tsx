'use client';

import { useSessionStore } from '@store/sessionStore';

interface VolumeSliderProps {
  trackId: string;
  volume: number;
}

export function VolumeSlider({ trackId, volume }: VolumeSliderProps) {
  const setVolume = useSessionStore((s) => s.setVolume);

  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-right text-[10px] text-[var(--text-dim)]">{Math.round(volume * 100)}%</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(volume * 100)}
        onChange={(event) => setVolume(trackId, Number(event.target.value) / 100)}
        className="volume-slider h-[2px] w-[70px]"
      />
    </div>
  );
}
