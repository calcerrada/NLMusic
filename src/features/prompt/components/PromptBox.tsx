"use client";

import { useRef, useState } from "react";
import { SendHorizontal, TriangleAlert, RotateCcw } from "lucide-react";
import { usePatternGen } from "../hooks/usePatternGen";
import { useSessionStore } from "@store/sessionStore";

interface PromptBoxProps {
  motorAvailable?: boolean;
}

/**
 * Entrada principal de prompts con soporte de error no bloqueante y reintento.
 * Conserva el texto del usuario cuando la generación falla y solo limpia en éxito.
 *
 * @param motorAvailable - Indica si el motor Strudel está disponible para aceptar input.
 * @see BR-003 Error uniforme con opción de reintento y estado previo intacto
 * @see EC-001 Error de respuesta inválida mantiene prompt para corregir/reintentar
 */
// BR-010: Enter envía, Shift+Enter nueva línea — prompt vacío no llama al LLM
// EC-010: motor no disponible → toda la entrada deshabilitada
// BR-003: estado ERROR → banner no bloqueante + botón Reintentar
export function PromptBox({ motorAvailable = true }: PromptBoxProps) {
  const [prompt, setPrompt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { generate, retry, isLoading, error, info } = usePatternGen();
  const uiState = useSessionStore((s) => s.uiState);

  const isError = uiState === "error";
  const inputDisabled = isLoading || !motorAvailable;
  const disabledReason = !motorAvailable
    ? "Motor de audio no disponible. Recarga la pagina o prueba otro navegador."
    : undefined;

  const resize = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "20px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 80)}px`;
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || inputDisabled) return;
    const ok = await generate(prompt);
    // BR-003: el prompt solo se limpia cuando la operación termina correctamente.
    if (ok) {
      setPrompt("");
      const textarea = textareaRef.current;
      if (textarea) textarea.style.height = "20px";
    }
  };

  return (
    <div
      className="border-t border-[var(--border)] bg-[var(--surface)]"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        boxShadow: "0 -8px 24px rgba(0,0,0,0.35)",
      }}
    >
      <div className="mx-auto max-w-[1100px] px-5 py-4">
        {/* BR-003: banner de error no bloqueante con opción de reintento */}
        {isError && error ? (
          <div className="mb-2 flex items-center gap-2 rounded-[7px] border border-[rgba(255,68,102,0.3)] bg-[rgba(255,68,102,0.07)] px-3 py-2">
            <TriangleAlert size={13} className="shrink-0 text-[var(--red)]" />
            <span className="flex-1 text-[11px] text-[var(--text-dim)]">
              {error}
            </span>
            <button
              type="button"
              onClick={retry}
              disabled={isLoading}
              className="flex items-center gap-1 rounded-[5px] border border-[rgba(255,68,102,0.4)] bg-[rgba(255,68,102,0.12)] px-2 py-1 text-[10px] text-[var(--red)] transition-colors hover:bg-[rgba(255,68,102,0.2)] disabled:opacity-40"
            >
              <RotateCcw size={10} strokeWidth={2} />
              Reintentar
            </button>
          </div>
        ) : null}

        <div
          title={disabledReason}
          className={[
            "prompt-wrap flex items-end gap-3 rounded-[10px] border bg-[var(--surface2)] px-3 py-2",
            !motorAvailable
              ? "border-[rgba(255,68,102,0.3)] opacity-50 cursor-not-allowed"
              : isError
                ? "border-[rgba(255,68,102,0.3)] focus-within:border-[rgba(255,68,102,0.5)]"
                : "border-[var(--border)] focus-within:border-[var(--border-active)] focus-within:shadow-[0_0_0_3px_rgba(0,255,200,0.06)]",
          ].join(" ")}
        >
          <textarea
            disabled={inputDisabled}
            title={disabledReason}
            ref={textareaRef}
            className="prompt-input max-h-[80px] min-h-[20px] flex-1 resize-none bg-transparent text-[13px] leading-[1.35] text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none disabled:cursor-not-allowed"
            placeholder={
              motorAvailable
                ? "Ej: kick 909 en 4x4 techno oscuro, añade snare en los tiempos 2 y 4…"
                : "Motor de audio no disponible — recarga la página"
            }
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onInput={resize}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
          />

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={inputDisabled || !prompt.trim()}
            title={disabledReason}
            className="h-[34px] w-[34px] rounded-[7px] border border-[var(--border-active)] bg-[rgba(0,255,200,0.12)] text-[var(--cyan)] transition-all hover:bg-[rgba(0,255,200,0.2)] hover:shadow-[0_0_10px_rgba(0,255,200,0.32)] disabled:opacity-45"
            aria-label="Enviar prompt"
          >
            <SendHorizontal size={16} strokeWidth={1.5} className="text-current" />
          </button>
        </div>

        <p className="mt-2 text-[9px] text-[var(--text-muted)]">
          <span className="text-[rgba(0,255,200,0.6)]">Enter</span> para enviar
          · <span className="text-[rgba(0,255,200,0.6)]">Shift+Enter</span>{" "}
          nueva línea
        </p>
        {!isError && info ? (
          <p className="mt-1 text-[10px] text-[var(--amber)]">{info}</p>
        ) : null}
      </div>
    </div>
  );
}
