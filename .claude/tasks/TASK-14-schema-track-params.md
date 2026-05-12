# TASK-14 — Schema: TrackParams

| Campo | Valor |
|---|---|
| Task-ID | TASK-14 |
| Sprint | 3 |
| Estado | TODO |
| Prioridad | P0 — bloqueante para TASK-15, TASK-16, TASK-17, TASK-18 |
| Estimación | 2h |
| Dependencias | Ninguna |
| Capacidades relacionadas | CAP-NLM-014 · Sintetizador por pista |

> Base de datos del Sprint 3. Define el contrato de tipos que todo el resto del sprint consume.
> No genera UI ni lógica de audio — solo tipos, validación y contratos.

---

## Contexto

El `Track` actual solo puede representar ritmo (16 pasos on/off), volumen, mute y solo.
Para soportar el sintetizador por pista (osciladores, ADSR, filtros, efectos) necesitamos
un campo opcional `params` en el tipo `Track`. Este campo es el contrato compartido entre
el compilador (TASK-15), el agente LLM (TASK-16) y la UI de acordeón (TASK-17/18).

La extensión es **aditiva y no breaking**: tracks sin `params` se comportan exactamente
como hasta ahora.

---

## Acceptance Criteria

**AC-1 — Tipo `TrackParams`**
Existe en `src/lib/types.ts` (o `src/lib/types/audio.ts` si el archivo se ha dividido)
la interfaz `TrackParams` con exactamente los siguientes campos opcionales:

```typescript
interface TrackParams {
  // Synth
  synth?: 'sample' | 'sine' | 'sawtooth' | 'square' | 'triangle'
  note?: string            // mini-notation válida de Strudel, ej: "c2", "<c2 eb2 f2>"

  // Envelope ADSR
  attack?: number          // 0–2 (segundos)
  decay?: number           // 0–0.5 (segundos)
  sustain?: number         // 0–1
  release?: number         // 0–2 (segundos)

  // Filter
  filterType?: 'lp' | 'hp'
  filterCutoff?: number    // 20–20000 (Hz)
  filterQ?: number         // 0–20

  // Effects
  room?: number            // 0–1 (reverb send)
  delay?: number           // 0–1 (delay wet)
  delaytime?: number       // 0–1 (segundos)
  delayfeedback?: number   // 0–0.9 (hard cap, nunca ≥ 1)
  pan?: number             // 0–1 (0=izq, 0.5=centro, 1=der)
}
```

**AC-2 — `Track` extendido**
El tipo `Track` existente incluye el campo:
```typescript
params?: TrackParams
```
Sin cambios en los demás campos. Los tracks sin `params` son válidos.

**AC-3 — Schema Zod actualizado**
`src/lib/llm/validation.ts` — `trackSchema` incluye validación de `params`:

```typescript
const trackParamsSchema = z.object({
  synth: z.enum(['sample', 'sine', 'sawtooth', 'square', 'triangle']).optional(),
  note: z.string().optional(),
  attack: z.number().min(0).max(2).optional(),
  decay: z.number().min(0).max(0.5).optional(),
  sustain: z.number().min(0).max(1).optional(),
  release: z.number().min(0).max(2).optional(),
  filterType: z.enum(['lp', 'hp']).optional(),
  filterCutoff: z.number().min(20).max(20000).optional(),
  filterQ: z.number().min(0).max(20).optional(),
  room: z.number().min(0).max(1).optional(),
  delay: z.number().min(0).max(1).optional(),
  delaytime: z.number().min(0).max(1).optional(),
  delayfeedback: z.number().min(0).max(0.9).optional(),
  pan: z.number().min(0).max(1).optional(),
}).optional()
```

`trackSchema` añade `.extend({ params: trackParamsSchema })` sin modificar
el resto de la validación existente.

**AC-4 — `updateOperationSchema` compatible**
El `patch` del schema de operaciones `update` acepta `params` como campo patcheable:
```typescript
// patch: trackSchema.omit({ id: true }).partial()
// Al extender trackSchema con params, esto se hereda automáticamente.
```
Verificar que `validatePatternDelta` no rompe con un `patch: { params: { room: 0.6 } }`.

**AC-5 — Preferencia de delay time en store**
`src/store/sessionStore.ts` incluye:
```typescript
delayTimeMode: 'free' | 'musical'  // default: 'musical'
setDelayTimeMode: (mode: 'free' | 'musical') => void
```
Persiste en localStorage (añadir a `PersistedState`).

**AC-6 — Tipos exportados**
`TrackParams` se exporta desde el barrel de tipos del proyecto para que
compilador, store y componentes UI puedan importarlo sin paths relativos profundos.

**AC-7 — Sin regresiones**
Todos los tests existentes pasan sin modificación.
El schema Zod sigue rechazando tracks inválidos (steps ≠ 16, volume fuera de rango, etc.).

---

## Business Rules

**BR-NEW-001** — `params` es siempre opcional. Un `Track` sin `params` es válido y
se compila igual que antes.

**BR-NEW-002** — `note` solo tiene efecto cuando `synth !== 'sample'` y
`synth !== undefined`. El compilador (TASK-15) ignora `note` si `synth` es `'sample'`
o no está definido.

**BR-NEW-003** — `delayfeedback` tiene hard cap en `0.9` en el schema Zod.
El compilador nunca debe emitir `.delayfeedback(n)` con n ≥ 1 — bucle infinito de audio.

**BR-NEW-004** — `delayTimeMode` es preferencia global de sesión, no por pista.
Cuando vale `'musical'`, la UI de acordeón (TASK-17) muestra un selector con
valores `0.125 | 0.25 | 0.5 | 0.75`. Cuando vale `'free'`, muestra un slider 0–1.
El valor almacenado en `TrackParams.delaytime` es siempre numérico en ambos casos.

---

## Archivos a modificar

| Archivo | Acción |
|---------|--------|
| `src/lib/types.ts` | Añadir `TrackParams`, extender `Track` con `params?` |
| `src/lib/llm/validation.ts` | Añadir `trackParamsSchema`, extender `trackSchema` |
| `src/store/sessionStore.ts` | Añadir `delayTimeMode` + setter + persistencia |

> Si `src/lib/types.ts` ya supera ~150 líneas, valorar dividir en
> `src/lib/types/audio.ts` (tipos de dominio) + `src/lib/types/index.ts` (barrel).
> No es obligatorio para esta task — documentar como concern si aplica.

---

## Tests

Añadir en `src/lib/llm/__tests__/validation.test.ts`
(o crear el archivo si no existe):

```typescript
describe('TASK-14: TrackParams validation', () => {
  it('acepta un track sin params (retrocompatibilidad)', () => {
    // track válido sin campo params → no lanza
  })

  it('acepta params parciales (todos los campos son opcionales)', () => {
    // track con params: { room: 0.5 } → válido
  })

  it('rechaza delayfeedback >= 1', () => {
    // params: { delayfeedback: 1.0 } → ZodError
  })

  it('rechaza filterQ > 20', () => {
    // params: { filterQ: 25 } → ZodError
  })

  it('acepta patch de update con params parcial', () => {
    // validatePatternDelta con operation update + patch: { params: { room: 0.6 } }
  })
})
```

---

## Notas para el implementador

- **No tocar el compilador** (`compiler.ts`) — eso es TASK-15.
- **No tocar el system prompt** — eso es TASK-16.
- **No crear UI** — eso es TASK-17/18.
- El objetivo de esta task es exclusivamente el contrato de tipos y validación.
- Si al extender `trackSchema` algún test de `validation.test.ts` existente falla,
  es una regresión — investigar antes de continuar.
