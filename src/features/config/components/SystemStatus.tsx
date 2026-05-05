'use client';

import { useSessionStore } from '@store/sessionStore';
import type { UseStrudelResult } from '@features/audio';

interface SystemStatusProps {
  strudel: UseStrudelResult;
}

/**
 * Renderiza un snapshot de estado operativo para diagnostico rapido en vivo.
 * Expone readiness del motor, BPM actual y ocupacion de pistas sin side effects.
 *
 * @see BR-006 Limite de 5 pistas visible para el usuario
 * @see EC-010 Estado del motor refleja si la app puede reproducir audio
 */
export function SystemStatus({ strudel }: SystemStatusProps) {
  const bpm = useSessionStore((s) => s.bpm);
  const tracks = useSessionStore((s) => s.tracks);

  return (
    <section>
      <h2 className="mb-3 text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
        Estado del sistema
      </h2>
      <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface2)] px-4 py-3 flex flex-col gap-2">
        <StatusRow label="Motor de audio">
          <span className={strudel.isReady ? 'text-[var(--cyan)]' : 'text-[var(--text-dim)]'}>
            {strudel.isReady ? '● Listo' : '○ No iniciado'}
          </span>
        </StatusRow>
        <StatusRow label="LLM">
          <span className="font-[JetBrains_Mono,monospace] text-[var(--text-dim)]">
            claude-sonnet-4-6
          </span>
        </StatusRow>
        <StatusRow label="BPM actual">
          <span className="font-[JetBrains_Mono,monospace] text-[var(--text-dim)]">{bpm}</span>
        </StatusRow>
        <StatusRow label="Pistas activas">
          <span
            className={[
              // BR-006: enfatiza visualmente cuando se alcanza el maximo permitido.
              'font-[JetBrains_Mono,monospace]',
              tracks.length >= 5 ? 'text-[var(--amber)]' : 'text-[var(--text-dim)]',
            ].join(' ')}
          >
            {tracks.length} / 5
          </span>
        </StatusRow>
      </div>
    </section>
  );
}

function StatusRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[12px] text-[var(--text-muted)]">{label}</span>
      <span className="text-[12px]">{children}</span>
    </div>
  );
}
