'use client';

import { useSessionStore } from '@/store/sessionStore';
import { useBeatClock } from '@/hooks/useBeatClock';
import { TrackCard } from './TrackCard';

export function TrackZone() {
  const tracks = useSessionStore((s) => s.tracks);
  const { step } = useBeatClock();

  if (tracks.length === 0) {
    return (
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 opacity-25 pointer-events-none">
        <span className="text-[28px]">◈</span>
        <p className="text-[11px] tracking-[0.08em] text-[var(--text-dim)]">Describe tu patrón abajo para empezar</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-[10px] overflow-y-auto px-5 py-5">
      {tracks.map((track) => (
        <TrackCard key={track.id} track={track} activeStep={step} />
      ))}
    </div>
  );
}
