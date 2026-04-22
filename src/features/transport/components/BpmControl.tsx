'use client';

import { Plus, Minus } from 'lucide-react';
import { useSessionStore } from '@store/sessionStore';

export function BpmControl() {
  const bpm = useSessionStore((s) => s.bpm);
  const setBpm = useSessionStore((s) => s.setBpm);

  return (
    <div className="flex items-center gap-4 mr-3">
      <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--text-muted)]">BPM</span>
      <button
        type="button"
        className="h-[22px] w-[22px] rounded-[4px] border border-[var(--border)] text-[var(--text)] transition-colors hover:border-[var(--border-active)] hover:text-[var(--cyan)]"
        onClick={() => setBpm(bpm - 1)}
      >
        <Minus size={14} strokeWidth={2} className="text-current" />
      </button>
      <span className="min-w-12 text-center text-[22px] font-bold leading-none text-[var(--text)]">{bpm}</span>
      <button
        type="button"
        className="h-[22px] w-[22px] rounded-[4px] border border-[var(--border)] text-[var(--text)] transition-colors hover:border-[var(--border-active)] hover:text-[var(--cyan)]"
        onClick={() => setBpm(bpm + 1)}
      >
        <Plus size={14} strokeWidth={2} className="text-current" />
      </button>
    </div>
  );
}
