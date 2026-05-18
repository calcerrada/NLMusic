---
id: TASK-21
status: pending
---

# TASK-21 — LLM: system prompt y adapter para parámetros de síntesis

| Campo | Valor |
|---|---|
| Task-ID | TASK-21 |
| Sprint | 3 |
| Estado | TODO |
| Prioridad | P1 |
| Estimación | 2h |
| Dependencias | TASK-19 |
| Capacidades relacionadas | CAP-NLM-014 · Sintetizador por pista |

> Enseña al agente los campos de `TrackParams`. Crea o actualiza
> `strudel-injection.md` con el mapeo de campos a métodos Strudel
> e inyéctalo en el system prompt del adapter.

---

## Contexto

El LLM actualmente no conoce los campos de `TrackParams`. Sin esta task,
una petición como "añade reverb a la pista 2" no produce un patch correcto.

El objetivo es que el agente aprenda a:
- Usar `update { patch: { params: { room: 0.6 } } }` para añadir efectos.
- Usar `update { patch: { params: { room: 0 } } }` para eliminar un efecto
  (valor `0` = desactivar; omitir el campo = no cambiar).
- Usar `synth` y `note` para cambiar la fuente sonora de una pista.

---

## Acceptance Criteria

**AC-1 — Verificar existencia de `strudel-injection.md`**
Comprobar con `ls src/lib/llm/prompts/` si existe `strudel-injection.md`.
Si no existe, crearlo. Si existe, actualizarlo con el contenido de esta task.

**AC-2 — Contenido de `strudel-injection.md`**
El archivo documenta para el LLM (en inglés — Sección 10 de la spec):

1. Los campos de `TrackParams` con su rango y significado musical.
2. El mapeo campo → método Strudel.
3. La semántica de patch:
   - **Set/change**: include the field with the new value.
   - **Remove/disable**: include the field with value `0` (never omit if intent is removal).
   - **Leave unchanged**: omit the field from the patch entirely.
4. Regla explícita: `delayfeedback` nunca puede ser `>= 1`.
5. Ejemplos de usuario → operación LLM:

```
"Add reverb to track 2"
→ { "type": "update", "id": "snare-1", "patch": { "params": { "room": 0.6 } } }

"Remove reverb from track 2"
→ { "type": "update", "id": "snare-1", "patch": { "params": { "room": 0 } } }

"Make track 1 play a sine wave on C2"
→ { "type": "update", "id": "kick-1", "patch": { "params": { "synth": "sine", "note": "c2" } } }

"Add a slow delay to the hi-hat"
→ { "type": "update", "id": "hihat-1", "patch": { "params": { "delay": 0.4, "delaytime": 0.5, "delayfeedback": 0.3 } } }

"Pan the snare to the right"
→ { "type": "update", "id": "snare-1", "patch": { "params": { "pan": 0.8 } } }

"Add a low-pass filter to the kick"
→ { "type": "update", "id": "kick-1", "patch": { "params": { "filterType": "lp", "filterCutoff": 500 } } }
```

**AC-3 — Inyección en el system prompt**
`src/lib/llm/prompts/systemPrompt.ts` incluye el contenido de `strudel-injection.md`
en el system prompt enviado a la API. Para el MVP, la forma más simple es
concatenar el string directamente en `systemPrompt.ts` sin lectura de fichero
en runtime. Si se usa `fs.readFileSync`, encapsular en `loadStrudelInjection()`
y mockear en tests.

**AC-4 — Schema de ejemplo actualizado en el system prompt**
El system prompt incluye `params` como campo opcional en el ejemplo de operación
`update`:
```json
{
  "type": "update",
  "id": "snare-1",
  "patch": {
    "params": { "room": 0.6 }
  }
}
```

**AC-5 — Semántica de merge reforzada en el prompt**
El system prompt explica que un patch con `params` hace merge, no replace:
```
// Correct — only changes room, existing delay is preserved:
patch: { params: { room: 0 } }

// Incorrect if intent is only to remove room — would also wipe delay:
patch: { params: { room: 0, delay: 0 } }
```

**AC-6 — `delayfeedback` protegido en el prompt**
El system prompt incluye:
`"Never set delayfeedback >= 1 — it creates an infinite audio loop."`

**AC-7 — Tests del adapter actualizados**
`src/lib/llm/__tests__/claude.adapter.test.ts` verifica que el system prompt
enviado a la API contiene al menos una referencia a `params` o `TrackParams`
(confirma que la inyección llega al LLM).

**AC-8 — Todos los tests existentes pasan**

---

## Business Rules

**BR-NEW-003** (heredada de TASK-19) — `delayfeedback` nunca `>= 1`.
Reforzado en el prompt y en el compilador (TASK-20).

**BR-001** — La modificación del system prompt no afecta al audio directamente.

---

## Archivos a modificar/crear

| Archivo | Acción |
|---------|--------|
| `src/lib/llm/prompts/strudel-injection.md` | Crear si no existe, actualizar si existe |
| `src/lib/llm/prompts/systemPrompt.ts` | Inyectar contenido de `strudel-injection.md` + actualizar schema ejemplo |
| `src/lib/llm/__tests__/claude.adapter.test.ts` | Verificar presencia de sección TrackParams en el prompt enviado |

---

## Notas para el implementador

- Verificar primero con `ls src/lib/llm/prompts/` si `strudel-injection.md` existe.
- El contenido de `strudel-injection.md` debe estar en inglés (Sección 10 de la spec:
  el system prompt interno es siempre inglés).
- Para el MVP, importar el contenido como string literal en `systemPrompt.ts`
  es más simple y evita problemas con el bundler de Next.js.
- No cambiar la lógica del adapter ni el pipeline — solo el contenido del prompt.
- No tocar el compilador ni el store — eso es TASK-20.
