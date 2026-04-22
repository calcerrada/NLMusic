'use client';

import { useStrudel } from '@features/audio';
import { useSessionStore } from '@store/sessionStore';
import { PlayControls } from './PlayControls';
import { BpmControl } from './BpmControl';
import { BarIndicator } from './BarIndicator';

export function TransportBar() {
  const strudel = useStrudel();
  const isPlaying = useSessionStore((s) => s.isPlaying);

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
        <div
          className="flex items-center gap-3"
          style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }}
        >
          <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            NLMusic
          </span>
          <span
            className={[
              'h-[10px] w-[10px] rounded-full transition-colors',
              isPlaying
                ? 'bg-[var(--cyan)] animate-pulse-dot shadow-[0_0_8px_rgba(0,255,200,0.8)]'
                : 'bg-white/30',
            ].join(' ')}
          />
        </div>
        <PlayControls strudel={strudel} />
        <BpmControl />
        <BarIndicator />
      </div>
    </header>
  );
}
