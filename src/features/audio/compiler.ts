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

/**
 * Compila el estado del secuenciador a código Strudel ejecutable.
 * Mantiene todas las pistas dentro de stack() y silencia con gain(0)
 * para evitar reconfiguraciones de voces al alternar mute/solo.
 *
 * @param trackJson - Patrón actual con bpm y pistas normalizadas.
 * @returns Código Strudel listo para evaluar en el motor de audio.
 * @see BR-001 El audio no se interrumpe al mutear/solear pistas
 */
export function compileToStrudel(trackJson: CompilableTrackJson): string {
  const hasSolo = trackJson.tracks.some((t) => t.solo);

  const codeBlocks = trackJson.tracks.map((track) => {
    // BR-001: muted/non-solo tracks stay in the stack with gain(0) so Strudel
    // never restructures the voice graph — avoids clicks and pops on toggle
    const silenced = track.muted || (hasSolo && !track.solo);
    const pattern = stepsToPattern(resolveSample(track), track.steps);
    const gain = silenced ? 0 : track.volume;
    return `s("${pattern}").gain(${gain.toFixed(2)})`;
  });

  const stackCode = codeBlocks.length > 0 ? `stack(${codeBlocks.join(", ")})` : 'silence';
  return `${stackCode}.slow(4).cpm(${trackJson.bpm.toFixed(2)})`;
}
