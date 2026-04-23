'use client';

import { useSessionStore } from '@store/sessionStore';
import type { UseStrudelResult } from '@features/audio';
import { PlayControls } from './PlayControls';
import { BpmControl } from './BpmControl';
import { BarIndicator } from './BarIndicator';

interface TransportBarProps {
  strudel: UseStrudelResult;
}

/**
 * Barra de transporte fija en la parte superior.
 *
 * Propaga `disabled` y `disabledReason` a PlayControls y BpmControl
 * cuando el motor de audio no está disponible (EC-010).
 * Muestra un indicador discreto del estado del motor junto al logotipo.
 *
 * @see EC-010 Motor no disponible — controles deshabilitados con tooltip explicativo
 */
export function TransportBar({ strudel }: TransportBarProps) {
  const hasInitError = strudel.initError !== null;
  const isPlaying = useSessionStore((s) => s.isPlaying);
  const disabledReason = hasInitError
    ? 'Motor de audio no disponible. Recarga la pagina o prueba otro navegador.'
    : undefined;

  // EC-010: indicador discreto de estado del motor junto al logo
  const engineIndicator = strudel.initError !== null
    ? <span className="text-[10px] text-[var(--red)]">✕ Error</span>
    : strudel.isReady
      ? <span className="text-[10px] text-[var(--cyan)]">● Listo</span>
      : <span className="text-[10px] text-[var(--text-dim)]">○ Iniciando…</span>;

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
          minHeight: 58,
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
          {/* Play state dot */}
          <span
            className={[
              'h-[10px] w-[10px] rounded-full transition-colors',
              isPlaying
                ? 'bg-[var(--cyan)] animate-pulse-dot shadow-[0_0_8px_rgba(0,255,200,0.8)]'
                : 'bg-white/30',
            ].join(' ')}
          />
          {/* Engine status indicator */}
          {engineIndicator}
        </div>

        <div
          aria-disabled={hasInitError}
          className={hasInitError ? 'opacity-45' : ''}
          style={{ margin: 0, padding: 0, border: 0, display: 'contents' }}
        >
          <PlayControls strudel={strudel} disabled={hasInitError} disabledReason={disabledReason} />
          <BpmControl disabled={hasInitError} disabledReason={disabledReason} />
        </div>

        <BarIndicator />
      </div>
    </header>
  );
}
