## TASK-05 — Incrementalidad de pistas (PatternDelta)

### Estado
✅ Implementada

### Objetivo
TASK-05 cambia el contrato entre el LLM y la app para que las modificaciones musicales no dependan de snapshots completos del patrón. En lugar de devolver siempre `{ bpm, tracks }`, el provider puede devolver un `PatternDelta` con operaciones incrementales sobre el patrón actual.

Esto permite cumplir mejor estas reglas de negocio:
- BR-004: añadir no destruye pistas existentes
- BR-005: referencias a pistas inexistentes no rompen el flujo; generan warning
- BR-006: el patrón resultante nunca supera 5 pistas
- BR-001: el audio no debe interrumpirse al aplicar cambios incrementales

### Cambio de contrato
Contrato anterior:

```json
{ "bpm": 138, "tracks": [...] }
```

Contrato nuevo:

```json
{
  "bpm": 138,
  "operations": [
    { "type": "add", "track": { ... } },
    { "type": "update", "id": "kick-1", "patch": { ... } },
    { "type": "remove", "id": "hihat-1" },
    { "type": "replace", "tracks": [ ... ] }
  ]
}
```

### Archivos tocados
- [src/lib/types/audio.ts](src/lib/types/audio.ts)
- [src/lib/types/api.ts](src/lib/types/api.ts)
- [src/lib/llm/validation.ts](src/lib/llm/validation.ts)
- [src/lib/llm/adapters/claude.adapter.ts](src/lib/llm/adapters/claude.adapter.ts)
- [src/lib/llm/applyDelta.ts](src/lib/llm/applyDelta.ts)
- [src/lib/llm/pipeline.ts](src/lib/llm/pipeline.ts)
- [src/lib/llm/prompts/systemPrompt.ts](src/lib/llm/prompts/systemPrompt.ts)
- [src/features/prompt/hooks/usePatternGen.ts](src/features/prompt/hooks/usePatternGen.ts)
- [src/app/api/generate-pattern/route.ts](src/app/api/generate-pattern/route.ts)
- [src/store/sessionStore.ts](src/store/sessionStore.ts)

### Implementación
#### 1. Tipos del dominio
En [src/lib/types/audio.ts](src/lib/types/audio.ts) se añadieron `PatternOperation` y `PatternDelta`.

Operaciones soportadas:
- `add`: añade una pista al final
- `update`: modifica una pista por `id`
- `remove`: elimina una pista por `id`
- `replace`: reemplaza todo el patrón

El `LLMProvider` en [src/lib/types/api.ts](src/lib/types/api.ts) ya no devuelve `TrackJSON`, sino `PatternDelta`.

#### 2. Validación
En [src/lib/llm/validation.ts](src/lib/llm/validation.ts) se añadió `patternDeltaSchema` con `z.discriminatedUnion('type', ...)`.

Se mantiene `trackJsonSchema` para validar el estado final renderizable del dominio, mientras que `validatePatternDelta()` valida el payload incremental devuelto por el LLM.

#### 3. Adapter con compatibilidad legacy
En [src/lib/llm/adapters/claude.adapter.ts](src/lib/llm/adapters/claude.adapter.ts):
- `generatePattern()` ahora devuelve `Promise<PatternDelta>`
- el prompt de usuario incluye snapshot actual, BPM y `id` de pistas existentes
- se añadió `normalizeToDelta()` para tolerar respuestas antiguas en formato `{ bpm, tracks }`

Compatibilidad de rollout:
- si el LLM devuelve `operations`, se usa directamente
- si devuelve `tracks`, se envuelve automáticamente como `replace`

#### 4. Reducer puro de delta
En [src/lib/llm/applyDelta.ts](src/lib/llm/applyDelta.ts) se implementó el reducer puro que aplica operaciones sobre el patrón actual.

Comportamiento relevante:
- `add` rechaza la operación si ya hay 5 pistas y devuelve warning
- `update` con `id` inexistente no falla; devuelve warning
- `remove` con `id` inexistente no falla; devuelve warning
- `replace` trunca defensivamente a 5 pistas y devuelve warning si hubo exceso
- `bpm` se actualiza solo si viene en el delta

