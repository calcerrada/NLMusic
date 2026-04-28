'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@store/sessionStore';
import { parseStrudelToTrackJson, type UseStrudelResult } from '@features/audio';

// CodeMirror touches document/window at init — must be client-only
const StrudelEditor = dynamic(
  () => import('./StrudelEditor').then((m) => m.StrudelEditor),
  { ssr: false },
);

interface StrudelCodePanelProps {
  strudel: UseStrudelResult;
}

/**
 * Valida si el texto puede compilarse como JavaScript antes de invocar a Strudel.
 * Evita mostrar errores tardíos del motor cuando el problema ya era sintáctico en el editor.
 *
 * @param code - Código Strudel escrito por el usuario.
 * @returns Mensaje de error de sintaxis o `null` cuando el texto es parseable.
 * @see EC-006 El editor informa errores inline sin alterar el audio previo.
 */
function getSyntaxErrorMessage(code: string): string | null {
  try {
    // EC-006: evita evaluate cuando el código no es parseable por JS/Strudel.
    // Strudel usa sintaxis basada en JavaScript, así que este guard es seguro.
    // eslint-disable-next-line no-new-func
    new Function(code);
    return null;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return error.message;
    }
    return null;
  }
}

/**
 * Panel de código Strudel con editor CodeMirror 6 y sincronización bidireccional.
 *
 * Grid → Editor: cuando el LLM o el usuario modifica un paso, `currentCode` cambia
 * en el store y el editor se actualiza si no está enfocado.
 *
 * Editor → Grid: los cambios del usuario se evalúan con un debounce de 600 ms;
 * si el código es parseable, el grid se actualiza; si no, se entra en "modo código".
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [localCode, setLocalCode] = useState(currentCode);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // BR-009: si el usuario no está escribiendo, reflejamos cambios externos del grid o del LLM.
  useEffect(() => {
    if (!isFocused) {
      setLocalCode(currentCode);
      setCodeError(null);
    }
  }, [currentCode, isFocused]);

  /**
   * Recibe el código crudo del editor en cada tecla y aplica el debounce de 600 ms.
   * Misma lógica que el textarea anterior — sólo el origen del evento cambió.
   *
   * @see BR-009 Cambio en editor → actualiza grid si el código es parseable
   * @see EC-006 Error de Strudel → informar sin romper el audio anterior
   * @see BR-001 El audio nunca se interrumpe
   */
  function handleEditorChange(newCode: string) {
    setLocalCode(newCode);
    setCodeError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const syntaxError = getSyntaxErrorMessage(newCode);
        if (syntaxError) {
          setCodeError(`Error de sintaxis: ${syntaxError}`);
          return;
        }

        const parsedPattern = parseStrudelToTrackJson(newCode, tracks);

        // EC-010: con motor no funcional, el editor permanece editable pero no evalúa.
        if (strudel.initError) {
          setCodeError(strudel.initError);

          if (parsedPattern) {
            syncCodePattern(parsedPattern, newCode);
            return;
          }

          setManualCode(newCode);
          return;
        }

        // EC-006: evaluar el código; Strudel lanzará si la sintaxis es inválida
        await strudel.play(newCode, isPlaying);

        if (parsedPattern) {
          // BR-009: código parseable → sincronizar el grid
          syncCodePattern(parsedPattern, newCode);
          return;
        }

        // BR-009: código válido pero no parseable → marcar grid como "modo código"
        setManualCode(newCode);
      } catch (err) {
        // EC-006: capturar error, informar, mantener el audio anterior (BR-001)
        setCodeError(err instanceof Error ? err.message : 'Error de sintaxis en el código');
      }
    }, 600);
  }

  // Visualización decorativa independiente del estado del editor.
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
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-5 py-5">
      <div className="flex flex-col gap-2">
        {/* BR-009: editor cliente-only para no romper el SSR de Next.js. */}
        <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <StrudelEditor
            value={localCode}
            onChange={handleEditorChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            ariaLabel="Código Strudel editable"
          />
        </div>

        {/* EC-006: error inline no bloqueante; desaparece cuando el código vuelve a ser válido. */}
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
