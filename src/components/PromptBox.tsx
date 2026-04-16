'use client';

import { useState } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useGeneratePattern } from '@/lib/hooks/useGeneratePattern';
import { Button } from './primitives/Button';
import { TextInput } from './primitives/TextInput';

export function PromptBox() {
  const [input, setInput] = useState('');
  const isGenerating = useSessionStore((s) => s.isGenerating);
  const { generate } = useGeneratePattern();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    try {
      await generate(input);
      setInput('');
    } catch {
      // Error already handled and visible via store
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <TextInput
        type="text"
        placeholder="Ej: kick 909 en 4x4..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isGenerating}
      />
      <Button
        type="submit"
        variant="primary"
        disabled={isGenerating || !input.trim()}
        loading={isGenerating}
      >
        Generar
      </Button>
    </form>
  );
}
