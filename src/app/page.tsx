'use client';

import { TransportBar } from '@features/transport';
import { TrackZone } from '@features/sequencer';
import { StrudelCodePanel } from '@features/code-view';
import { PromptBox } from '@features/prompt';
import { useSessionStore } from '@store/sessionStore';
import { useStrudel } from '@features/audio';

export default function Home() {
  // Single useStrudel instance — passed down to avoid double-init
  const strudel = useStrudel();
  const activeTab = useSessionStore((s) => s.activeTab);
  const setActiveTab = useSessionStore((s) => s.setActiveTab);

  // EC-010: el banner de error ocupa ~64px adicionales sobre la TransportBar
  const contentPaddingTop = strudel.initError ? 128 : 64;

  return (
    <main className="relative min-h-screen bg-bg">
      <TransportBar strudel={strudel} />

      {/* EC-010: banner persistente no cerrable — sin Strudel la app no es funcional */}
      {strudel.initError && (
        <div
          className="fixed left-0 right-0 z-[55] border-b border-[rgba(255,68,102,0.3)] bg-[rgba(255,68,102,0.08)]"
          style={{ top: 58 }}
          role="alert"
          aria-live="assertive"
        >
          <div className="mx-auto flex max-w-[1100px] items-start gap-3 px-5 py-3">
            <span className="mt-0.5 text-[16px] leading-none text-[var(--red)]">⚠</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[var(--red)]">
                Motor de audio no disponible
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text-dim)] break-words">
                {strudel.initError} — Recarga la página o prueba con otro navegador.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="shrink-0 rounded-[6px] border border-[rgba(255,68,102,0.5)] bg-[rgba(255,68,102,0.15)] px-3 py-1.5 text-[11px] text-[var(--red)] transition-colors hover:bg-[rgba(255,68,102,0.25)]"
            >
              Recargar
            </button>
          </div>
        </div>
      )}

      <div
        className="mx-auto flex h-screen max-w-[1100px] flex-col pb-[124px]"
        style={{ paddingTop: contentPaddingTop }}
      >
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
          {activeTab === 'sequencer' ? <TrackZone /> : <StrudelCodePanel strudel={strudel} />}
        </section>
      </div>

      <PromptBox motorAvailable={!strudel.initError} />
    </main>
  );
}
