'use client';

import { useSessionStore } from '@store/sessionStore';
import { useBeatClock } from '@features/audio';
import { TrackCard } from './TrackCard';

/**
 * Muestra las pistas activas y el contador de ocupación del secuenciador.
 * El contador permanece visible incluso en empty state para comunicar el límite global.
 *
 * @see BR-006 Máximo 5 pistas visibles en el secuenciador
 * @see EC-004 Al llegar a 5, el contador destaca el límite alcanzado
 */
export function TrackZone() {
  const tracks = useSessionStore((s) => s.tracks);
  const { step } = useBeatClock();
  const atLimit = tracks.length >= 5;

  if (tracks.length === 0) {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        {/* BR-006: el contador sigue visible aunque todavía no existan pistas. */}
        <div className="flex items-center justify-end px-5 pt-3 pb-1">
          <span
            className="text-[10px] uppercase tracking-[0.1em]"
            style={{ color: atLimit ? 'var(--amber)' : 'var(--text-muted)' }}
          >
            Pistas: {tracks.length} / 5
          </span>
        </div>
        <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 opacity-25 pointer-events-none">
          <span className="text-[28px]">◈</span>
          <p className="text-[11px] tracking-[0.08em] text-[var(--text-dim)]">Describe tu patrón abajo para empezar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* EC-004: alcanzar 5 pistas cambia el contador a amber para señalar el límite. */}
      <div className="flex items-center justify-end px-5 pt-3 pb-1">
        <span
          className="text-[10px] uppercase tracking-[0.1em]"
          style={{ color: atLimit ? 'var(--amber)' : 'var(--text-muted)' }}
        >
          Pistas: {tracks.length} / 5
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-[10px] px-5 pb-5">
        {tracks.map((track) => (
          <TrackCard key={track.id} track={track} activeStep={step} />
        ))}
      </div>
    </div>
  );
}
