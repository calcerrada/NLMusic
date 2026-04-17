'use client';

import { useMemo } from 'react';

interface MiniWaveformProps {
  tag: string;
  seed: string;
}

function seededBars(seed: string): number[] {
  let value = 0;
  for (let index = 0; index < seed.length; index += 1) {
    value = (value * 31 + seed.charCodeAt(index)) % 2147483647;
  }

  return Array.from({ length: 32 }).map((_, index) => {
    value = (value * 48271 + index * 17) % 2147483647;
    return 4 + (value % 15);
  });
}

function colorByTag(tag: string): string {
  if (tag === 'kick') return 'var(--cyan)';
  if (tag === 'snare') return 'var(--amber)';
  if (tag === 'hihat') return 'var(--violet)';
  return 'var(--text-dim)';
}

export function MiniWaveform({ tag, seed }: MiniWaveformProps) {
  const bars = useMemo(() => seededBars(seed), [seed]);
  const color = colorByTag(tag);

  return (
    <div className="flex items-end gap-px opacity-40">
      {bars.map((height, index) => (
        <span
          key={`${seed}-${index}`}
          className="w-[2px] rounded-sm"
          style={{
            height: `${height}px`,
            backgroundColor: color,
          }}
        />
      ))}
    </div>
  );
}
