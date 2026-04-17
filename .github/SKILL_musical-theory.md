# Musical Theory & Temporal Contracts for NLMusic

## Core Concepts

### Rhythmic Subdivisions
In 4/4 time, one bar (compás) contains:
- **4 quarter notes** (negras) = 1 bar
- **8 eighth notes** (corcheas) = 1 bar
- **16 sixteenth notes** (semicorcheas) = 1 bar

### NLMusic's Temporal Contract
**NLMusic uses a 16-step sequencer where each step = 1 sixteenth note (semicorchea) in 4/4 time.**

This means:
- The sequencer has 16 clickable steps (0-15)
- These represent the 16 sixteenth notes that fit in one 4/4 bar
- Steps 0, 4, 8, 12 align with quarter note boundaries
- Steps 1, 5, 9, 13 are the "and-of" beats (off-grid but within 4/4)

### Time Calculations

**Duration of one sixteenth note:**
$$\text{duration\_ms} = \frac{60000}{\text{bpm} \times 4}$$

**Example at 138 BPM:**
$$\text{duration\_ms} = \frac{60000}{138 \times 4} = \frac{60000}{552} ≈ 108.7 \text{ ms}$$

So at 138 BPM, each sequencer step advances every ~109ms.

**Duration of one bar (4 quarter notes / 16 sixteenth notes):**
$$\text{bar\_duration} = \frac{60000 \times 4}{\text{bpm} \times 4} = \frac{60000}{\text{bpm}}$$

At 138 BPM: $\frac{60000}{138} ≈ 434.8$ ms per bar (full cycle through all 16 steps)

## UI-to-Audio Mapping

### The Contract
- **UI Clock** (`useBeatClock.ts`): Advances one step every `60000 / (bpm * 4)` ms
- **Strudel Code**: Receives 16 pattern elements, distributed naturally across one cycle at `cpm(bpm)`
- **Result**: Each sequencer step triggers at the exact time Strudel plays that pattern element

### Code Generation
The compiler creates:
```typescript
stack(
  s("~ bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ bd ~ ~").gain(0.80)
).cpm(138.00)
```

Where:
- Each character (including `~` for silence) = 1 pattern element = 1 sequencer step
- 16 characters = 16 steps = 1 full cycle
- `.cpm(138)` = cycles per minute (NOT beats per minute)
- Each cycle = one bar = all 16 steps

### Example: Kick on Steps 1, 5, 9, 13
```
Step:    0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
Pattern: ~  bd ~  ~  ~  bd ~  ~  ~  bd ~  ~  ~  bd ~  ~
Time:    0  109 218 327 437 546 655 764 873 982 1091 1200 1309 1418 1527 1636 (ms at 138 BPM)
```

The kick fires at ~109ms, ~546ms, ~982ms, ~1418ms — exactly when the cursor reaches those steps.

## Strudel / TidalCycles Concepts

### What is `cpm()`?
- `cpm` = "cycles per minute"
- A **cycle** in Strudel is one complete playback of the pattern
- `cpm(138)` = 138 cycles per minute → **1 cycle = 1 quarter note (negra)**
- This means `cpm(bpm)` maps 1 cycle to 1 beat, NOT 1 bar

### Why `.slow(4)` is required with 16 elements
- Our 16-step sequencer represents 1 bar = 4 beats = 16 sixteenth notes
- With `cpm(138)`, 1 cycle = 1 beat (0.435s)
- Without `.slow()`: all 16 elements crammed into 1 beat (0.435s) → rapid fire!
- With `.slow(4)`: 16 elements spread across 4 beats (1 bar) → correct timing

**Example:**
```
s("bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~").slow(4).cpm(138)
```
- 16 elements ÷ `.slow(4)` = 4 elements per cycle per beat
- Each element = 1 sixteenth note = 60000/(138×4) ≈ 109ms ✓

### Equivalent notations
These produce the SAME audio:
```
s("bd ~ ~ ~").cpm(138)                                    // 4 elements, 1 beat
s("bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~").slow(4).cpm(138) // 16 elements, 1 bar
```
The difference: 16 elements allows addressing individual sixteenth notes across the full bar.

### Pattern Notation
In Strudel, patterns use space-separated symbols:
```
s("bd sd hh clap").cpm(120)  // 4 sounds per cycle
s("~ bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ bd ~ ~").cpm(138)  // 16 steps per cycle
```

Each space-separated symbol = 1 step.

## Implementation Rules for NLMusic

1. **UI clock interval:** `60000 / (bpm * 4)` ms per step (1 sixteenth note)
2. **Strudel output:** Always `.slow(4).cpm(bpm)` with 16 pattern elements
3. **16 elements = 16 sequencer steps = 1 bar = 4 beats × 4 sixteenths**
4. **`.slow(4)` is MANDATORY** — it stretches 16 elements across 4 cycles (4 beats)
5. **Never use `.slow(16)`** — that stretches across 16 beats = 4 bars (way too slow)
6. **Never omit `.slow()`** — without it, 16 elements play in 1 beat (way too fast)
7. **Test:** Kick on steps 0,4,8,12 = four-on-the-floor = kick every quarter note

## Debugging Checklist

If audio and UI aren't synchronized:
- [ ] Check `useBeatClock` interval: should be `60000 / (bpm * 4)`, not `60000 / bpm`
- [ ] Check Strudel code: should have NO `.slow()`, only `.cpm(bpm)`
- [ ] Count pattern elements: should be exactly 16 (including `~` for silence)
- [ ] Verify BPM range: 60-220 BPM (UI constraints), same value sent to `.cpm()`
- [ ] Test: Press play, listen to kick on step 1, check if cursor position matches sound

## Musical Context (for LLM Prompts)

When generating patterns from natural language, help the LLM understand:
- "Kick en los pasos 1, 5, 9, 13" = kick on every 4th sixteenth note starting from step 1 (quarter note grid)
- "Snare en el 2 y 4" = snare on steps 4 and 12 (the "2 and 4" in 4/4 music)
- "Hi-hat abierto cada corchea" = hi-hat on even steps: 0, 2, 4, 6, 8, 10, 12, 14
- "Patrón rápido" = more steps enabled (more frequent triggers)
- "Patrón lento" = fewer steps enabled (sparser pattern)
