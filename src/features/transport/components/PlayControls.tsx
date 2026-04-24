'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Square } from 'lucide-react';
import { useSessionStore } from '@store/sessionStore';
import type { UseStrudelResult } from '@features/audio';

interface PlayControlsProps {
  strudel: UseStrudelResult;
  disabled?: boolean;
  disabledReason?: string;
}

/**
 * Controles de reproducción (Play / Stop).
 *
 * Cuando `disabled` es true, los botones no responden a clics y muestran
 * un tooltip con `disabledReason` explicando el motivo (EC-010).
 * El cambio de código se aplica en el siguiente ciclo sin interrumpir
 * el loop en curso (BR-001).
 *
 * @see BR-001 El audio nunca se interrumpe — actualiza en el siguiente ciclo
 * @see EC-010 Motor no disponible — botones deshabilitados con tooltip
 */
export function PlayControls({ strudel, disabled = false, disabledReason }: PlayControlsProps) {
  const { play, stop, isReady } = strudel;
  const isPlaying = useSessionStore((s) => s.isPlaying);
  const setPlaying = useSessionStore((s) => s.setPlaying);
  const currentCode = useSessionStore((s) => s.currentCode);
  const [stopFlash, setStopFlash] = useState(false);
  const syncedCode = useRef('');
  const prevIsPlayingRef = useRef(isPlaying);

  // EC-007/EC-008: detener audio cuando isPlaying cae a false externamente
  // (ej. se elimina la última pista) — BR-001 safe porque hush() es idempotente
  useEffect(() => {
    if (prevIsPlayingRef.current && !isPlaying) {
      stop();
      syncedCode.current = '';
    }
    prevIsPlayingRef.current = isPlaying;
  }, [isPlaying, stop]);

  useEffect(() => {
    if (!isPlaying || !isReady || !currentCode || syncedCode.current === currentCode) {
      return;
    }

    syncedCode.current = currentCode;
    void play(currentCode);
  }, [currentCode, isPlaying, isReady, play]);

  const handlePlayToggle = async () => {
    // EC-010: no-op si el motor no está disponible
    if (disabled) {
      return;
    }
    if (!isReady || !currentCode) {
      return;
    }

    if (isPlaying) {
      stop();
      setPlaying(false);
      syncedCode.current = '';
      return;
    }

    try {
      syncedCode.current = currentCode;
      await play(currentCode);
      setPlaying(true);
    } catch {
      syncedCode.current = '';
    }
  };

  const handleStop = () => {
    // EC-010: no-op si el motor no está disponible
    if (disabled) {
      return;
    }
    setStopFlash(true);
    stop();
    setPlaying(false);
    syncedCode.current = '';

    window.setTimeout(() => setStopFlash(false), 200);
  };

  return (
    <div className="flex items-center gap-3 mr-3">
      <button
        type="button"
        aria-label="Stop"
        title={disabledReason}
        disabled={disabled}
        onClick={handleStop}
        className={[
          'h-12 w-12 rounded-[6px] border text-[15px] leading-none transition-all',
          stopFlash
            ? 'border-[var(--cyan)] bg-[rgba(0,255,200,0.16)] text-[var(--cyan)]'
            : 'border-[var(--border)] bg-transparent text-[var(--text)] hover:border-[var(--border-active)]',
          disabled ? 'cursor-not-allowed opacity-70 hover:border-[var(--border)]' : '',
        ].join(' ')}
      >
        <Square size={16} strokeWidth={1.5} className="text-current" />
      </button>

      <button
        type="button"
        aria-label="Play"
        title={disabledReason}
        disabled={disabled}
        onClick={() => void handlePlayToggle()}
        className={[
          'h-12 w-12 rounded-[6px] border text-[15px] leading-none transition-all',
          isPlaying
            ? 'border-[var(--cyan)] bg-[rgba(0,255,200,0.12)] text-[var(--cyan)] shadow-[0_0_8px_rgba(0,255,200,0.35)]'
            : 'border-[var(--border)] bg-transparent text-[var(--text)] hover:border-[var(--border-active)]',
          disabled ? 'cursor-not-allowed opacity-70 hover:border-[var(--border)]' : '',
        ].join(' ')}
      >
        <Play size={16} strokeWidth={1.5} className="text-current" />
      </button>
    </div>
  );
}
