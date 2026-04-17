'use client';

import { useRef, useState } from 'react';
import { usePatternGen } from '../hooks/usePatternGen';

export function PromptBox() {
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { generate, isLoading, error } = usePatternGen();

  const resize = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = '20px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 80)}px`;
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || isLoading) {
      return;
    }

    await generate(prompt);
    setPrompt('');
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '20px';
    }
  };

  return (
    <div
      className="border-t border-[var(--border)] bg-[var(--surface)]"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        boxShadow: '0 -8px 24px rgba(0,0,0,0.35)',
      }}
    >
      <div className="mx-auto max-w-[1100px] px-5 py-4">
        <div className="prompt-wrap flex items-end gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 focus-within:border-[var(--border-active)] focus-within:shadow-[0_0_0_3px_rgba(0,255,200,0.06)]">
          <textarea
            ref={textareaRef}
            className="prompt-input max-h-[80px] min-h-[20px] flex-1 resize-none bg-transparent text-[13px] leading-[1.35] text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none"
            placeholder="Ej: kick 909 en 4x4 techno oscuro, añade snare en los tiempos 2 y 4…"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onInput={resize}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
          />

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isLoading || !prompt.trim()}
            className="h-[34px] w-[34px] rounded-[7px] border border-[var(--border-active)] bg-[rgba(0,255,200,0.12)] text-[var(--cyan)] transition-all hover:bg-[rgba(0,255,200,0.2)] hover:shadow-[0_0_10px_rgba(0,255,200,0.32)] disabled:opacity-45"
            aria-label="Enviar prompt"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-4 w-4"
              aria-hidden="true"
            >
              <path
                d="M5 12H19M19 12L13.5 6.5M19 12L13.5 17.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <p className="mt-2 text-[9px] text-[var(--text-muted)]">
          <span className="text-[rgba(0,255,200,0.6)]">Enter</span> para enviar · <span className="text-[rgba(0,255,200,0.6)]">Shift+Enter</span> nueva línea
        </p>
        {error ? <p className="mt-1 text-[10px] text-[var(--red)]">{error}</p> : null}
      </div>
    </div>
  );
}
