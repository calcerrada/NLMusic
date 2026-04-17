interface CompilableTrack {
  sample?: string;
  tag?: string;
  steps: number[];
  volume: number;
  muted: boolean;
  solo: boolean;
}

interface CompilableTrackJson {
  bpm: number;
  tracks: CompilableTrack[];
}

function stepsToPattern(sample: string, steps: number[]): string {
  return steps.map((step) => (step === 1 ? sample : "~")).join(" ");
}

function resolveSample(track: CompilableTrack): string {
  if (track.sample) {
    return track.sample;
  }

  if (track.tag === 'kick') return 'bd';
  if (track.tag === 'snare') return 'sd';
  if (track.tag === 'hihat') return 'hh';
  if (track.tag === 'clap') return 'cp';
  return 'perc';
}

// Temporal contract:
// - cpm(bpm) sets 1 cycle = 1 quarter note (negra) at the given BPM
// - Our 16-step sequencer = 16 sixteenth notes = 4 quarter notes = 1 bar
// - .slow(4) stretches 16 elements across 4 cycles (4 beats = 1 bar)
// - Result: each element = 1 sixteenth note, properly timed

function trackToCode(track: CompilableTrack): string {
  const pattern = stepsToPattern(resolveSample(track), track.steps as number[]);
  const gain = track.muted ? 0 : track.volume;
  return `s("${pattern}").gain(${gain.toFixed(2)})`;
}

export function compileToStrudel(trackJson: CompilableTrackJson): string {
  const soloed = trackJson.tracks.filter((t) => t.solo && !t.muted);
  const activeTracks = soloed.length > 0 ? soloed : trackJson.tracks.filter((t) => !t.muted);

  const codeBlocks = activeTracks.map(trackToCode);
  const stackCode = codeBlocks.length > 0 ? `stack(${codeBlocks.join(", ")})` : 'silence';

  return `${stackCode}.slow(4).cpm(${trackJson.bpm.toFixed(2)})`;
}
