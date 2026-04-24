'use client';

import type { Track } from '@lib/types';
import { useSessionStore } from '@store/sessionStore';
import { Sequencer } from './Sequencer';
import { VolumeSlider } from './VolumeSlider';

interface TrackCardProps {
  track: Track;
  activeStep: number;
}

/**
 * Tarjeta de pista con controles locales de mezcla y eliminación.
 * La eliminación delega al store sin confirmación para mantener la acción destructiva.
 *
 * @see BR-007 Eliminar pista es irreversible y no solicita confirmación
 * @see EC-007/EC-008 Si es la última pista, el store transiciona a IDLE
 */
export function TrackCard({ track, activeStep }: TrackCardProps) {
  const toggleMute = useSessionStore((s) => s.toggleMute);
  const toggleSolo = useSessionStore((s) => s.toggleSolo);
  const deleteTrack = useSessionStore((s) => s.deleteTrack);
  const tag = track.tag ?? 'perc';

  return (
    <article
      className={[
        'rounded-[8px] border bg-[var(--surface)] p-3 transition-all',
        track.solo ? 'border-[var(--amber)]' : 'border-[var(--border)] hover:border-[rgba(255,255,255,0.12)]',
        track.muted ? 'opacity-45' : 'opacity-100',
      ].join(' ')}
    >
      <div className="mb-3 flex min-h-[38px] items-center justify-between gap-3 py-1">
        <span className="text-[12px] font-semibold text-[var(--text)]">{track.name}</span>

        <span className="rounded-[999px] border border-[var(--border)] px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[var(--text-dim)]">
          {tag}
        </span>

        <div className="flex items-center gap-2">
          <VolumeSlider trackId={track.id} volume={track.volume} />
          <button
            type="button"
            className={[
              'h-7 w-7 rounded-[4px] border text-[11px] font-semibold transition-all',
              track.muted
                ? 'border-[var(--red)] bg-[var(--red)] text-white'
                : 'border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] hover:border-[var(--border-active)]',
            ].join(' ')}
            onClick={() => toggleMute(track.id)}
          >
            M
          </button>
          <button
            type="button"
            className={[
              'h-7 w-7 rounded-[4px] border text-[11px] font-semibold transition-all',
              track.solo
                ? 'border-[var(--amber)] bg-[var(--amber)] text-black'
                : 'border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] hover:border-[var(--border-active)]',
            ].join(' ')}
            onClick={() => toggleSolo(track.id)}
          >
            S
          </button>
          {/* BR-007: destructivo e irreversible, sin confirmación */}
          <button
            type="button"
            aria-label={`Eliminar pista ${track.name}`}
            className={[
              'h-7 w-7 rounded-[4px] border text-[14px] leading-none font-semibold transition-all',
              'border-[var(--border)] bg-[var(--surface2)] text-[var(--text-muted)] hover:border-[var(--red)] hover:text-[var(--red)]',
            ].join(' ')}
            onClick={() => deleteTrack(track.id)}
          >
            ✕
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
