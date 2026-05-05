'use client';

import { useSessionStore } from '@store/sessionStore';
import type { UseStrudelResult } from '@features/audio';
import { SystemStatus } from './SystemStatus';
import { PromptGuide } from './PromptGuide';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { EditorPreferences } from './EditorPreferences';

interface ConfigTabProps {
  strudel: UseStrudelResult;
}

/**
 * Orquesta la pestaña Configuración/Guía y conecta ejemplos con el flujo principal.
 * Inserta prompts sugeridos en el draft global sin disparar generación automática.
 *
 * @see BR-010 Prefill de prompt no implica llamada al LLM
 */
export function ConfigTab({ strudel }: ConfigTabProps) {
  const setActiveTab = useSessionStore((s) => s.setActiveTab);
  const setPromptDraft = useSessionStore((s) => s.setPromptDraft);

  /**
   * Copia un ejemplo al PromptBox y devuelve al usuario a la vista de secuenciador.
   * Mantiene el control de envio en Enter/click, sin auto-submit desde la guia.
   *
   * @see BR-010 Solo un submit explicito debe invocar al LLM
   */
  function handleExampleClick(text: string) {
    setPromptDraft(text);
    setActiveTab('sequencer');
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-5 py-5">
      <SystemStatus strudel={strudel} />
      <PromptGuide onExampleClick={handleExampleClick} />
      <KeyboardShortcuts />
      <EditorPreferences />
    </div>
  );
}
