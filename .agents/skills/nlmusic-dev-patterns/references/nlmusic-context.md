# NLMusic — Project Context

Reference for understanding the specific domain, data models, and conventions in NLMusic. Use this alongside the general skill patterns when working in this codebase.

---

## Domain Model

### TrackJSON — source of truth

Everything flows from this shape: the LLM generates it, the compiler consumes it, the store persists it, and the UI reflects it.

```typescript
// src/lib/llm/types.ts
interface Track {
  id: string;           // unique, stable (e.g. "kick", "snare-01")
  name: string;         // display name
  sample: string;       // Strudel sample key: "bd", "sd", "hh", "oh", "cp"
  steps: (0 | 1)[];    // exactly 16 elements
  volume: number;       // 0–1
  muted: boolean;
  solo: boolean;
}

interface TrackJSON {
  bpm: number;          // 60–220
  tracks: Track[];      // 1–8 tracks
  strudelCode?: string; // compiled output, optional (set after compile step)
}
```

### SessionTurn

Represents one exchange between user and LLM. Used for conversational context.

```typescript
interface SessionTurn {
  prompt: string;
  responseSummary: string;  // brief description of what was generated
  timestampISO: string;     // ISO 8601
}
```

### SessionContext

Passed to the LLM on each generation request.

```typescript
interface SessionContext {
  turns: SessionTurn[];        // history of previous exchanges
  previous?: TrackJSON;        // last generated pattern (for "modify this" prompts)
  language?: 'es' | 'en' | 'mixed';
}
```

---

## Zustand Store Shape

```typescript
// src/lib/store/sessionStore.ts
interface SessionState {
  // ── State ──────────────────────────────
  bpm: number;
  tracks: Track[];
  strudelCode: string;     // compiled Strudel code, ready to evaluate
  turns: SessionTurn[];
  isGenerating: boolean;
  error: string | null;

  // ── Actions ────────────────────────────
  updateBpm: (bpm: number) => void;
  updateTracks: (tracks: Track[]) => void;
  updateStrudelCode: (code: string) => void;
  setGenerating: (v: boolean) => void;
  setError: (msg: string | null) => void;
  addTurn: (turn: SessionTurn) => void;

  // Track-level mutations
  toggleTrackMute: (id: string) => void;
  toggleTrackSolo: (id: string) => void;
  updateTrackStep: (id: string, idx: number, val: 0 | 1) => void;
  updateTrackVolume: (id: string, volume: number) => void;

  // Bulk update
  loadPattern: (pattern: TrackJSON) => void;  // sets bpm + tracks + strudelCode
  reset: () => void;
}
```

**Key behaviors:**
- `loadPattern` is the main entry point after generation — it updates BPM, tracks, and strudelCode atomically.
- `toggleTrackSolo` is exclusive: only one track can be solo at a time.
- State is persisted to `localStorage` via Zustand `persist` middleware under key `"nlmusic-session"`.

---

## API Route Contract

### POST `/api/generate-pattern`

**Request:**
```typescript
{
  prompt: string;        // user natural language input
  context: {
    turns: SessionTurn[];
    previous?: TrackJSON;
    language?: 'es' | 'en' | 'mixed';
  };
}
```

**Response (success):**
```typescript
{
  success: true;
  trackJson: TrackJSON;
  usedFallback: false;
}
```

**Response (fallback — LLM failed, safe default returned):**
```typescript
{
  success: false;
  trackJson: TrackJSON;  // hardcoded fallback pattern at 138 BPM
  usedFallback: true;
  error: string;         // reason for fallback
}
```

**Response (hard error):**
```typescript
// HTTP 400 or 500
{ error: string }
```

**Handling in `useGeneratePattern`:**
- HTTP error → throw (caught, stored in `error`)
- `usedFallback: true` → load pattern + set warning in `error`
- `success: true` → load pattern, clear `error`

---

## Strudel Integration

### Samples available

These are the sample names accepted by Strudel for drum patterns:

| Keyword | Drum |
|---------|------|
| `bd` | Bass drum / Kick |
| `sd` | Snare |
| `hh` | Closed hi-hat |
| `oh` | Open hi-hat |
| `cp` | Clap |

### Compiled Strudel code format

The compiler in `src/lib/strudel/compiler.ts` outputs patterns like:

```javascript
stack(
  s("bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~").gain(0.90),
  s("~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~").gain(0.75),
  s("hh ~ hh ~ hh ~ hh ~ hh ~ hh ~ hh ~").gain(0.55)
).setcpm(69.00)
```

Where:
- `~` represents a silent step
- `.gain(n)` sets the volume (0–1)
- `.setcpm(n)` sets cycles-per-minute = `bpm / 2`

### Runtime hook

`useStrudel` in `src/lib/hooks/useStrudel.ts` handles:
1. CDN detection (polls for `window.strudel` or `window.Strudel`)
2. 10-second fallback timeout (app stays usable without audio)
3. `play(code)` → calls `window.strudel.evaluate(code)`
4. `stop()` → calls `window.strudel.stop()`

**Caution:** Strudel's global API surface is `window.strudel` when loaded via CDN. Verify this in the browser DevTools network tab when debugging audio issues.

---

## LLM Pipeline

```
NL Prompt
    → ClaudeAdapter.generatePattern(prompt, context)
    → Anthropic API (claude-sonnet-4-6)
    → JSON response parsed
    → validateTrackJson(json)   [Zod schema]
    → compileToStrudel(json)    [step arrays → Strudel code]
    → PipelineResult { trackJson, strudelCode, usedFallback }
```

- Model is configurable via `ANTHROPIC_MODEL` env var
- Fallback triggers if: Anthropic API error, JSON parse failure, schema validation failure
- `strudelCode` is appended to `trackJson` before returning

---

## Component ↔ Store Contract

| Component | Reads from store | Writes to store |
|-----------|-----------------|----------------|
| `PromptBox` | `isGenerating`, `turns` | via `useGeneratePattern` hook |
| `Sequencer` | `tracks` | — |
| `TrackLane` | `track` prop | via `useTrackActions` hook |
| `PlaybackControls` | `strudelCode`, `isGenerating` | — (calls `useStrudel`) |
| `BpmControl` | `bpm` | `updateBpm` |
| `BeatCursor` | `bpm` | — (local animation timer) |

---

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...       # required: Anthropic API key
ANTHROPIC_MODEL=claude-sonnet-4-6  # optional: defaults to claude-sonnet-4-6
NLMUSIC_DEFAULT_BPM=138            # optional: initial BPM (not yet wired to store init)
```

All env vars are server-side only. Never expose `ANTHROPIC_API_KEY` to the client.

---

## Naming Decisions

- **English for code** (function names, types, interfaces, variables)
- **Spanish for UI strings** (labels, placeholders, error messages visible to user)
- **Mixed in comments** is acceptable during development

```typescript
// ✅
export function useGeneratePattern() {} // English function name
setError('Prompt vacío');               // Spanish for user-facing error

// ❌ Avoid
export function usaGenerarPatron() {}   // Spanish function name
setError('Empty prompt');               // English user-facing message
```