#### 5. Pipeline incremental
En [src/lib/llm/pipeline.ts](src/lib/llm/pipeline.ts) el flujo ahora es:
1. pedir `PatternDelta` al adapter
2. validar con `validatePatternDelta()`
3. aplicar `applyDelta(previous, delta)`
4. recompilar Strudel desde el patrón resultante
5. devolver `{ trackJson, warnings }`

El fallback sigue siendo uniforme ante errores de red o schema inválido.

#### 6. Prompt del sistema
En [src/lib/llm/prompts/systemPrompt.ts](src/lib/llm/prompts/systemPrompt.ts) se documentó el nuevo schema con ejemplos explícitos para `add`, `update`, `remove` y `replace`.

También se reforzó:
- máximo 5 pistas
- uso de ids existentes al actualizar o eliminar
- preferencia por `replace` solo en reinicios reales del patrón

#### 7. Propagación de warnings a UI
En [src/app/api/generate-pattern/route.ts](src/app/api/generate-pattern/route.ts) la API ya devuelve `warnings`.

En [src/features/prompt/hooks/usePatternGen.ts](src/features/prompt/hooks/usePatternGen.ts):
- los warnings se transforman en feedback no bloqueante
- se añade un turn de assistant con el texto de aviso
- `PromptBox` puede mostrar el aviso como info breve

Esto cubre BR-005 y BR-006 sin convertir estos casos en errores fatales.

#### 8. Store
En [src/store/sessionStore.ts](src/store/sessionStore.ts) se añadieron acciones auxiliares:
- `addTrack(track): boolean`
- `updateTrack(id, patch): boolean`

Estas acciones sirven para testing/debug y reflejan la semántica incremental de TASK-05.

### Flujo resultante
```text
PromptBox
  -> /api/generate-pattern
  -> ClaudeAdapter.generatePattern()
  -> PatternDelta
  -> validatePatternDelta()
  -> applyDelta(previous, delta)
  -> compileToStrudel(next)
  -> trackJson + warnings
  -> store/UI
```

### Reglas y edge cases cubiertos
- BR-004: documentada en [src/lib/llm/applyDelta.ts](src/lib/llm/applyDelta.ts) y [src/lib/llm/adapters/claude.adapter.ts](src/lib/llm/adapters/claude.adapter.ts)
- BR-005: warnings por `id` inexistente en [src/lib/llm/applyDelta.ts](src/lib/llm/applyDelta.ts)
- BR-006: límite defensivo en [src/lib/llm/applyDelta.ts](src/lib/llm/applyDelta.ts) y [src/store/sessionStore.ts](src/store/sessionStore.ts)
- BR-001: el pipeline recompila el nuevo código sin introducir llamadas nuevas a `stop()`
- EC-005: exceso de pistas del LLM se informa vía warnings

### Tests añadidos
- [src/lib/llm/__tests__/validation.test.ts](src/lib/llm/__tests__/validation.test.ts)
- [src/lib/llm/__tests__/applyDelta.test.ts](src/lib/llm/__tests__/applyDelta.test.ts)
- [src/lib/llm/__tests__/claude.adapter.test.ts](src/lib/llm/__tests__/claude.adapter.test.ts)

Cobertura validada:
- schema `PatternDelta`
- pureza y determinismo de `applyDelta`
- warnings por ids inexistentes
- rechazo al límite de 5 pistas
- compatibilidad del adapter con formato legacy

Resultado verificado:
- `3` archivos de test
- `21/21` tests passing

Comando ejecutado:

```bash
npm run test -- run src/lib/llm/__tests__/validation.test.ts src/lib/llm/__tests__/applyDelta.test.ts src/lib/llm/__tests__/claude.adapter.test.ts
```

### Riesgo pendiente
Hay una advertencia funcional detectada en revisión: [src/store/sessionStore.ts](src/store/sessionStore.ts) implementa `addTrack()` sin sincronizar `uiState` ni `isPlaying`. No bloquea la implementación principal de TASK-05 porque el flujo productivo usa `loadPattern()`, pero sí deja una inconsistencia potencial para uso manual/debug.

### Veredicto
✅ TASK-05 documentada y lista para handoff
