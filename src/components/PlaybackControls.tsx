'use client';

import { usePlaybackState } from '@/lib/hooks/usePlaybackState';
import { useStrudel } from '@/lib/hooks/useStrudel';
import { Button } from './primitives/Button';
import { Card } from './primitives/Card';

export function PlaybackControls() {
  const { strudelCode, isGenerating } = usePlaybackState();
  const { isPlaying, play, stop, initialized, error: strudelError } = useStrudel();

  const handlePlay = async () => {
    if (!strudelCode) return;
    await play(strudelCode);
  };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button
          variant="success"
          onClick={handlePlay}
          disabled={!initialized || isGenerating || isPlaying}
          title="Reproducir patrón de Strudel"
        >
          ▶ Play
        </Button>
        <Button
          variant="danger"
          onClick={stop}
          disabled={!initialized || !isPlaying}
          title="Detener reproducción"
        >
          ⏹ Stop
        </Button>
      </div>

      {strudelError && (
        <p className="text-xs text-red-400">⚠ {strudelError}</p>
      )}

      <p className="text-xs text-gray-500">
        {!initialized
          ? '⏳ Inicializando Strudel...'
          : isPlaying
            ? '▶ En reproducción'
            : '⏸ Detenido'}
      </p>
    </Card>
  );
}