'use client';

import { Plus, Minus } from 'lucide-react';
import { useSessionStore } from '@store/sessionStore';

interface BpmControlProps {
  disabled?: boolean;
  disabledReason?: string;
}

/**
 * Control de BPM con botones + y −.
 *
 * Cuando `disabled` es true, los botones no responden y muestran
 * `disabledReason` como tooltip, bloqueando cambios de tempo
 * mientras el motor de audio no está disponible (EC-010).
 *
 * @see EC-010 Motor no disponible — controles de tempo deshabilitados
 */
export function BpmControl({ disabled = false, disabledReason }: BpmControlProps) {
  const bpm = useSessionStore((s) => s.bpm);
  const setBpm = useSessionStore((s) => s.setBpm);

  return (
    <div className="flex items-center gap-4 mr-3">
      <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--text-muted)]">BPM</span>
      <button
        type="button"
        title={disabledReason}
        disabled={disabled}
        className="h-[22px] w-[22px] rounded-[4px] border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] transition-colors hover:border-[var(--border-active)] hover:text-[var(--cyan)]"
        onClick={() => setBpm(bpm - 1)}
      >
        <Minus size={14} strokeWidth={2} className="text-current" />
      </button>
      <span className="min-w-12 text-center text-[22px] font-bold leading-none text-[var(--text)]">{bpm}</span>
      <button
        type="button"
        title={disabledReason}
        disabled={disabled}
        className="h-[22px] w-[22px] rounded-[4px] border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] transition-colors hover:border-[var(--border-active)] hover:text-[var(--cyan)]"
        onClick={() => setBpm(bpm + 1)}
      >
        <Plus size={14} strokeWidth={2} className="text-current" />
      </button>
    </div>
  );
}
