'use client';

import { PromptBox } from '@/components/PromptBox';
import { Sequencer } from '@/components/Sequencer';
import { PlaybackControls } from '@/components/PlaybackControls';
import { BeatCursor } from '@/components/BeatCursor';
import { BpmControl } from '@/components/BpmControl';
import { useSessionStore } from '@/lib/store/sessionStore';

export default function Home() {
  const { error } = useSessionStore();

  return (
    <main className="min-h-screen bg-dark p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">NLMusic</h1>
          <p className="text-gray-400">
            Live coding drums con lenguaje natural
          </p>
        </header>

        {/* Prompt Box */}
        <section className="mb-6">
          <PromptBox />
        </section>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-900 text-red-200 rounded text-sm">
            {error}
          </div>
        )}

        {/* BPM Control */}
        <section className="mb-6">
          <BpmControl />
        </section>

        {/* Beat Cursor */}
        <section className="mb-6">
          <BeatCursor />
        </section>

        {/* Playback Controls */}
        <section className="mb-6">
          <PlaybackControls />
        </section>

        {/* Sequencer */}
        <section className="mb-8">
          <Sequencer />
        </section>

        {/* Info */}
        <footer className="mt-8 text-xs text-gray-600">
          <p>v0.1 — MVP Technical Preview</p>
          <p className="mt-1">
            Powered by{' '}
            <a
              href="https://strudel.cc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Strudel
            </a>{' '}
            (TidalCycles in the browser)
          </p>
        </footer>
      </div>
    </main>
  );
}
