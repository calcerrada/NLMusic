---
id: TASK-09
status: done
completed_commit: b870bd0
completed_date: 2026-04-27
---

# TASK-09 — Contexto LLM coherente en modo código (CAP-NLM-002 + CAP-NLM-008)

**Depende de:** TASK-08 completada
**CAP:** CAP-NLM-002 + CAP-NLM-008
**Spec de referencia:** `nlmusic-spec.md` Secciones 5 (BR-001, BR-003, BR-004, BR-005, BR-009), 7 (EC-001, EC-003, EC-006), 8 (BDD CAP-NLM-002 / CAP-NLM-008)

---

## Objetivo

Evitar que, después de editar Strudel manualmente y entrar en "modo código",
la app envíe al LLM un snapshot ambiguo o desfasado del patrón.

Tras TASK-08, el audio puede estar gobernado por `currentCode` mientras el array
`tracks` ya no representa fielmente lo que suena. Si en ese estado el usuario envía
un prompt nuevo, el contexto actual puede mezclar:

- `strudelCode` real
- `tracks` obsoletos
- ids de pista que ya no son fiables

Eso rompe la semántica incremental de CAP-NLM-002 y puede provocar deltas aplicados
sobre un patrón distinto del que realmente está sonando.

---

## Problema a resolver

Hay dos fuentes de verdad posibles para el patrón actual:

```
Modo grid (sin edición manual no parseable)
  → la fuente de verdad es previous.tracks + bpm

Modo código (edición manual válida pero no representable en grid)
  → la fuente de verdad es currentCode
  → previous.tracks NO se puede seguir tratando como snapshot autoritativo
```

La tarea consiste en hacer explícita esta diferencia en el contrato de contexto
cliente → API → adapter → pipeline.

---

## Reglas que debe cumplir

- **BR-009:** Editor Strudel y sistema de prompts deben compartir una fuente de verdad coherente del patrón actual
- **BR-004:** Las operaciones incrementales solo se aplican sobre un patrón previo fiable
- **BR-005:** No se deben usar referencias a pistas inexistentes o no fiables como si fueran válidas
- **BR-003:** Si el contexto no permite aplicar un delta de forma segura, el comportamiento debe ser uniforme y explícito
- **BR-001:** La corrección del contrato de contexto no puede introducir interrupciones de audio

---

## Qué implementar

### 1. Extender el contrato de `SessionContext`

**Archivo:** `src/lib/types/session.ts`

Añadir un campo explícito para describir el estado del patrón cuando la app está
en modo código. No reutilizar `previous` con pistas obsoletas como si siguiera
siendo autoritativo.

Ejemplo orientativo:

```typescript
interface SessionContext {
  turns: SessionTurn[]
  previous?: TrackJSON
  codeMode?: {
    enabled: boolean
    strudelCode: string
    bpmHint: number
    parseable: boolean
  }
  language?: 'es' | 'en' | 'mixed'
}
```

No es obligatorio usar exactamente esta forma, pero sí cumplir estas propiedades:

- El contexto debe distinguir explícitamente grid vs code mode
- Debe poder enviar el `strudelCode` actual como fuente de verdad
- Debe poder indicar si existe o no un snapshot estructurado fiable (`tracks`)

---

### 2. Construcción del contexto en `usePatternGen`

**Archivo:** `src/features/prompt/hooks/usePatternGen.ts`

Al enviar un prompt:

- Si `isCodeManuallyEdited === false` → conservar el contrato actual con `previous`
- Si `isCodeManuallyEdited === true` → NO enviar `previous.tracks` como si fueran el patrón actual si ya no son fiables
- En ese caso, enviar `currentCode` dentro del nuevo bloque de contexto de modo código

```typescript
if (!isCodeManuallyEdited) {
  context.previous = { bpm, tracks, strudelCode: currentCode }
} else {
  context.codeMode = {
    enabled: true,
    strudelCode: currentCode,
    bpmHint: bpm,
    parseable: false,
  }
}
```

---

### 3. Pasar el nuevo contrato por la API route

**Archivo:** `src/app/api/generate-pattern/route.ts`

La route debe aceptar y propagar el nuevo bloque de contexto sin perder
tipado ni colapsarlo de vuelta al formato viejo.

Objetivo:

- `previous` sigue existiendo para grid mode
- `codeMode` llega intacto al pipeline/adapter
- El contrato queda consistente entre cliente, API y proveedor

---

### 4. Adaptar el prompt del proveedor LLM

