# TASK-01 — Validación e2e: Auditoría del flujo completo

**Tipo:** Auditoría estática de código (no genera features nuevas)
**Desbloquea:** Todas las tareas siguientes
**Spec de referencia:** `nlmusic-spec.md` Sección 4 (Flujo Principal)

---

## Objetivo

Trazar el flujo completo `prompt → LLM → JSON → Strudel → audio` leyendo
el código. Verificar que todas las piezas conectan correctamente y que no
hay bugs estructurales antes de la validación en navegador.

---

## Qué auditar — paso a paso

Sigue exactamente este orden. Para cada punto, lee el archivo indicado
y verifica que el comportamiento es correcto.

### 1. Entrada del prompt

**Archivo:** `src/features/prompt/components/PromptBox.tsx`

Verifica:
- [ ] `Enter` envía, `Shift+Enter` nueva línea
- [ ] El input se bloquea durante LOADING (BR-010)
- [ ] Prompt vacío no genera llamada al LLM (BR-010)
- [ ] El campo de prompt NO se limpia si hay error (BR-003)
- [ ] El campo de prompt SÍ se limpia cuando LOADING termina con éxito

**Archivo:** `src/features/prompt/hooks/usePatternGen.ts`

Verifica:
- [ ] Llama a `/api/generate-pattern` — nunca directamente a Anthropic
- [ ] Pasa el contexto de sesión completo (turns, currentPattern)
- [ ] Gestiona el estado de carga (isLoading)
- [ ] Gestiona el estado de error y lo expone al componente

---

### 2. API Route

**Archivo:** `src/app/api/generate-pattern/route.ts`

Verifica:
- [ ] Solo acepta POST
- [ ] Valida que el prompt no esté vacío — devuelve 400 si lo está
- [ ] Lee ANTHROPIC_API_KEY de `process.env` — nunca del cliente (BR-011)
- [ ] Devuelve 500 si la API key no está configurada
- [ ] Pasa `sessionContext` completo al pipeline
- [ ] Devuelve `{ success: true, trackJson }` en caso de éxito
- [ ] Devuelve `{ success: false, error, usedFallback }` en caso de error

---

### 3. Pipeline LLM

**Archivo:** `src/lib/llm/pipeline.ts`

Verifica:
- [ ] Llama al adapter con prompt + context
- [ ] Valida la respuesta contra el schema Zod
- [ ] Si el LLM falla, activa el fallback (no lanza excepción sin capturar)
- [ ] El fallback devuelve un TrackJSON válido — nunca undefined

**Archivo:** `src/lib/llm/adapters/claude.adapter.ts`

Verifica:
- [ ] Usa el model correcto (`claude-sonnet-4-6`)
- [ ] El system prompt está en inglés (Sección 10)
- [ ] Pasa el contexto de sesión como parte del user prompt
- [ ] Intenta parsear JSON aunque venga con texto alrededor (tryParseJson)

**Archivo:** `src/lib/llm/prompts/systemPrompt.ts`

Verifica:
- [ ] El system prompt describe el schema JSON exacto que debe devolver
- [ ] Incluye ejemplos de código Strudel válido
- [ ] Está escrito en inglés

**Archivo:** `src/lib/llm/validation.ts`

Verifica:
- [ ] El schema Zod valida: `bpm` (número), `tracks[]`, `strudelCode` (string)
- [ ] Cada track valida: `id`, `name`, `steps` (array de 16 elementos), `volume`, `muted`, `solo`
- [ ] Si la validación falla, lanza un error descriptivo

---

### 4. Store — actualización de estado

**Archivo:** `src/store/sessionStore.ts`

Verifica:
- [ ] Existe acción para añadir/actualizar tracks desde TrackJSON
- [ ] Las pistas se añaden secuencialmente (BR-004)
- [ ] El límite de 5 pistas está implementado (BR-006)
- [ ] El BPM se actualiza desde el JSON del LLM
- [ ] El `strudelCode` se almacena en el store
- [ ] El historial de turns se actualiza correctamente
- [ ] El middleware `persist` está configurado — la sesión sobrevive a un reload

---

### 5. Compilación de código Strudel

**Archivo:** `src/features/audio/compiler.ts`

Verifica:
- [ ] Convierte correctamente TrackJSON en código Strudel ejecutable
- [ ] Los pasos activos se mapean correctamente a la mini-notation
- [ ] El BPM se aplica correctamente (`setcpm` o equivalente)
- [ ] El volumen por pista se aplica (`.gain()`)
- [ ] Pistas en mute se silencian sin eliminarse del código
- [ ] El código generado es consistente con el `strudelCode` que devuelve el LLM

---

### 6. Hook de audio

**Archivo:** `src/features/audio/hooks/useStrudel.ts`

Verifica:
- [ ] `@strudel/web` se carga vía dynamic import — NO CDN (nota crítica)
- [ ] `initStrudel()` se llama una vez al montar — y solo una vez
- [ ] `isReady` es false hasta que `initStrudel()` resuelve
- [ ] Si `initStrudel()` falla, se expone el error (EC-010)
- [ ] `play(code)` evalúa el código Strudel correctamente
- [ ] `stop()` llama a `hush()` — detiene el audio sin limpiar las pistas
- [ ] El audio se actualiza en el **siguiente ciclo** al cambiar el código (BR-001)

---

### 7. Conexión UI → Audio

**Archivo:** `src/features/transport/components/PlayControls.tsx`

Verifica:
- [ ] Play llama a `useStrudel.play(strudelCode)` con el código del store
- [ ] Stop llama a `useStrudel.stop()` — no limpia las pistas del store
- [ ] El estado visual (playing/stopped) refleja el estado real del audio

**Archivo:** `src/features/transport/components/BarIndicator.tsx`

Verifica:
- [ ] Lee el beat activo de `useBeatClock`
- [ ] Se sincroniza con el BPM del store

**Archivo:** `src/features/audio/hooks/useBeatClock.ts`

Verifica:
- [ ] El intervalo se recalcula cuando cambia el BPM
- [ ] El cursor se resetea a 0 cuando se llama a stop
- [ ] El ciclo es de 4 beats (0-3)

---

## Resultado esperado

Al terminar la auditoría, genera un informe con este formato:

```markdown
## Resultado TASK-01 — Auditoría e2e

### Flujo: ✅ Completo / ⚠️ Parcial / ❌ Roto

### Problemas encontrados
| # | Archivo | Descripción | Severidad |
|---|---|---|---|
| 1 | ... | ... | BLOQUEANTE / MAYOR / MENOR |

### Conexiones verificadas
- [ ] Prompt → API Route
- [ ] API Route → Pipeline
- [ ] Pipeline → Adapter → LLM
- [ ] Pipeline → Validation → Store
- [ ] Store → Compiler → Strudel
- [ ] Strudel → Audio (play/stop)
- [ ] BeatClock → BarIndicator

### Listo para validación en navegador: SÍ / NO
### Si NO, resolver primero: [lista de issues bloqueantes]
```

Si hay issues bloqueantes, corrígelos antes de marcar la tarea como completa.
