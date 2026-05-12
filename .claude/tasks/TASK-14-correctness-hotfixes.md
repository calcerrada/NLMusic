---
id: TASK-14
status: pending
---

# TASK-14 — Correctness: hotfixes y robustez del contrato

| Campo | Valor |
|---|---|
| Task-ID | TASK-14 |
| Sprint | Refactor |
| Prioridad | P0 — correcciones de correctness antes de ampliar funcionalidad |
| Estimación | 2–3 h |
| Dependencias | Ninguna |

> Corrige seis incidencias de baja complejidad individual pero con impacto real en
> correctness, seguridad y coherencia del contrato entre capas.

---

## Objetivo

Eliminar bugs reales y potenciales detectados en la revisión de arquitectura sin
introducir cambios estructurales. Cada fix es atómico y verificable de forma aislada.

---

## Incidencias a corregir

### FIX-1 — TOCTOU en `addTrack`

**Archivo:** `src/store/sessionStore.ts`

`addTrack` llama a `get()` para leer `tracks` y luego a `set()` en dos operaciones
separadas. Entre ambas, otra acción del store podría modificar `tracks` causando una
inconsistencia.

**Corrección:** unificar en un solo `set((state) => ...)` con el check adentro:

```typescript
addTrack: (track) =>
  set((state) => {
    if (state.tracks.length >= 5) return state;
    const nextTracks = [...state.tracks, track];
    return {
      tracks: nextTracks,
      currentCode: compileCode(state.bpm, nextTracks),
      isCodeManuallyEdited: false,
    };
  }),
```

> Nota: el tipo de retorno de `addTrack` cambia de `boolean` a `void`. Revisar los
> consumidores — `applyDelta.ts` no usa el valor de retorno, por lo que el cambio
> es no-breaking en la práctica.

---

### FIX-2 — `tag` ausente del schema Zod en `trackSchema`

**Archivo:** `src/lib/llm/validation.ts`

El tipo `Track` tiene el campo `tag: string`, pero `trackSchema` no lo incluye.
Zod lo descarta silenciosamente al parsear la respuesta del LLM. Luego `inferTag()`
en `usePatternGen` intenta reconstruirlo heurísticamente, lo que puede producir
tags incorrectos.

**Corrección:** añadir al `trackSchema`:

```typescript
tag: z.string().min(1).optional(),
```

El campo es opcional para mantener retrocompatibilidad con respuestas LLM que no
lo incluyan (en ese caso `inferTag()` sigue siendo el fallback válido).

---

### FIX-3 — `turns` sin límite en localStorage

**Archivo:** `src/store/sessionStore.ts`

`turns` crece indefinidamente y se persiste entero. En sesiones largas puede saturar
localStorage (límite ~5 MB).

**Corrección:** limitar a los últimos 40 turnos en el `partialize`:

```typescript
partialize: (state): PersistedState => ({
  bpm: state.bpm,
  tracks: state.tracks,
  turns: state.turns.slice(-40),   // ← añadir límite
  editorMode: state.editorMode,
  highlightingEnabled: state.highlightingEnabled,
  hapVisualizationEnabled: state.hapVisualizationEnabled,
  language: state.language,
}),
```

---

### FIX-4 — Validación del body completo de la API route

**Archivo:** `src/app/api/generate-pattern/route.ts`

El cuerpo de la request solo valida que `prompt` sea string no vacío. El objeto
`context` se usa directamente sin validación. Un cliente malicioso puede enviar
`context.turns` con miles de entradas o `context.codeMode.strudelCode` con MBs de texto.

**Corrección:** añadir un schema Zod para el body completo antes de procesar:

