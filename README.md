# NLMusic v0 (technical validation)

This repository now includes the first implementation slice for the v0 pipeline:

Natural language prompt -> LLM adapter -> validated TrackJSON -> compiled Strudel code.

## Implemented

- `LLMProvider` interface and `ClaudeAdapter`
- Strict JSON schema validation with Zod
- Strudel compiler from 16-step tracks
- Deterministic fallback pattern when generation fails
- CLI entrypoint for local testing

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set your key:

```bash
ANTHROPIC_API_KEY=your_key_here
```

## Run

Run with Claude:

```bash
npm run start -- "un kick 909 en 4x4 y hihat cerrado"
```

Run in fallback mode (no API key):

```bash
npm run start:fallback -- "kick 4x4 techno"
```

Type-check:

```bash
npm run check
```

## Current scope

This is intentionally v0 only (no web UI yet). Next step is building the MVP shell (Next.js + API route + Zustand + Strudel runtime in browser).
