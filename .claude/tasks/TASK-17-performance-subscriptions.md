---
id: TASK-17
status: pending
---

# TASK-17 — Performance: suscripciones reactivas y prompt caching

| Campo | Valor |
|---|---|
| Task-ID | TASK-17 |
| Sprint | Refactor |
| Prioridad | P2 |
| Estimación | 2–3 h |
| Dependencias | TASK-14 recomendada |

---

## Objetivo

Reducir re-renders innecesarios de `PromptBox` causados por suscripciones reactivas
en `usePatternGen`, unificar el estado `isLoading` duplicado, y añadir prompt caching
de Anthropic para reducir el coste por request de la API.

---

## FIX-1 — Over-subscriptions en `usePatternGen`

**Archivo:** `src/features/prompt/hooks/usePatternGen.ts`

### Problema

Los valores `turns`, `bpm`, `tracks`, `currentCode`, `isCodeManuallyEdited` se
suscriben reactivamente via `useSessionStore(selector)`. Cada cambio de BPM, toggle
de paso, cambio de volumen o mute provoca un re-render de `PromptBox`. Sin embargo,
ninguno de estos valores se usa para renderizar — solo se leen dentro del callback
`generate()` al momento de invocar la API.

### Corrección

Leer con `useSessionStore.getState()` dentro del callback en lugar de suscribirse:

```typescript
export function usePatternGen() {
  // Solo estas dos suscripciones reactivas son necesarias para el render:
  const lastError = useSessionStore((s) => s.lastError);
  const uiState = useSessionStore((s) => s.uiState);

  // Acciones del store (referencias estables, no causan re-renders):
  const loadPattern = useSessionStore((s) => s.loadPattern);
  const addTurn = useSessionStore((s) => s.addTurn);
  const startLoading = useSessionStore((s) => s.startLoading);
  const storeRetry = useSessionStore((s) => s.retry);
  const storeSetError = useSessionStore((s) => s.setError);
  const setLastPrompt = useSessionStore((s) => s.setLastPrompt);

  const generate = useCallback(async (prompt: string): Promise<boolean> => {
    // Leer estado solo cuando se necesita, no reactivamente:
    const { turns, bpm, tracks, currentCode, isCodeManuallyEdited } =
      useSessionStore.getState();
    // ... resto igual
  }, [loadPattern, addTurn, startLoading, storeRetry, storeSetError, setLastPrompt]);
```

---

## FIX-2 — `isLoading` duplicado

**Archivos:** `src/features/prompt/hooks/usePatternGen.ts`, `src/store/sessionStore.ts`

### Problema

Existen dos flags paralelos que representan lo mismo:
- `isLoading` local: `useState(false)` en `usePatternGen`
- `uiState === 'loading'` en el store

Pueden desincronizarse: si hay una excepción en el `finally`, uno puede quedar `true`
y el otro `false`.

### Corrección

Eliminar el `isLoading` local. Derivarlo del `uiState` del store:

```typescript
const isLoading = uiState === 'loading';
```

El `finally` del callback `generate` ya no necesita `setIsLoading(false)`.
La transición de `loading` a otro estado la gestiona el store en `loadPattern`,
`setError` o `clearError`.

Ajustar la interfaz de retorno del hook:
```typescript
return { generate, retry, isLoading, error: lastError, info };
```

---

## FIX-3 — Prompt caching en el adapter de Claude

**Archivo:** `src/lib/llm/adapters/claude.adapter.ts`

### Problema

El system prompt (~1.5 KB, estático) se re-tokeniza en cada request. Anthropic
soporta prompt caching con un ahorro del ~90% en tokens de input para el contenido
cacheado. En 100 requests diarios esto representa un ahorro significativo de coste.

### Corrección

Cambiar `system` de `string` a `ContentBlockParam[]` con `cache_control`:

```typescript
async generatePattern(prompt: string, context: SessionContext): Promise<PatternDelta> {
  const response = await this.client.messages.create({
    model: this.model,
    max_tokens: 1400,
    temperature: 0.3,
    system: [
      {
        type: 'text' as const,
        text: buildSystemPrompt(),
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: buildUserPrompt(prompt, context) }],
  });
  // ...resto igual
}
```

> Verificar con `@anthropic-ai/sdk@^0.89` que `MessageCreateParamsNonStreaming.system`
> acepta `ContentBlockParam[]`. Si el type-check falla, usar `as unknown as string` como
> workaround temporal y documentarlo.
>
> El cache TTL de Anthropic es 5 minutos. El system prompt se cacheará tras el primer
> request y ahorrará tokens en los siguientes mientras la sesión esté activa.

---

## Archivos a modificar

| Archivo | Fix |
|---------|-----|
| `src/features/prompt/hooks/usePatternGen.ts` | FIX-1, FIX-2 |
| `src/lib/llm/adapters/claude.adapter.ts` | FIX-3 |

---

## Tests

- `npm test` sin modificaciones.
- Para FIX-1: usar React DevTools Profiler para verificar reducción de re-renders de
  `PromptBox` al modificar BPM o toggle de paso.
- Para FIX-3: verificar en los headers de respuesta de la API Anthropic que aparece
  `cache_read_input_tokens > 0` en el segundo request.

---

## Escenarios BDD

```gherkin
Scenario: PromptBox no re-renderiza al cambiar BPM (FIX-1)
  Given el usuario está en la pestaña Secuenciador
  When el usuario cambia el BPM
  Then PromptBox no re-renderiza (verificar con React Profiler)

Scenario: isLoading derivado del store (FIX-2)
  Given el usuario envía un prompt
  When la API está procesando
  Then isLoading es true (uiState === 'loading')
  When la API responde con éxito
  Then isLoading es false (uiState === 'playing')
  And el prompt se limpia del textarea

Scenario: isLoading coherente en caso de error (FIX-2)
  Given el usuario envía un prompt
  When la API responde con error
  Then uiState es 'error' y isLoading es false
  And el botón de retry está disponible
```
