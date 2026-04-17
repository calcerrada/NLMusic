'use client';

import { TransportBar } from '@features/transport';
import { TrackZone } from '@features/sequencer';
import { StrudelCodePanel } from '@features/code-view';
import { PromptBox } from '@features/prompt';
import { useSessionStore } from '@store/sessionStore';

export default function Home() {
  const activeTab = useSessionStore((s) => s.activeTab);
  const setActiveTab = useSessionStore((s) => s.setActiveTab);

  return (
    <main className="relative min-h-screen bg-bg">
      <TransportBar />

      <div className="mx-auto flex h-screen max-w-[1100px] flex-col pt-[64px] pb-[124px]">
        <div className="flex h-[42px] items-end gap-1 border-b border-[var(--border)] bg-[var(--surface)] px-5">
          <button
            type="button"
            onClick={() => setActiveTab('sequencer')}
            className={[
              'rounded-t-[8px] border border-b-0 px-4 py-2 text-[11px] uppercase tracking-[0.12em] transition-all',
              activeTab === 'sequencer'
                ? 'border-[var(--border-active)] bg-[rgba(0,255,200,0.08)] text-[var(--cyan)]'
                : 'border-transparent bg-transparent text-[var(--text-dim)] hover:text-[var(--text)]',
            ].join(' ')}
          >
            Sequencer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={[
              'rounded-t-[8px] border border-b-0 px-4 py-2 text-[11px] uppercase tracking-[0.12em] transition-all',
              activeTab === 'code'
                ? 'border-[var(--border-active)] bg-[rgba(0,255,200,0.08)] text-[var(--cyan)]'
                : 'border-transparent bg-transparent text-[var(--text-dim)] hover:text-[var(--text)]',
            ].join(' ')}
          >
            Strudel Code
          </button>
        </div>

        <section className="min-h-0 flex-1 overflow-hidden">
          {activeTab === 'sequencer' ? <TrackZone /> : <StrudelCodePanel />}
        </section>
      </div>

      <PromptBox />
    </main>
  );
}
