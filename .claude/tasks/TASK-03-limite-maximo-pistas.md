# TASK-03 — Límite máximo de 5 pistas (BR-006)

**Depende de:** TASK-01 completada
**CAP relacionadas:** CAP-NLM-001, CAP-NLM-003
**Spec de referencia:** `nlmusic-spec.md` Secciones 5 (BR-006), 7 (EC-004, EC-005), 8 (BDD CAP-NLM-001)
**Origen:** Hallazgo #3 de la auditoría TASK-01 — el límite de 5 pistas no está implementado en ninguna capa.

---

## Objetivo

Implementar el límite duro de 5 pistas en todas las capas del sistema:
schema de validación, store, system prompt del LLM y feedback al usuario.
Cubrir los edge cases EC-004 (usuario intenta crear pista 6) y EC-005
(LLM intenta crear más pistas de las disponibles).

---

## Reglas que debe cumplir

- **BR-006:** Máximo 5 pistas en el secuenciador
- **EC-004:** Usuario intenta crear la pista 6 → informar del límite, no crear
- **EC-005:** LLM quiere crear más pistas de las disponibles → informar al usuario, dejar decidir cuáles conservar
- **BR-001:** El audio nunca se interrumpe al rechazar pistas excedentes

---

## Capas afectadas

```
1. System prompt   — instruir al LLM a no superar 5 pistas
2. Validación Zod  — rechazar respuestas con > 5 pistas (o truncar con aviso)
3. Store           — loadPattern aplica el cap antes de actualizar
4. UI              — mostrar contador "Pistas: N / 5" y mensaje cuando se rebasa
```

---

## Qué implementar

### 1. System prompt — instrucción explícita

**Archivo:** `src/lib/llm/prompts/systemPrompt.ts`

Añadir reglas:
- "Maximum 5 tracks per pattern. Never return more than 5."
- "If the user requests more tracks than allowed, return 5 and include a note in the assistant turn explaining which were prioritized."
- Actualizar el ejemplo del prompt para reforzar el límite implícitamente.

---

### 2. Validación Zod — endurecer el límite

**Archivo:** `src/lib/llm/validation.ts`

Cambiar:
```typescript
tracks: z.array(trackSchema).min(1).max(8)  // actual
```
por:
```typescript
tracks: z.array(trackSchema).min(1).max(5)  // BR-006
```

El error de Zod ya es descriptivo y el pipeline activará el fallback si la
respuesta del LLM excede el límite. Sin embargo, perder toda la respuesta
por una pista de más es subóptimo — ver decisión de truncamiento abajo.

---

### 3. Decisión: truncar o rechazar

**Recomendación:** truncar a 5 pistas con aviso al usuario en vez de descartar
toda la respuesta del LLM. Razón: una respuesta con 6 pistas tiene valor
musical útil; perderla por un detalle de límite frustra al usuario.

Implementación en pipeline o adapter:

**Archivo:** `src/lib/llm/pipeline.ts`

```typescript
// Antes de validateTrackJson:
if (Array.isArray(raw?.tracks) && raw.tracks.length > 5) {
  raw.tracks = raw.tracks.slice(0, 5);   // BR-006: truncar
  // marcar el resultado para que la UI pueda informar
}
```

Devolver un flag adicional en `PipelineResult`:
```typescript
export interface PipelineResult {
  trackJson: TrackJSON;
  usedFallback: boolean;
  truncated?: boolean;          // nuevo: el LLM devolvió > 5, truncamos
  truncatedFrom?: number;       // nuevo: número original de pistas
  error?: string;
}
```

---

### 4. Store — cap defensivo en loadPattern

**Archivo:** `src/store/sessionStore.ts`

`loadPattern` debe aplicar el cap aunque la validación previa lo haya hecho
(defense in depth):

```typescript
loadPattern: (pattern) =>
  set({
    bpm: pattern.bpm,
    tracks: pattern.tracks.slice(0, 5),    // BR-006
    currentCode: compileCode(pattern.bpm, pattern.tracks.slice(0, 5)),
  }),
```

Si en el futuro existe `addTrack` (ver TASK-05 — incrementalidad), también
debe verificar `state.tracks.length < 5` antes de añadir y devolver false /
emitir un evento si se rechaza.

---

### 5. API route — propagar el aviso al cliente

**Archivo:** `src/app/api/generate-pattern/route.ts`

Incluir en la respuesta:
```typescript
return NextResponse.json({
  success: true,
  trackJson: result.trackJson,
  usedFallback: false,
  truncated: result.truncated,
  truncatedFrom: result.truncatedFrom,
});
```

---

### 6. UI — contador y feedback

**Archivo:** `src/features/sequencer/components/TrackZone.tsx` (o equivalente)

Mostrar contador en el header de la zona de pistas:
```
Pistas: 3 / 5
```
- Cuando `tracks.length === 5`: contador en `var(--amber)` para señalar que está al límite
- Cuando `tracks.length === 5` y el LLM intenta añadir: mostrar toast / banner
  "El LLM propuso N pistas, se mantuvieron 5 (límite). Elimina alguna para añadir más."

**Archivo:** `src/features/prompt/hooks/usePatternGen.ts`

Cuando la respuesta venga con `truncated: true`:
- Añadir un turn de assistant explicativo en el store
- Mostrar el aviso al usuario en el PromptBox (estilo info, no error)

---

## Escenarios BDD a verificar manualmente

```
Scenario: Estado normal por debajo del límite
  Given hay 3 pistas en el secuenciador
  Then el contador muestra "Pistas: 3 / 5" en color normal
  And el usuario puede pedir más pistas al LLM

Scenario: Llegada al límite
  Given hay 5 pistas en el secuenciador
  Then el contador muestra "Pistas: 5 / 5" en color amber
  And el usuario sigue pudiendo modificar pistas existentes

Scenario: LLM intenta superar el límite (EC-005)
  Given hay 0 pistas y el usuario pide "8 pistas de techno"
  When el LLM devuelve 8 pistas
  Then el sistema mantiene solo las 5 primeras
  And el audio arranca con esas 5 pistas
  And se muestra un aviso al usuario explicando el truncamiento

Scenario: Usuario intenta añadir manualmente una sexta pista (EC-004)
  Given hay 5 pistas en el secuenciador
  When el usuario o un futuro feature intenta añadir una sexta
  Then la operación se rechaza
  And se informa al usuario de que el límite es 5

Scenario: BR-001 se mantiene al rechazar pistas excedentes
  Given hay 5 pistas sonando y el LLM responde con 7
  Then el audio actual no se interrumpe durante el truncamiento
  And la nueva pista (truncada a 5) reemplaza el patrón en el siguiente ciclo
```

---

## Archivos a modificar

- `src/lib/llm/prompts/systemPrompt.ts` — instrucción de máximo 5 pistas
- `src/lib/llm/validation.ts` — `.max(5)` en el schema
- `src/lib/llm/pipeline.ts` — truncamiento + flags `truncated`
- `src/store/sessionStore.ts` — cap defensivo en `loadPattern`
- `src/app/api/generate-pattern/route.ts` — propagar `truncated` al cliente
- `src/features/prompt/hooks/usePatternGen.ts` — surfacing del aviso
- `src/features/sequencer/components/TrackZone.tsx` — contador "N / 5"
