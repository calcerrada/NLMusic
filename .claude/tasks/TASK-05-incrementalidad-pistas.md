# TASK-05 — Incrementalidad de pistas (BR-004)

**Depende de:** TASK-04 completada (estado ERROR estable antes de tocar el contrato LLM)
**CAP relacionadas:** CAP-NLM-001 (genera/edita pistas)
**Spec de referencia:** `nlmusic-spec.md` Secciones 5 (BR-004, BR-005), 7 (EC-005), 8 (BDD CAP-NLM-001)
**Origen:** Hallazgos #6 y #8 de la auditoría TASK-01 — `loadPattern` reemplaza tracks completos y el system prompt no soporta operaciones incrementales.

---

## Objetivo

Hoy el LLM siempre devuelve un patrón completo y `loadPattern` reemplaza
todas las pistas. Esto rompe BR-004 ("las pistas se crean de forma secuencial")
y la experiencia de prompts incrementales tipo "añade un clap en el tiempo 3"
o "quita el hi-hat" — cuando el usuario espera modificar el estado actual,
el LLM debería poder devolver un **delta** en lugar de un snapshot.

---

## Reglas que debe cumplir

- **BR-004:** Las pistas se crean de forma secuencial — añadir no destruye lo anterior
- **BR-005:** Referencias a pistas inexistentes → informar, no hacer nada
- **BR-006:** El total de pistas tras aplicar el delta nunca supera 5 (ver TASK-03)
- **BR-001:** Audio no se interrumpe al aplicar el delta — Strudel actualiza en el siguiente ciclo

---

## Cambio de contrato LLM

### Schema actual (snapshot)
```json
{ "bpm": 138, "tracks": [...], "strudelCode": "..." }
```

### Schema nuevo (operaciones)

```json
{
  "bpm": 138,
  "operations": [
    { "type": "add",     "track": { "id": "clap-1", "name": "Clap", "sample": "cp", "steps": [...], "volume": 0.7, "muted": false, "solo": false } },
    { "type": "update",  "id": "kick-1", "patch": { "steps": [...] } },
    { "type": "remove",  "id": "hihat-1" },
    { "type": "replace", "tracks": [...] }
  ]
}
```

- `add` — añade una pista nueva al final (BR-004 secuencial)
- `update` — modifica una pista existente por id (steps, volume, muted, solo)
- `remove` — elimina una pista por id
- `replace` — caso compatible con el comportamiento actual: reemplaza todo el patrón
  (útil para prompts de "empieza de cero" o cuando el LLM necesita rehacer todo)

El LLM elige la operación según el prompt:
- "Crea un patrón de techno" → `replace`
- "Añade un clap" → `add`
- "Sube el volumen del kick" → `update`
- "Quita el hi-hat" → `remove`

---

## Qué implementar

### 1. Tipos del contrato

**Archivo:** `src/lib/types/audio.ts`

```typescript
export type PatternOperation =
  | { type: 'add';     track: Track }
  | { type: 'update';  id: string; patch: Partial<Omit<Track, 'id'>> }
  | { type: 'remove';  id: string }
  | { type: 'replace'; tracks: Track[] };

export interface PatternDelta {
  bpm?: number;
  operations: PatternOperation[];
}
```

Mantener `TrackJSON` para usos internos (estado renderizado), pero el LLM
ya no devuelve `TrackJSON` — devuelve `PatternDelta`.

---

### 2. Validación Zod

**Archivo:** `src/lib/llm/validation.ts`

Crear `patternDeltaSchema` con `z.discriminatedUnion('type', [...])` para las operaciones.
Mantener `trackJsonSchema` para validar el estado final tras aplicar el delta.

---

### 3. System prompt actualizado

**Archivo:** `src/lib/llm/prompts/systemPrompt.ts`

- Documentar el nuevo schema de operaciones con ejemplos para cada tipo
- Incluir la lista de pistas actuales en el contexto del user prompt para
  que el LLM pueda referenciarlas por id
- Reglas:
  - "Use `add` when the user asks to add an instrument and existing tracks should remain"
  - "Use `update` when the user modifies an existing track. Reference its id from the context"
  - "Use `remove` when the user explicitly asks to delete an instrument"
  - "Use `replace` only when the user asks for a fresh pattern or when the request is incompatible with the current state"
  - "Maximum 5 tracks total after the delta is applied (BR-006)"

---

### 4. Adapter

**Archivo:** `src/lib/llm/adapters/claude.adapter.ts`

`generatePattern` cambia su firma:
```typescript
generatePattern(prompt: string, context: SessionContext): Promise<PatternDelta>
```

El user prompt construido debe incluir el snapshot actual (`context.previous`)
con los ids de las pistas, para que el LLM pueda devolver `update`/`remove`
referenciando ids reales.

---

### 5. Reducer de operaciones

**Archivo nuevo:** `src/lib/llm/applyDelta.ts`

```typescript
export function applyDelta(
  current: TrackJSON,
  delta: PatternDelta
): { next: TrackJSON; warnings: string[] }
```

