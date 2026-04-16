# Hook Patterns

Detailed reference for writing and using custom React hooks in this codebase.

---

## Rules

1. **Business logic belongs in hooks.** Components render; hooks act.
2. **One responsibility per hook.** Don't mix audio control with API calls.
3. **Hooks manage their own error via the store** — no local `useState` for errors visible to the user.
4. **Wrap async functions in `useCallback`** to keep referential stability.
5. **Hooks must not import other hooks from the same tier.** Hooks can import from the store; they should not chain each other unless clearly composing.

---

## useGeneratePattern

Encapsulates the full lifecycle of a pattern generation request: fetch, validation, store update, error handling.

```typescript
// src/lib/hooks/useGeneratePattern.ts
'use client';

import { useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';
import type { TrackJSON } from '../llm/types';

interface GeneratePatternResponse {
  success: boolean;
  trackJson?: TrackJSON;
  usedFallback?: boolean;
  error?: string;
}

export function useGeneratePattern() {
  const { setGenerating, setError, addTurn, loadPattern, turns } =
    useSessionStore();

  const generate = useCallback(
    async (prompt: string): Promise<GeneratePatternResponse | undefined> => {
      if (!prompt.trim()) {
        setError('Prompt vacío');
        return;
      }

      setError(null);
      setGenerating(true);

      try {
        const res = await fetch('/api/generate-pattern', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            context: { turns, previous: null, language: 'mixed' },
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }

        const result: GeneratePatternResponse = await res.json();

        if (result.trackJson) {
          loadPattern(result.trackJson);
          addTurn({
            prompt,
            responseSummary: `BPM: ${result.trackJson.bpm}, ${result.trackJson.tracks.length} pistas`,
            timestampISO: new Date().toISOString(),
          });
        }

        if (result.usedFallback) {
          setError(`Fallback: ${result.error}`);
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [turns] // setGenerating, setError, addTurn, loadPattern are stable refs from Zustand
  );

  return { generate };
}
```

**In component:**
```typescript
export function PromptBox() {
  const [input, setInput] = useState('');
  const { generate } = useGeneratePattern();
  const isGenerating = useSessionStore((s) => s.isGenerating);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await generate(input);
      setInput('');
    } catch {
      // Error already handled and visible via store
    }
  };
  // ...
}
```

---

## useTrackActions

Scoped actions for a single track. Avoids passing `trackId` through multiple levels or destructuring the whole store.

```typescript
// src/lib/hooks/useTrackActions.ts
'use client';

import { useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';

export function useTrackActions(trackId: string) {
  const store = useSessionStore();

  const toggleMute = useCallback(
    () => store.toggleTrackMute(trackId),
    [store, trackId]
  );

  const toggleSolo = useCallback(
    () => store.toggleTrackSolo(trackId),
    [store, trackId]
  );

  const setVolume = useCallback(
    (volume: number) => store.updateTrackVolume(trackId, volume),
    [store, trackId]
  );

  const toggleStep = useCallback(
    (idx: number, value: 0 | 1) => store.updateTrackStep(trackId, idx, value),
    [store, trackId]
  );

  return { toggleMute, toggleSolo, setVolume, toggleStep };
}
```

**In component:**
```typescript
export function TrackLane({ track }: { track: Track }) {
  const { toggleMute, toggleSolo, setVolume, toggleStep } =
    useTrackActions(track.id);
  // ...
}
```

---

## usePlaybackState

Selector hook. Avoids destructuring the entire store when you only need playback-related state. Zustand calls this efficiently — only re-renders when the selected slice changes.

```typescript
// src/lib/hooks/usePlaybackState.ts
'use client';

import { useSessionStore } from '../store/sessionStore';

export function usePlaybackState() {
  return useSessionStore((s) => ({
    isGenerating: s.isGenerating,
    error: s.error,
    strudelCode: s.strudelCode,
    bpm: s.bpm,
  }));
}
```

**In component:**
```typescript
export function PlaybackControls() {
  const { strudelCode, isGenerating } = usePlaybackState();
  const { isPlaying, play, stop, initialized } = useStrudel();
  // ...
}
```

---

## useStrudel

Controls the Strudel audio runtime. Manages CDN initialization state and exposes a stable `play/stop/reset` API.

Key behaviors:
- Polls for `window.strudel` or `window.Strudel` after CDN load (interval, 500ms)
- Falls back to `initialized = true` after 10s timeout to avoid blocking UI
- `play(code)` calls `window.strudel.evaluate(code)` when available
- `stop()` calls `window.strudel.stop()` when available

See full implementation → `src/lib/hooks/useStrudel.ts`

---

## Pattern: Loading + Error in one hook

When a hook needs both loading state and error, delegate both to the global store rather than local state. This avoids error messages disappearing when the component unmounts.

```typescript
// ✅ Delegate to store — error survives component lifecycle
export function useMyAsyncAction() {
  const { setError } = useSessionStore();

  const doSomething = useCallback(async () => {
    try {
      // ...
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      throw err;
    }
  }, [setError]);

  return { doSomething };
}

// ❌ Local state — error lost on unmount/re-render
export function useMyAsyncAction() {
  const [error, setError] = useState<string | null>(null);
  // ...
}
```

---

## Pattern: Avoiding stale closures

When your `useCallback` depends on mutable store state (like `turns`), include it in the dependency array. Zustand store action functions (`setGenerating`, `setError`, etc.) are stable refs — safe to omit from deps.

```typescript
// ✅ turns is mutable — include it
const generate = useCallback(async (prompt: string) => {
  // uses `turns` from outer scope
}, [turns]);

// ✅ Store actions are stable — can omit or include, no difference
const save = useCallback(() => {
  setGenerating(true); // stable ref
}, []); // ok to omit setGenerating
```

---

## Anti-patterns

### ❌ Fetch logic directly in a component

```typescript
// ❌ Not reusable, hard to test
export function PromptBox() {
  const handleSubmit = async () => {
    const res = await fetch('/api/generate-pattern', { ... });
    const data = await res.json();
    loadPattern(data.trackJson);
    addTurn({ ... });
    setGenerating(false);
  };
}
```

### ❌ Side effects in render

```typescript
// ❌ Runs every render
export function MyComponent() {
  useSessionStore().setError(null); // BAD
  // ...
}
```

### ❌ Chaining hooks unnecessarily

```typescript
// ❌ Overcomplicates control flow
export function usePlayback() {
  const { generate } = useGeneratePattern(); // ← different concern
  const { play } = useStrudel();
  // ...
}
```

---

## Testing hooks

```typescript
import { renderHook, act } from '@testing-library/react';
import { useGeneratePattern } from '@/lib/hooks/useGeneratePattern';

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, trackJson: mockTrackJson }),
  })
) as jest.Mock;

test('generate calls loadPattern on success', async () => {
  const { result } = renderHook(() => useGeneratePattern());

  await act(async () => {
    await result.current.generate('kick 4x4');
  });

  // Assert store was updated via loadPattern
  // (requires wrapping in a ZustandProvider or using the real store in tests)
});

test('generate rejects on empty prompt', async () => {
  const { result } = renderHook(() => useGeneratePattern());

  await act(async () => {
    const res = await result.current.generate('');
    expect(res).toBeUndefined(); // returns early
  });
});
```
