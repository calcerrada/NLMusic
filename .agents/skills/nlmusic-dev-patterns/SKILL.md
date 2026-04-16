---
name: nlmusic-dev-patterns
description: >
  React/TypeScript development patterns for NLMusic: component architecture,
  custom hooks for API and store logic, primitive UI components, type organization,
  and naming conventions. Use this skill when writing new components, hooks,
  refactoring existing code, or reviewing code quality.
triggers:
  - Creating or editing React components
  - Writing custom hooks (useXxx)
  - Defining TypeScript interfaces or types
  - Connecting components to Zustand store
  - Making API calls from the frontend
  - Reviewing code structure or suggesting improvements
references:
  - references/component-patterns.md
  - references/hooks-patterns.md
  - references/nlmusic-context.md
---

# NLMusic — Development Patterns

Core standards for maintaining consistency, reusability, and scalability across the codebase.

---

## Component Architecture

### Three tiers

| Tier | Location | Purpose |
|------|----------|---------|
| **Primitives** | `src/components/primitives/` | Stateless, reusable UI (Button, Input, Card) |
| **Features** | `src/components/` | Domain-specific, connected to store or hooks |
| **Pages** | `app/` | Layout + composition only — no business logic |

**Rule:** Features consume hooks. Primitives receive props only. Pages wire them together.

### Naming

```typescript
// ✅ Named export, PascalCase
export function PromptBox() {}

// ❌ Avoid default exports and arrow function components
export default function PromptBox() {}
export const PromptBox = () => {}
```

### Props interfaces

```typescript
// ✅ Explicit interface, extend HTML attributes where applicable
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

// ❌ Avoid inline prop types on complex components
export function Button({ variant, ...props }: { variant: string; [k: string]: any }) {}
```

See → [references/component-patterns.md](references/component-patterns.md)

---

## Custom Hooks

### Rules

1. **Business logic belongs in hooks, not components.**  
   API calls, async operations, derived store state — all go in `src/lib/hooks/`.

2. **One responsibility per hook.**  
   `useGeneratePattern` handles generation. `useTrackActions` handles track mutations.

3. **Hooks own their error state via the store.**  
   Throw for unrecoverable errors; use `setError` from the store for user-facing messages.

4. **`useCallback` on async functions** to prevent re-renders.

```typescript
// ✅ Hook owns the async logic
export function useGeneratePattern() {
  const { setGenerating, setError, loadPattern, turns } = useSessionStore();

  const generate = useCallback(async (prompt: string) => {
    setGenerating(true);
    setError(null);
    try {
      // ...fetch and update store
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setGenerating(false);
    }
  }, [setGenerating, setError, loadPattern, turns]);

  return { generate };
}

// ✅ Component is clean
export function PromptBox() {
  const [input, setInput] = useState('');
  const { generate } = useGeneratePattern();
  const { isGenerating } = useSessionStore();
  // ...
}
```

See → [references/hooks-patterns.md](references/hooks-patterns.md)

---

## Zustand Store

### State / Actions separation

Keep state flat. Actions are co-located in the same `create()` call but logically grouped.

```typescript
interface SessionState {
  // — State —
  bpm: number;
  tracks: Track[];
  strudelCode: string;
  isGenerating: boolean;
  error: string | null;

  // — Actions —
  updateBpm: (bpm: number) => void;
  loadPattern: (pattern: TrackJSON) => void;
  // ...
}
```

### Selector hooks over raw store access

Create thin selector hooks for related slices of state:

```typescript
// ✅ Selector hook
export function usePlaybackState() {
  return useSessionStore((s) => ({
    isGenerating: s.isGenerating,
    error: s.error,
    strudelCode: s.strudelCode,
    bpm: s.bpm,
  }));
}

// ❌ Don't destructure the entire store in every component
const { bpm, error, isGenerating, tracks, strudelCode, addTurn, ... } = useSessionStore();
```

---

## Type Organization

```
src/lib/types/
├── api.ts          # Request/response shapes for API routes
├── ui.ts           # UI-only types (variant enums, size types)
└── index.ts        # Re-exports
```

**Rule:** Domain types live in `src/lib/llm/types.ts` (Track, TrackJSON, SessionContext). API/UI types live in `src/lib/types/`.

```typescript
// ✅ Explicit, named types
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

// ❌ No Hungarian notation
export interface IButton {}
export type TButtonVariant = ...
```

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Components | PascalCase | `TrackLane.tsx` |
| Hooks | camelCase with `use` prefix | `useTrackActions.ts` |
| Type files | camelCase | `api.ts`, `ui.ts` |
| API routes | kebab-case | `/api/generate-pattern` |
| Store actions | camelCase verbs | `updateBpm`, `loadPattern` |
| Tailwind variant maps | `Record<Variant, string>` | `variantClasses[variant]` |

---

## Refactoring Checklist

When touching an existing component or adding a new one, verify:

- [ ] No fetch/async logic inside the component — moved to a hook
- [ ] No raw `useSessionStore()` destructuring of 5+ values — use selector hook
- [ ] Repeated button/input JSX replaced with primitives
- [ ] Props interface defined explicitly (not inline)
- [ ] Component has a single clear responsibility
- [ ] Named export (not default export)
- [ ] TypeScript: no `any` types except for explicit third-party interop
- [ ] `npm run build` passes after changes

---

## Testing

```typescript
// Component: render + behavior
import { render, screen, fireEvent } from '@testing-library/react';
test('Button calls onClick', () => {
  const fn = jest.fn();
  render(<Button onClick={fn}>Click</Button>);
  fireEvent.click(screen.getByText('Click'));
  expect(fn).toHaveBeenCalled();
});

// Hook: test logic in isolation
import { renderHook, act } from '@testing-library/react';
test('useGeneratePattern rejects empty prompt', async () => {
  const { result } = renderHook(() => useGeneratePattern());
  await act(async () => {
    await expect(result.current.generate('')).rejects.toThrow();
  });
});
```
