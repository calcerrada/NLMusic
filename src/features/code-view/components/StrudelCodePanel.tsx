'use client';

import { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@store/sessionStore';
import { parseStrudelToTrackJson, type UseStrudelResult } from '@features/audio';

interface StrudelCodePanelProps {
  strudel: UseStrudelResult;
}

/**
 * Panel de código Strudel editable con sincronización bidireccional con el grid.
 *
 * Dirección Grid → Editor: cuando el LLM o el usuario modifica un paso,
 * `currentCode` cambia en el store y el editor se actualiza si no está enfocado.
 *
 * Dirección Editor → Grid: los cambios del usuario se evalúan con un debounce de 600 ms;
 * si el código es parseable, el grid se actualiza; si no, el grid pasa a "modo código".
 *
 * @param strudel - Resultado de `useStrudel` — expone `play()` para evaluar el código.
 *
 * @see BR-009 Editor y grid sincronizados bidireccionalmente
 * @see EC-006 Código inválido → error inline no bloqueante, audio anterior intacto
 */
export function StrudelCodePanel({ strudel }: StrudelCodePanelProps) {
  const currentCode = useSessionStore((s) => s.currentCode);
  const tracks = useSessionStore((s) => s.tracks);
  const isPlaying = useSessionStore((s) => s.isPlaying);
  const setManualCode = useSessionStore((s) => s.setManualCode);
  const syncCodePattern = useSessionStore((s) => s.syncCodePattern);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [localCode, setLocalCode] = useState(currentCode);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // BR-009: sync editor from store when not focused (grid/LLM changed the code)
  useEffect(() => {
    if (!isFocused) {
      setLocalCode(currentCode);
      setCodeError(null);
    }
  }, [currentCode, isFocused]);

  /**
   * Gestiona la edición manual del código Strudel.
   *
   * Aplica un debounce de 600 ms antes de evaluar para evitar evaluaciones en cada tecla.
   * Si el código es válido y parseable, sincroniza el grid (BR-009).
   * Si el código es válido pero no parseable, marca el grid como "modo código".
   * Si el código es inválido, muestra un error inline sin interrumpir el audio (EC-006, BR-001).
   *
   * @see BR-009 Cambio en editor → actualiza grid si el código es parseable
   * @see EC-006 Error de Strudel → informar sin romper el audio anterior
   */
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newCode = e.target.value;
    setLocalCode(newCode);
    setCodeError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const parsedPattern = parseStrudelToTrackJson(newCode, tracks);

        // BR-009 / EC-006: evaluar el código sin reiniciar el audio si está en pausa
        await strudel.play(newCode, isPlaying);

        if (parsedPattern) {
          // BR-009: código parseable → sincronizar el grid con los nuevos pasos
          syncCodePattern(parsedPattern, newCode);
          return;
        }

        // BR-009: código válido pero no parseable → marcar grid como "modo código"
        setManualCode(newCode);
      } catch (err) {
        // EC-006: capturar error, informar al usuario, mantener el audio anterior (BR-001)
        setCodeError(err instanceof Error ? err.message : 'Error de sintaxis en el código');
      }
    }, 600);
  }

  const lines = localCode.split('\n');
  const rows = Math.max(3, lines.length);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let rafId = 0;
    let frame = 0;
    const draw = () => {
      frame += 1;
      const width = canvas.clientWidth;
      const height = canvas.height;
      if (canvas.width !== width) canvas.width = width;
      context.clearRect(0, 0, width, height);
      context.strokeStyle = 'rgba(0,255,200,0.5)';
      context.lineWidth = 1.5;
      context.beginPath();
      for (let x = 0; x < width; x += 1) {
        const angle = (x + frame * 2) * 0.03;
        const y = height / 2 + Math.sin(angle) * 10;
        if (x === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
      rafId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-5 py-5">
      <div className="flex flex-col gap-2">
        <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="flex">
            {/* line numbers */}
            <div
              className="select-none px-3 py-3 text-right text-[12px] leading-6 font-medium text-[var(--text-muted)] border-r border-[var(--border)]"
              aria-hidden="true"
            >
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* BR-009: editable textarea */}
            <textarea
              value={localCode}
              rows={rows}
              onChange={handleChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              className="flex-1 resize-none overflow-hidden bg-transparent px-3 py-3 text-[12px] leading-6 font-medium text-[var(--text)] outline-none"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
              aria-label="Código Strudel editable"
            />
          </div>
        </div>

        {/* EC-006: inline error — non-blocking, disappears when code is valid again */}
        {codeError && (
          <div
            role="alert"
            className="rounded-[6px] border border-[rgba(255,68,102,0.3)] bg-[rgba(255,68,102,0.06)] px-3 py-2"
          >
            <p className="text-[11px] text-[var(--red)]">⚠ {codeError}</p>
          </div>
        )}
      </div>

      <div className="scope-wrap rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-2">
        <canvas ref={canvasRef} className="scope-canvas w-full" height={50} />
      </div>
    </div>
  );
}