```typescript
import { z } from 'zod';

const requestBodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  context: z.object({
    turns: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().max(500),
    })).max(40).optional(),
    previous: z.object({
      bpm: z.number().int().min(60).max(220),
      tracks: z.array(z.unknown()).max(5),
    }).optional(),
    codeMode: z.object({
      enabled: z.literal(true),
      strudelCode: z.string().max(5000),
      bpmHint: z.number().int().min(60).max(220),
    }).optional(),
    language: z.enum(['es', 'en', 'mixed']).optional(),
  }).optional(),
});
```

Usar `requestBodySchema.parse(await req.json())` al inicio del handler y devolver
400 si el parse falla.

---

### FIX-5 — Reemplazar `new Function(code)` en `getSyntaxErrorMessage`

**Archivo:** `src/features/code-view/components/StrudelCodePanel.tsx`

`new Function(code)` es semánticamente equivalente a `eval()`. Puede ser bloqueado
por CSP estrictos y es innecesario: `strudel.play()` ya captura errores de sintaxis
en su `try/catch` y los propaga.

**Corrección:** eliminar la función `getSyntaxErrorMessage` por completo.
El bloque debounce ya tiene `try/catch` sobre `strudel.play()` — ese catch ya rellena
`codeError` con el mensaje de error real del runtime de Strudel.

Verificar que el flujo de `handleEditorChange` muestra el error inline correctamente
sin el guard previo.

---

### FIX-6 — Eliminar compilación doble en el flujo de generación

**Archivos:** `src/features/prompt/hooks/usePatternGen.ts`, `src/store/sessionStore.ts`

Tras una generación LLM exitosa, `compileToStrudel` se llama dos veces:
1. En `usePatternGen` (~línea 119) para construir `normalizedPattern.strudelCode`
2. En `loadPattern` del store, que llama internamente a `compileCode()`

**Corrección:** hacer que `loadPattern` use el `strudelCode` precompilado si ya
viene en el `TrackJSON`:

```typescript
loadPattern: (pattern) =>
  set(() => {
    const nextTracks = pattern.tracks.slice(0, 5);
    const code = pattern.strudelCode ?? compileCode(pattern.bpm, nextTracks);
    return {
      bpm: pattern.bpm,
      tracks: nextTracks,
      currentCode: code,
      isCodeManuallyEdited: false,
      isPlaying: nextTracks.length > 0,
      uiState: nextTracks.length > 0 ? 'playing' : 'idle',
      lastError: null,
    };
  }),
```

---

## Archivos a modificar

| Archivo | Fix |
|---------|-----|
| `src/store/sessionStore.ts` | FIX-1, FIX-3, FIX-6 |
| `src/lib/llm/validation.ts` | FIX-2 |
| `src/app/api/generate-pattern/route.ts` | FIX-4 |
| `src/features/code-view/components/StrudelCodePanel.tsx` | FIX-5 |

---

## Tests

- `npm test` — todos deben pasar sin modificación.
- Test manual: generar un patrón, editar código, mutear pista — verificar que no hay
  regresiones en el flujo principal.
- Para FIX-4: enviar un body malformado a `/api/generate-pattern` y verificar 400.
- Para FIX-5: escribir código inválido en el editor y verificar que el error
  se muestra inline correctamente.

---

## Escenarios BDD

```gherkin
Scenario: addTrack con 5 pistas activas (FIX-1)
  Given el store tiene 5 pistas
  When se llama a addTrack con una nueva pista
  Then el estado de tracks no cambia (sigue con 5)
  And no se lanza ninguna excepción

Scenario: LLM devuelve track con tag (FIX-2)
  Given el LLM devuelve un track con campo tag: "kick"
  When validatePatternDelta procesa la respuesta
  Then el track resultante conserva tag: "kick"

Scenario: body malformado en la API (FIX-4)
  Given se envía un POST a /api/generate-pattern
  When el body tiene turns con 100 entradas
  Then la respuesta es 400 con ok: false

Scenario: código inválido en el editor (FIX-5)
  Given el usuario escribe "stack(s(" en el editor
  When el debounce de 600ms expira
  Then se muestra un error inline
  And el audio previo sigue sonando
```
