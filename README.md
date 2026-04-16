# NLMusic — Live coding drums with natural language

Convert natural language descriptions into live drum patterns in the browser, powered by Claude and Strudel.

**Status:** MVP (v0.1) — Core workflow complete, testing in progress.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Environment setup

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-... # Your Anthropic API key
ANTHROPIC_MODEL=claude-sonnet-4-6
NLMUSIC_DEFAULT_BPM=138
```

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How to use

1. **Enter a prompt** in the text box (e.g., "kick 909 en 4x4 techno, hi-hat cerrado y snare")
2. **Click "Generar"** — the LLM generates a drum pattern
3. **See the sequencer update** with the new pattern
4. **Click "Play"** to hear the pattern (requires Strudel CDN to load)
5. **Edit manually** by clicking steps, adjusting volume, or toggling mute/solo
6. **Adjust BPM** with the slider

---

## Architecture

```
NL Prompt
    ↓
LLMProvider (Claude adapter)
    ↓
Validation (Zod schema)
    ↓
Strudel Compiler (16-step tracks → code)
    ↓
Zustand Store (state sync)
    ↓
React Components (UI render)
    ↓
Strudel.cc (WebAudio API → 🔊)
```

---

## Project structure

- `src/lib/llm/` — LLM adapter pattern (Claude, interface for swapping providers)
- `src/lib/validation/` — Zod schema for TrackJSON validation
- `src/lib/strudel/` — Compiler from 16-step tracks to Strudel code
- `src/lib/store/` — Zustand state management
- `src/lib/hooks/` — useStrudel hook for audio runtime
- `src/components/` — React UI (PromptBox, Sequencer, TrackLane, etc.)
- `app/` — Next.js App Router
- `app/api/generate-pattern/` — API endpoint (POST)

---

## Available scripts

```bash
npm run dev          # Development server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # TypeScript & ESLint check
npm run check        # Type check only
npm run v0:cli       -- "prompt"  # Test v0 pipeline from CLI
npm run v0:test                   # Run v0 test harness (20 prompts)
```

---

## Testing

See [TESTING.md](./TESTING.md) for detailed testing checklist.

Quick validation:

```bash
# E2E prompt → API → store → audio
npm run dev
# Open http://localhost:3000 and test in browser

# Direct API test
curl -X POST http://localhost:3000/api/generate-pattern \
  -H "Content-Type: application/json" \
  -d '{"prompt":"bombo 909","context":{}}'
```

---

## Stack

| Layer | Tech | Purpose |
|-------|------|---------|
| **Frontend** | React 19 + Next.js 16 | Web UI, API routes |
| **State** | Zustand | Track state + localStorage sync |
| **Styling** | Tailwind CSS 4 | Dark theme UI |
| **Audio** | Strudel.cc | TidalCycles in browser |
| **LLM** | Claude Sonnet 4-6 | NL → pattern generation |
| **Validation** | Zod | Schema enforcement |
| **Deployment** | Vercel | Zero-config hosting |

---

## Known limitations (v0.1)

- Strudel audio playback requires CDN to load completely
- BeatCursor animation is client-side (not synced to real audio clock yet)
- No real-time code editing UI
- No export/share functionality (v1)
- Fallback pattern is hardcoded (no LLM retry)

---

## Next milestones

- **v0.2:** Beat cursor sync with Strudel clock, Strudel API debugging
- **v0.3:** Code editor view (edit Strudel code directly), export WAV
- **v1:** Melodies, effects, UI LLM selection, persistence

---

## For developers

### Adapter pattern for LLM

All LLM calls go through the `LLMProvider` interface:

```typescript
interface LLMProvider {
  generatePattern(prompt: string, context: SessionContext): Promise<TrackJSON>
}
```

Implementations: `ClaudeAdapter`, (future: `OpenAIAdapter`, `OllamaAdapter`)

To swap providers: edit `app/api/generate-pattern/route.ts` line with `new ClaudeAdapter()`.

### Validation

TrackJSON is validated by `src/lib/validation/trackSchema.ts`:

```typescript
bpm: 60-220
tracks: 1-8
steps per track: exactly 16 (binary)
volume: 0-1
```

### Strudel code generation

See `src/lib/strudel/compiler.ts` for the 16-step track → Strudel pattern conversion.

Example:
```json
{ "steps": [1,0,0,0, 1,0,0,0, ...], "sample": "bd", "volume": 0.9 }
```
→ `s("bd ~ ~ ~ bd ~ ~ ~ ...").gain(0.9)`

---

## License

Open source, personal use focus (April 2026).

---

## Inspiration

- **Strudel.cc** — TidalCycles in the browser
- **Algorave** — Live coding + performance
- **Claude** — Conversational AI for music


This is intentionally v0 only (no web UI yet). Next step is building the MVP shell (Next.js + API route + Zustand + Strudel runtime in browser).
