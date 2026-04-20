'use client';

import { useStrudel } from '@features/audio';
import { PlayControls } from './PlayControls';
import { BpmControl } from './BpmControl';
import { BarIndicator } from './BarIndicator';

export function TransportBar() {
  const strudel = useStrudel();

  return (
    <header
      className="border-b border-[var(--border)] bg-[var(--surface)]"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
      }}
    >
      <div
        className="relative"
        style={{
          maxWidth: 1100,
          width: '100%',
          height: 58,
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
        }}
      >
        <span
          className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]"
          style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }}
        >
          NLMusic
        </span>
        <PlayControls strudel={strudel} />
        <BpmControl />
        <BarIndicator />
      </div>
    </header>
  );
}
