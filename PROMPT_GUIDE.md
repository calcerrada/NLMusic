# Prompt Guide — Craft better drum patterns

This guide helps you write prompts that generate the drum patterns you want.

## Effective Prompt Formula

```
[BPM/tempo] + [drum pattern] + [atmosphere/style] + [optional: modifiers]
```

### Examples

#### Minimal (works, but generic)
- "kick and snare"
- "four on the floor"
- "simple beat"

#### Better (specific + style)
- "kick 909 oscuro en 4x4, snare penetrante"
- "drum and bass: rápido, kick doble, breakbeats"
- "techno hipnótico 138 BPM, hi-hat cerrado contínuo"

#### Best (instrument + pattern + atmosphere)
- "bombo grave 808, snare agudo en 2 y 4, hi-hat abierto-cerrado, estilo acid house 120 BPM"
- "minimal techno: bombo seco sin reverb, hihat 16avo oscilante, compresión de bombo"
- "dark ambient drum: bongos, hi-hat reverberado, pads de fondo"

---

## Key elements

### Drums (samples in Strudel)
- `bd` / `kick` / `bombo` — Bass drum
- `sd` / `snare` / `snare` — Snare
- `hh` / `hihat` / `hi-hat cerrado` — Closed hi-hat
- `oh` / `open-hat` — Open hi-hat
- `cp` / `clap` — Clap
- `tom` / `tomtom` — Tom

### Timing patterns
- `4x4` / `four on the floor` — Kick on every beat
- `syncopado` — Offbeat kicks
- `breakbeats` — Complex hi-hat patterns
- `half-time` — Slower perceived tempo (drums play in half)
- `double-time` — Faster hi-hats

### Style descriptors
- **Genres:** techno, house, drum and bass, minimal, ambient, breakcore
- **Moods:** dark, hypnotic, energetic, funk, soulful, industrial
- **Effects:** dry, reverb, compressed, filtered, sidechain

### Modifiers (future v1+)
- Volume/dynamics: "quiet kick", "loud snare"
- Variations: "alternate every 8 bars"
- Effects: "kick with sidechain", "snare with reverb"

---

## Tips for good results

1. **Start simple.** One element at a time.
   - ❌ "complex drum break with 5 layers"
   - ✅ "kick 909, snare on 2 and 4"

2. **Use style + pattern, not just description.**
   - ❌ "sounds cool"
   - ✅ "industrial, sparse kicks, busy hi-hat"

3. **Reference BPM or tempo.**
   - ❌ "fast beat"
   - ✅ "140 BPM, drum and bass feel"

4. **Use drum names the LLM knows.**
   - ❌ "crash cymbal, ride, kick pedal"
   - ✅ "hi-hat, kick, clap"

5. **Iterative refinement works.**
   - Prompt: "kick 4x4 with snare"
   - See result
   - Next: "same but hihat adds energy"
   - Refine until happy

---

## Iteration workflow

```
1. Send rough idea
   "techno 138 BPM"
   ↓
2. Check result in sequencer
   → "Too simple, needs more texture"
   ↓
3. Refine prompt
   "techno 138 BPM, kick steady, hihat 16avo"
   ↓
4. Edit manually if needed
   Click steps, toggle mute/solo, adjust volume
   ↓
5. Click Play, jam over it
   (or export for DAW)
```

---

## Advanced prompts (test these)

- **Polyrhythmic:** "kick en 3, hihat en 4, snare en 5"
- **Sidechain:** "kick drives the mix, compressing everything"
- **Breakbeat:** "70s drum solo sampled, repetido, 160 BPM"
- **Minimalism:** "solo bombo seco, casi vacío, desolado"
- **Funk:** "snare anticipado, kick swung, hihat cerrado percusivo"

---

## If generation fails

- The system falls back to a hardcoded 138 BPM kick/snare/hihat pattern
- Check browser console for error details
- Try a simpler prompt (fewer requirements)
- Verify `ANTHROPIC_API_KEY` is set in `.env.local`

---

## See also

- [nlmusic-spec.md](./nlmusic-spec.md) — Full product spec
- [TESTING.md](./TESTING.md) — QA checklist
- [README.md](./README.md) — Setup & architecture