Lógica:
- `add`     → si `current.tracks.length >= 5` rechazar y añadir warning (BR-006)
- `update`  → si el id no existe → warning "track <id> no encontrada", no fail (BR-005)
- `remove`  → si el id no existe → warning, no fail (BR-005)
- `replace` → vaciar y reemplazar (cap a 5)
- `bpm`     → actualizar si viene en el delta

Devuelve el siguiente `TrackJSON` y las advertencias para mostrar al usuario.

---

### 6. Pipeline

**Archivo:** `src/lib/llm/pipeline.ts`

Tras obtener el `PatternDelta`:
1. Validar con Zod
2. Aplicar `applyDelta(previousPattern, delta)`
3. Compilar el código Strudel del estado resultante
4. Devolver `{ trackJson, warnings }` al cliente

El fallback sigue devolviendo un `TrackJSON` completo (no delta).

---

### 7. Store

**Archivo:** `src/store/sessionStore.ts`

Mantener `loadPattern` para el caso `replace` y como entrada del fallback.
Añadir acciones explícitas para soportar testing/debug:
```typescript
addTrack(track: Track): boolean        // false si ya hay 5
updateTrack(id: string, patch: Partial<Track>): boolean
removeTrack(id: string): void          // ya cubierto por TASK-07
```

`addTrack` valida `state.tracks.length < 5` antes (BR-006).

---

### 8. UI — feedback de warnings

**Archivo:** `src/features/prompt/hooks/usePatternGen.ts`

Cuando la respuesta incluye `warnings`:
- Añadir un turn de assistant en el store con la lista de warnings
- (Opcional) mostrarlas brevemente en el PromptBox como info no bloqueante

Ejemplo: "Pista 'hihat-2' no encontrada — ignorada."

---

## Escenarios BDD a verificar manualmente

```
Scenario: Añadir un instrumento conserva los anteriores
  Given hay 2 pistas (kick, snare)
  When el usuario escribe "añade un hi-hat en cada semicorchea"
  Then el LLM devuelve { operations: [{ type: 'add', track: {...} }] }
  And el secuenciador muestra 3 pistas
  And el audio del kick y snare no se interrumpe (BR-001)

Scenario: Modificar una pista existente
  Given hay 2 pistas (kick, snare) con ids "kick-1" y "snare-1"
  When el usuario escribe "sube el volumen del snare"
  Then el LLM devuelve { operations: [{ type: 'update', id: 'snare-1', patch: { volume: 0.95 } }] }
  And el snare suena más fuerte
  And el resto del patrón no cambia

Scenario: Eliminar pista por instrucción del LLM
  Given hay 3 pistas
  When el usuario escribe "quita el hi-hat"
  Then el LLM devuelve { operations: [{ type: 'remove', id: 'hihat-1' }] }
  And el secuenciador muestra 2 pistas
  And el audio sigue sonando con las restantes

Scenario: Empezar de cero
  Given hay 4 pistas
  When el usuario escribe "olvida todo, dame un patrón minimal"
  Then el LLM devuelve { operations: [{ type: 'replace', tracks: [...] }] }
  And el secuenciador se reemplaza por el nuevo patrón

Scenario: BR-005 — referencia a pista inexistente
  Given hay 1 pista con id "kick-1"
  When el LLM devuelve { operations: [{ type: 'update', id: 'snare-9', patch: {...} }] }
  Then la operación se ignora
  And se añade una warning visible al usuario
  And el resto del delta sí se aplica

Scenario: BR-006 al añadir
  Given hay 5 pistas
  When el LLM devuelve { operations: [{ type: 'add', track: {...} }] }
  Then la operación se rechaza
  And se añade una warning explicando el límite
  And el patrón existente no cambia
```

---

## Compatibilidad y rollout

- Mantener un parser tolerante en el adapter: si el LLM devuelve el formato viejo
  (`{ bpm, tracks }`), envolverlo automáticamente en `{ operations: [{ type: 'replace', tracks }] }`.
  Esto permite desplegar el cambio sin romper si el LLM no sigue las nuevas instrucciones.
- El fallback no necesita cambiar — sigue devolviendo `TrackJSON` que se trata como `replace`.

---

## Archivos a crear / modificar

- `src/lib/types/audio.ts` — `PatternOperation`, `PatternDelta`
- `src/lib/llm/validation.ts` — `patternDeltaSchema`
- `src/lib/llm/prompts/systemPrompt.ts` — nuevo contrato + ejemplos por operación
- `src/lib/llm/adapters/claude.adapter.ts` — devolver `PatternDelta` + parser tolerante
- `src/lib/llm/applyDelta.ts` — nuevo: reducer de operaciones
- `src/lib/llm/pipeline.ts` — orquestar delta + warnings
- `src/store/sessionStore.ts` — `addTrack`, `updateTrack` (defensivos)
- `src/features/prompt/hooks/usePatternGen.ts` — surfacing de warnings
- `src/app/api/generate-pattern/route.ts` — propagar `warnings` al cliente
