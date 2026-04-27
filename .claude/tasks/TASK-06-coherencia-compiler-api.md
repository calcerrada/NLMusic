---
id: TASK-06
status: done
completed_commit: 6aa9dc4
completed_date: 2026-04-24
---

# TASK-06 — Coherencia compiler + contrato API

**Depende de:** TASK-05 completada (porque toca los mismos archivos del contrato LLM)
**CAP relacionadas:** CAP-NLM-001, CAP-NLM-002, CAP-NLM-005 (mute)
**Spec de referencia:** `nlmusic-spec.md` Secciones 5 (BR-001), 7 — limpieza derivada de la auditoría

**Origen:** Hallazgos #5, #7 y #9 de la auditoría TASK-01 — limpiezas pequeñas pero importantes para evitar deuda y comportamientos sutiles.

---

## Objetivo

Tres limpiezas independientes que comparten archivos. Se agrupan para evitar
PRs duplicados sobre los mismos componentes:

1. **Compilador Strudel:** las pistas en mute se filtran del `stack()` en vez de
   permanecer con `gain(0)`. Cambiar para que permanezcan en el código.
2. **Contrato API generate-pattern:** la semántica de `success/usedFallback` es
   ambigua (status 200 con `success: false`). Definir un contrato explícito.
3. **Naming `currentPattern` / `previous`:** el cliente envía `previous`, el tipo
   `SessionContext` declara ambos. Unificar en un solo nombre.

---

## Sub-tarea 1 — Compilador: mute = `gain(0)`, no eliminar

### Reglas que debe cumplir

- **BR-001:** Audio nunca se interrumpe al toggle mute — actualmente cuando se
  mutea una pista, el `stack()` se reconstruye sin ella, lo que puede provocar
  que Strudel reordene voces y altere el audio momentáneamente
- Mantener mute reversible sin "perder" la pista del código

### Archivo: `src/features/audio/compiler.ts`

Estado actual (líneas 43-51):
```typescript
const soloed = trackJson.tracks.filter((t) => t.solo && !t.muted);
const activeTracks = soloed.length > 0
  ? soloed
  : trackJson.tracks.filter((t) => !t.muted);   // ← mute filtra del stack
```

Cambiar a:
```typescript
const hasSolo = trackJson.tracks.some((t) => t.solo);
// Solo: solo las solo-true se oyen. Resto entra con gain(0)
// Mute: la pista entra al stack con gain(0) — no se filtra
const activeTracks = trackJson.tracks.map((t) => {
  if (hasSolo && !t.solo) return { ...t, _silenced: true };
  if (t.muted)            return { ...t, _silenced: true };
  return t;
});
```

Y `trackToCode` aplica `gain(0)` cuando `_silenced` es true.

Resultado: el `stack()` siempre contiene todas las pistas, las muteadas/no-soloeadas
suenan a 0. El cambio de mute solo cambia un parámetro `gain`, no la estructura
del stack — más estable para Strudel.

### Verificación

- Toggle mute en una pista mientras suena → no debe haber click ni interrupción
- Toggle solo en una pista → resto sigue en el stack con gain 0

---

## Sub-tarea 2 — Contrato API explícito

### Problema

Hoy `route.ts` devuelve:
- Éxito: `{ success: true, trackJson, usedFallback: false }` con status 200
- Fallback: `{ success: false, trackJson, usedFallback: true, error }` con status 200
- Error 500: `{ error }` sin `success`

`usePatternGen.ts` solo lanza si `!response.ok`, así que el fallback se trata
como éxito silencioso (cosa que actualmente queremos), pero el `success: false`
con status 200 es semánticamente raro.

### Decisión

Estandarizar tres formas de respuesta, todas con status HTTP coherente:

```typescript
// Éxito puro (status 200)
{ ok: true,  trackJson, source: 'llm' }

// Fallback usado (status 200, audio sigue siendo válido)
{ ok: true,  trackJson, source: 'fallback', warning: '<motivo>' }

// Error real (status 4xx / 5xx)
{ ok: false, error: '<mensaje>' }
```

### Archivos

**`src/app/api/generate-pattern/route.ts`**
- Devolver `ok: true` cuando hay `trackJson` válido (incluso fallback)
- Diferenciar con `source: 'llm' | 'fallback'`
- Mover `warning` al campo dedicado (no `error`)
- 500 / 400 reservados para errores que no devuelven trackJson

**`src/features/prompt/hooks/usePatternGen.ts`**
- Lectura del nuevo formato
- `if (!payload.ok) throw new Error(payload.error)`
- Si `source === 'fallback'` → mostrar `payload.warning` como info no bloqueante

---

## Sub-tarea 3 — Unificar naming `currentPattern` / `previous`

### Problema

- `SessionContext` (en `src/lib/types/session.ts`) declara `currentPattern?` y `previous?` — dos campos para lo mismo
- `usePatternGen.ts:50` envía el snapshot bajo la clave `previous`
- `route.ts:29` lo lee como `context.previous`
- Tests futuros y nuevos contributors pueden usar el otro nombre por error

### Decisión

Mantener un único nombre: **`previous`** (consistente con "patrón previo que el LLM debe considerar").
Eliminar `currentPattern` del tipo y de cualquier consumer.

### Archivos

- `src/lib/types/session.ts` — eliminar `currentPattern`, dejar solo `previous`
- `src/features/prompt/hooks/usePatternGen.ts` — el objeto `context` ya usa `previous`, mantener
- `src/lib/llm/adapters/claude.adapter.ts` — verificar que el user prompt use `previous`
- Buscar otras menciones de `currentPattern` con grep y limpiar

---

## Escenarios BDD a verificar manualmente

```
Scenario: Toggle mute sin glitch
  Given hay 3 pistas sonando
  When el usuario activa mute en la pista 2
  Then la pista 2 deja de sonar inmediatamente o en el siguiente ciclo
  And no hay click, pop ni interrupción del resto del audio
  When el usuario desactiva mute en la pista 2
  Then la pista 2 vuelve a sonar sin reorganizar el resto

Scenario: Respuesta exitosa del LLM (nuevo contrato)
  Given el LLM responde correctamente
  When la API route procesa la respuesta
  Then devuelve { ok: true, trackJson, source: 'llm' } con status 200
  And el cliente actualiza el patrón sin warning

Scenario: Fallback activado (nuevo contrato)
  Given el LLM falla con error de red
  When la API route procesa la respuesta
  Then devuelve { ok: true, trackJson, source: 'fallback', warning: '<motivo>' } con status 200
  And el cliente carga el fallback y muestra la warning

Scenario: Error real (nuevo contrato)
  Given falta ANTHROPIC_API_KEY
  When la API route procesa la respuesta
  Then devuelve { ok: false, error: '...' } con status 500
  And el cliente entra en estado ERROR (TASK-04)
```

---

## Archivos a modificar

- `src/features/audio/compiler.ts` — mute como `gain(0)` sin filtrar del stack
- `src/app/api/generate-pattern/route.ts` — formato de respuesta `{ ok, source, warning }`
- `src/features/prompt/hooks/usePatternGen.ts` — adaptar lectura del nuevo formato
- `src/lib/types/session.ts` — eliminar `currentPattern`, mantener `previous`
- `src/lib/llm/adapters/claude.adapter.ts` — usar `previous` consistentemente
- (Cualquier otro fichero que mencione `currentPattern` — verificar con grep)
