'use client';

import { useSessionStore } from '@/lib/store/sessionStore';
import { RangeSlider } from './primitives/RangeSlider';
import { Card } from './primitives/Card';

export function BpmControl() {
  const bpm = useSessionStore((s) => s.bpm);
  const updateBpm = useSessionStore((s) => s.updateBpm);

  return (
    <Card>
      <RangeSlider
        id="bpm-slider"
        label="BPM"
        min={60}
        max={220}
        step={1}
        value={bpm}
        onChange={(e) => updateBpm(parseInt(e.target.value, 10))}
        displayValue={String(bpm)}
        title="Ajustar tempo"
      />
    </Card>
  );
}
