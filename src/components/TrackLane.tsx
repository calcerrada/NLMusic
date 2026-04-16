'use client';

import { useSessionStore } from '@/lib/store/sessionStore';
import type { Track } from '@/lib/llm/types';

interface TrackLaneProps {
  track: Track;
}

export function TrackLane({ track }: TrackLaneProps) {
  const {
    updateTrackStep,
    updateTrackVolume,
    toggleTrackMute,
    toggleTrackSolo,
  } = useSessionStore();

  return (
    <div className="flex items-center gap-2 p-2 bg-dark rounded border border-gray-700">
      {/* Nombre y sample */}
      <div className="w-24 flex-shrink-0">
        <div className="text-xs font-bold">{track.name}</div>
        <div className="text-xs text-gray-500">{track.sample}</div>
      </div>

      {/* Secuenciador 16 pasos */}
      <div className="flex gap-1 flex-1">
        {track.steps.map((step, idx) => (
          <button
            key={idx}
            onClick={() =>
              updateTrackStep(track.id, idx, step === 1 ? 0 : 1)
            }
            className={`w-6 h-6 text-xs font-bold transition ${
              step === 1
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-600 hover:bg-gray-700'
            }`}
            title={`Paso ${idx + 1}`}
          >
            {step === 1 ? '■' : '□'}
          </button>
        ))}
      </div>

      {/* Fader de volumen */}
      <div className="flex-shrink-0 flex items-center gap-1">
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={track.volume}
          onChange={(e) => updateTrackVolume(track.id, parseFloat(e.target.value))}
          className="w-16"
          title="Volumen"
        />
        <span className="text-xs text-gray-500 w-8">
          {Math.round(track.volume * 100)}%
        </span>
      </div>

      {/* Mute / Solo */}
      <div className="flex-shrink-0 flex gap-1">
        <button
          onClick={() => toggleTrackMute(track.id)}
          className={`px-2 py-1 text-xs font-bold rounded transition ${
            track.muted
              ? 'bg-red-900 text-red-200'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          title="Mute"
        >
          M
        </button>
        <button
          onClick={() => toggleTrackSolo(track.id)}
          className={`px-2 py-1 text-xs font-bold rounded transition ${
            track.solo
              ? 'bg-green-900 text-green-200'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          title="Solo"
        >
          S
        </button>
      </div>
    </div>
  );
}
