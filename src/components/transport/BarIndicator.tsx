'use client';

import { useBeatClock } from '@/hooks/useBeatClock';

export function BarIndicator() {
  const { beat } = useBeatClock();

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Bar</span>
      {Array.from({ length: 4 }).map((_, index) => {
        const stateClass =
          index < beat
            ? 'bg-[rgba(0,255,200,0.2)]'
            : index === beat
              ? 'bg-[var(--cyan)] shadow-[0_0_8px_rgba(0,255,200,0.5)]'
              : 'bg-[rgba(255,255,255,0.06)]';

        return (
          <span
            key={index}
            className={`h-2 w-7 rounded-[2px] transition-all ${stateClass}`}
          />
        );
      })}
    </div>
  );
}