**Archivos:**
- `src/lib/llm/prompts/systemPrompt.ts`
- `src/lib/llm/adapters/claude.adapter.ts`

Cuando el contexto venga en modo código:

- Informar al modelo de que el `strudelCode` es la fuente de verdad
- Informar de que los ids de `tracks` previos pueden no ser fiables o directamente no existir
- Pedir explícitamente que en ese caso priorice una respuesta segura

Comportamiento esperado del LLM en modo código:

- Preferir `replace` si no dispone de un snapshot estructurado fiable
- No asumir que puede hacer `update/remove` por id sobre pistas que el sistema ya no puede mapear

Esto reduce el riesgo de deltas inconsistentes sin exigir al modelo que reverse-engineeree
todo Strudel a pistas.

---

### 5. Añadir guardas de seguridad en el pipeline

**Archivo:** `src/lib/llm/pipeline.ts`

Si el contexto llega en modo código sin `previous` fiable:

- No aplicar `add`, `update` o `remove` sobre un patrón viejo o vacío como si fuera correcto
- Aceptar `replace` como operación segura
- Si llega un delta incremental incompatible con el contexto, tratarlo como error uniforme (BR-003)

```typescript
if (context.codeMode?.enabled && !context.previous) {
  // solo replace es seguro
}
```

La implementación concreta puede variar, pero el principio no:

- no aplicar deltas incrementales sobre una base obsoleta
- no fingir que el grid sigue siendo la fuente de verdad

---

### 6. Tests

Añadir cobertura focalizada para este contrato.

**Archivos sugeridos:**

- `src/features/prompt/hooks/__tests__/usePatternGen.test.ts`
- `src/lib/llm/__tests__/claude.adapter.test.ts`
- `src/lib/llm/__tests__/pipeline.test.ts`
- `src/app/api/generate-pattern/__tests__/route.test.ts`

Casos mínimos:

- `usePatternGen` NO envía `previous.tracks` obsoletos cuando `isCodeManuallyEdited === true`
- El adapter incluye la señal de "modo código" en el prompt enviado al proveedor
- El pipeline acepta `replace` en modo código sin snapshot estructurado
- El pipeline rechaza o deriva a fallback un `update/remove/add` cuando el contexto no tiene base fiable

---

## Escenarios BDD a verificar

```
Scenario: Prompt en modo grid conserva contexto incremental
  Given el patrón actual sigue sincronizado con el grid
  When el usuario envía un nuevo prompt
  Then la app envía `previous` con bpm, tracks y strudelCode
  And el comportamiento incremental actual no cambia

Scenario: Prompt en modo código no reutiliza pistas obsoletas
  Given el usuario ha editado Strudel manualmente y el grid ya no refleja el patrón real
  When el usuario envía un nuevo prompt
  Then la app marca explícitamente el contexto como "modo código"
  And no envía `previous.tracks` obsoletos como fuente de verdad

Scenario: Delta incremental inseguro en modo código
  Given el contexto actual está en modo código sin snapshot estructurado fiable
  When el proveedor devuelve un `update`, `add` o `remove`
  Then el pipeline no aplica ese delta sobre pistas obsoletas
  And el sistema usa el manejo uniforme de error/fallback (BR-003)

Scenario: Replace completo en modo código
  Given el contexto actual está en modo código sin snapshot estructurado fiable
  When el proveedor devuelve un `replace`
  Then el pipeline acepta el patrón como reemplazo seguro
  And el audio se actualiza sin interrumpirse (BR-001)
```

---

## Archivos a modificar

- `src/lib/types/session.ts` — extender contrato de `SessionContext`
- `src/features/prompt/hooks/usePatternGen.ts` — construir contexto grid/code coherente
- `src/app/api/generate-pattern/route.ts` — propagar nuevo contexto
- `src/lib/llm/prompts/systemPrompt.ts` — reglas para modo código
- `src/lib/llm/adapters/claude.adapter.ts` — serializar contexto de modo código para Claude
- `src/lib/llm/pipeline.ts` — guardas para evitar deltas incrementales inseguros
- `src/features/prompt/hooks/__tests__/usePatternGen.test.ts` — tests de construcción de contexto
- `src/lib/llm/__tests__/claude.adapter.test.ts` — tests del prompt
- `src/lib/llm/__tests__/pipeline.test.ts` — tests de guardas de seguridad
- `src/app/api/generate-pattern/__tests__/route.test.ts` — tests del contrato API
