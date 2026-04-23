"use client";

import { useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { usePatternGen } from "../hooks/usePatternGen";

interface PromptBoxProps {
  motorAvailable?: boolean;
}

/**
 * Caja de entrada de prompts musicales en lenguaje natural.
 *
 * Se deshabilita completamente cuando el motor de audio no está disponible,
 * mostrando un placeholder y tooltip que explican la causa (EC-010).
 * Envío con Enter; Shift+Enter inserta salto de línea (BR-010).
 * No llama al LLM si el prompt está vacío (BR-010).
 *
 * @see BR-010 Prompt vacío — no se llama al LLM
 * @see EC-010 Motor no disponible — toda la entrada deshabilitada
 */
export function PromptBox({ motorAvailable = true }: PromptBoxProps) {
  const [prompt, setPrompt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { generate, isLoading, error, info } = usePatternGen();

  // EC-010: bloquear toda la entrada cuando el motor de audio falló
  const inputDisabled = isLoading || !motorAvailable;
  const disabledReason = !motorAvailable
    ? 'Motor de audio no disponible. Recarga la pagina o prueba otro navegador.'
    : undefined;

  const resize = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "20px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 80)}px`;
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || inputDisabled) {
      return;
    }

    const ok = await generate(prompt);
    if (ok) {
      setPrompt("");
    }
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "20px";
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
        <div
          title={disabledReason}
          className={[
            "prompt-wrap flex items-end gap-3 rounded-[10px] border bg-[var(--surface2)] px-3 py-2",
            !motorAvailable
              ? "border-[rgba(255,68,102,0.3)] opacity-50 cursor-not-allowed"
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
            <SendHorizontal
              size={16}
              strokeWidth={1.5}
              className="text-current"
            />
          </button>
        </div>

        <p className="mt-2 text-[9px] text-[var(--text-muted)]">
          <span className="text-[rgba(0,255,200,0.6)]">Enter</span> para enviar
          · <span className="text-[rgba(0,255,200,0.6)]">Shift+Enter</span>{" "}
          nueva línea
        </p>
        {error ? (
          <p className="mt-1 text-[10px] text-[var(--red)]">{error}</p>
        ) : null}
        {info ? (
          <p className="mt-1 text-[10px] text-[var(--amber)]">{info}</p>
        ) : null}
      </div>
    </div>
  );
}
