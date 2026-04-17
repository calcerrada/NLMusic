'use client';

import type { Track } from '@lib/types';
import { useSessionStore } from '@store/sessionStore';
import { MiniWaveform } from './MiniWaveform';
import { Sequencer } from './Sequencer';
import { VolumeSlider } from './VolumeSlider';

interface TrackCardProps {
  track: Track;
  activeStep: number;
}

export function TrackCard({ track, activeStep }: TrackCardProps) {
  const toggleMute = useSessionStore((s) => s.toggleMute);
  const toggleSolo = useSessionStore((s) => s.toggleSolo);
  const tag = track.tag ?? 'perc';

  return (
    <article
      className={[
        'rounded-[8px] border bg-[var(--surface)] p-3 transition-all',
        track.solo ? 'border-[var(--amber)]' : 'border-[var(--border)] hover:border-[rgba(255,255,255,0.12)]',
        track.muted ? 'opacity-45' : 'opacity-100',
      ].join(' ')}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold text-[var(--text)]">{track.name}</span>

        <MiniWaveform tag={tag} seed={track.id} />

        <span className="rounded-[999px] border border-[var(--border)] px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[var(--text-dim)]">
          {tag}
        </span>

        <div className="flex items-center gap-2">
          <VolumeSlider trackId={track.id} volume={track.volume} />
          <button
            type="button"
            className={[
              'h-6 w-6 rounded-[4px] border text-[10px] font-semibold transition-all',
              track.muted
                ? 'border-[var(--red)] bg-[rgba(255,68,102,0.14)] text-[var(--red)]'
                : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-active)]',
            ].join(' ')}
            onClick={() => toggleMute(track.id)}
          >
            M
          </button>
          <button
            type="button"
            className={[
              'h-6 w-6 rounded-[4px] border text-[10px] font-semibold transition-all',
              track.solo
                ? 'border-[var(--amber)] bg-[rgba(255,170,0,0.14)] text-[var(--amber)]'
                : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-active)]',
            ].join(' ')}
            onClick={() => toggleSolo(track.id)}
          >
            S
          </button>
        </div>
      </div>

      <Sequencer
        trackId={track.id}
        steps={track.steps}
        tag={tag}
        activeStep={activeStep}
      />
    </article>
  );
}
