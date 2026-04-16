'use client';

import type { Track } from '@/lib/llm/types';
import { useTrackActions } from '@/lib/hooks/useTrackActions';
import { IconButton } from './primitives/IconButton';
import { RangeSlider } from './primitives/RangeSlider';

interface TrackLaneProps {
  track: Track;
}

export function TrackLane({ track }: TrackLaneProps) {
  const { toggleMute, toggleSolo, setVolume, toggleStep } =
    useTrackActions(track.id);

  return (
    <div className="flex items-center gap-2 p-2 bg-dark rounded border border-gray-700">
      {/* Track info */}
      <div className="w-24 flex-shrink-0">
        <div className="text-xs font-bold">{track.name}</div>
        <div className="text-xs text-gray-500">{track.sample}</div>
      </div>

      {/* 16-step grid */}
      <div className="flex gap-1 flex-1">
        {track.steps.map((step, idx) => (
          <button
            key={idx}
            onClick={() => toggleStep(idx, step === 1 ? 0 : 1)}
            className={[
              'w-6 h-6 text-xs font-bold transition rounded',
              step === 1
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-600 hover:bg-gray-700',
            ].join(' ')}
            title={`Paso ${idx + 1}`}
          >
            {step === 1 ? '■' : '□'}
          </button>
        ))}
      </div>

      {/* Volume */}
      <div className="flex-shrink-0 w-28">
        <RangeSlider
          min={0}
          max={1}
          step={0.05}
          value={track.volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          displayValue={`${Math.round(track.volume * 100)}%`}
          title="Volumen"
        />
      </div>

      {/* Mute / Solo */}
      <div className="flex-shrink-0 flex gap-1">
        <IconButton
          active={track.muted}
          activeClassName="bg-red-900 text-red-200"
          onClick={toggleMute}
          title="Mute"
        >
          M
        </IconButton>
        <IconButton
          active={track.solo}
          activeClassName="bg-green-900 text-green-200"
          onClick={toggleSolo}
          title="Solo"
        >
          S
        </IconButton>
      </div>
    </div>
  );
}