'use client';

import { useSessionStore } from '@/lib/store/sessionStore';
import { TrackLane } from './TrackLane';

export function Sequencer() {
  const { tracks } = useSessionStore();

  return (
    <div className="flex flex-col gap-4 bg-dark-50 p-4 rounded">
      <h2 className="text-sm font-bold uppercase">Secuenciador</h2>
      <div className="space-y-2">
        {tracks.map((track) => (
          <TrackLane key={track.id} track={track} />
        ))}
      </div>
    </div>
  );
}
