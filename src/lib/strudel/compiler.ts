import type { Track, TrackJSON } from "../llm/types.js";

function stepsToPattern(sample: string, steps: number[]): string {
  return steps.map((step) => (step === 1 ? sample : "~")).join(" ");
}

function trackToCode(track: Track): string {
  const pattern = stepsToPattern(track.sample, track.steps);
  const gain = track.muted ? 0 : track.volume;
  return `s(\"${pattern}\").gain(${gain.toFixed(2)})`;
}

export function compileToStrudel(trackJson: TrackJSON): string {
  const soloed = trackJson.tracks.filter((t) => t.solo && !t.muted);
  const activeTracks = soloed.length > 0 ? soloed : trackJson.tracks.filter((t) => !t.muted);

  const codeBlocks = activeTracks.map(trackToCode);
  const stackCode = codeBlocks.length > 0 ? `stack(${codeBlocks.join(", ")})` : 'silence';

  // Strudel often maps CPM roughly as BPM/2 for common 16-step drum loops.
  return `${stackCode}.setcpm(${(trackJson.bpm / 2).toFixed(2)})`;
}
