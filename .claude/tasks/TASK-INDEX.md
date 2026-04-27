# TASK-INDEX — Índice de tareas Sprint 2

> Orden de ejecución, dependencias, **estado** y criterios de revisión específicos por tarea.
> El protocolo de revisión común está en REVIEW-PROTOCOL.md.

---

## Mecanismo de tracking

Cada `TASK-XX-*.md` lleva un frontmatter YAML con `status: done | in-progress | pending`,
`completed_commit` y `completed_date` cuando aplica. Este índice mantiene la vista
agregada (checklist abajo). Para listar pendientes desde la terminal:

```bash
grep -l "^status: pending" .claude/tasks/TASK-*.md
```

**Al cerrar una task:**
1. Cambia `status: pending` → `status: done` en el frontmatter del archivo
2. Añade `completed_commit:` y `completed_date:`
3. Marca `[x]` en el checklist de abajo
4. Actualiza la sección "Estado actual del proyecto" en `CLAUDE.md` si la task introdujo cambios estructurales (nuevas dependencias, nuevos directorios, cambios en el modelo de datos)

---

## Estado y orden de ejecución

- [x] **TASK-01** — Validación e2e (auditoría) · `c462484` · 2026-04-23
- [x] **TASK-02** — Robustez inicialización Strudel (EC-010) · `c462484` · 2026-04-23
- [x] **TASK-03** — Límite máximo 5 pistas (BR-006) · `3281748` · 2026-04-23
- [x] **TASK-04** — Estado ERROR con reintento · `fdfa46c` · 2026-04-23
- [x] **TASK-05** — Incrementalidad de pistas (PatternDelta) · `0b654c9` · 2026-04-24
- [x] **TASK-06** — Coherencia compiler + contrato API · `6aa9dc4` · 2026-04-24
- [x] **TASK-07** — Eliminar pista desde UI · `7ec08f9` · 2026-04-24
- [x] **TASK-08** — StrudelCodePanel editable (textarea) · `177f001` · 2026-04-24
- [x] **TASK-09** — Contexto LLM coherente en modo código · `pending-fill-after-commit` · 2026-04-27
- [ ] **TASK-10** — Editor Strudel con CodeMirror (syntax highlighting)  ← siguiente
- [ ] **TASK-11** — Hap highlighting en tiempo real
- [ ] **TASK-12** — Tercera pestaña config/guía (+ toggle editor avanzado/simple)
- [ ] **TASK-13** — Multiidioma UI (ES / EN)

**Dependencias clave:**
- TASK-04 desbloquea TASK-05 y TASK-07
- TASK-05 desbloquea TASK-06
- TASK-07 desbloquea TASK-08
- TASK-08 desbloquea TASK-09 y TASK-10
- TASK-10 desbloquea TASK-11
- TASK-08, TASK-10 y TASK-11 desbloquean TASK-12
- TASK-12 desbloquea TASK-13

**Nota sobre el orden TASK-08 → TASK-09 → TASK-10:**
TASK-09 se ejecuta antes de TASK-10 porque cierra el contrato cliente/API/pipeline
del modo código sobre la base estable del textarea. TASK-10 solo cambia el visor
sin tocar ese contrato — así la migración a CodeMirror no interfiere con cambios
de semántica en el pipeline. TASK-11 añade visualización encima del editor ya
migrado, y TASK-12 cierra con el toggle "editor simple / avanzado".

---

## Criterios de revisión específicos por tarea

Además del REVIEW-PROTOCOL.md, cada tarea tiene verificaciones propias.
Añade estas al Paso 2 del protocolo cuando revises esa tarea.

---

### TASK-01 — Validación e2e

**No genera código — genera un informe.**
Criterio de éxito: el informe dice "Listo para validación en navegador: SÍ"
y no hay issues bloqueantes pendientes.

Revisión específica:
- [ ] El informe cubre los 7 puntos del flujo (Prompt → API → Pipeline → Adapter → Store → Strudel → Audio)
- [ ] Cada issue tiene severidad asignada (BLOQUEANTE / MAYOR / MENOR)
- [ ] Los issues bloqueantes están resueltos antes de cerrar TASK-01

---

### TASK-02 — Robustez inicialización Strudel

Revisión específica (EC-010):
- [ ] Si `initStrudel()` falla, `initError` no es null
- [ ] El banner de error es persistente — no se puede cerrar
- [ ] Play, BPM y PromptBox están deshabilitados cuando `initError !== null`
- [ ] El botón "Recargar" llama a `window.location.reload()`
- [ ] El error aparece aunque la consola esté cerrada (no solo `console.error`)

Prueba manual sugerida:
Simular el fallo forzando un error en `useStrudel.ts` antes de `initStrudel()`.
Verificar que el banner aparece y los controles se deshabilitan.

---

### TASK-03 — Límite máximo 5 pistas

Revisión específica (BR-006, EC-004, EC-005):
- [ ] El schema Zod rechaza o trunca arrays con más de 5 tracks
- [ ] `loadPattern` en el store aplica `.slice(0, 5)` defensivamente
- [ ] El system prompt incluye la restricción de 5 pistas explícitamente
- [ ] El contador "Pistas: N / 5" es visible en la UI
- [ ] Cuando `tracks.length === 5` el contador cambia de color a `var(--amber)`
- [ ] Si el LLM devuelve más de 5, el flag `truncated` se propaga hasta la UI

Prueba manual sugerida:
Con 4 pistas activas, pedir al LLM "añade 3 instrumentos nuevos".
Verificar que aparecen exactamente 5 pistas y el mensaje de truncamiento.

---

### TASK-04 — Estado ERROR con reintento

Revisión específica (BR-002, BR-003, EC-001, EC-002):
- [ ] El estado `error` existe en el store con `lastError` y `lastPrompt`
- [ ] El prompt NO se borra al entrar en ERROR
- [ ] El prompt SÍ se borra cuando LOADING termina con éxito
- [ ] El botón "Reintentar" reutiliza `lastPrompt` — no requiere reescribir
- [ ] El audio sigue sonando en estado ERROR si había pistas (BR-001)
- [ ] El mensaje de error usa `var(--red)` para el icono/borde

Prueba manual sugerida:
Desconectar la red y enviar un prompt. Verificar que el audio no se interrumpe,
el prompt queda intacto y el botón de reintento funciona al reconectar.

---

### TASK-05 — Incrementalidad de pistas (PatternDelta)

Revisión específica (BR-004, BR-005, BR-006):
- [ ] El LLM puede devolver `add`, `update`, `remove`, `replace`
- [ ] `applyDelta` es un reducer puro — mismo input → mismo output
- [ ] `update` con id inexistente → warning, no falla (BR-005)
- [ ] `remove` con id inexistente → warning, no falla (BR-005)
- [ ] `add` con 5 pistas existentes → rechazado con warning (BR-006)
- [ ] El parser tolerante acepta el formato viejo `{ bpm, tracks }` como `replace`
- [ ] El audio no se interrumpe en operaciones `add` y `update` (BR-001)
- [ ] Los warnings son visibles al usuario, no solo en consola

Prueba manual sugerida:
Con 2 pistas, pedir "añade un hi-hat". Verificar que kick y snare siguen
sonando sin interrupción mientras se añade la tercera pista.

---

### TASK-06 — Coherencia compiler + contrato API

Revisión específica:
- [ ] Las pistas en mute permanecen en el `stack()` con `gain(0)` — no se filtran
- [ ] El toggle de mute no provoca cambio perceptible en el audio de otras pistas
- [ ] El contrato API tiene semántica clara: `success: true` solo cuando el patrón es válido y aplicado
- [ ] `currentPattern` y `previous` usan el mismo nombre en todos los archivos
- [ ] No hay referencias al nombre antiguo en ningún archivo

Prueba manual sugerida:
Con 3 pistas, mutear la del medio y verificar que las otras dos no cambian
de timing ni volumen perceptiblemente.

---

### TASK-07 — Eliminar pista desde UI

Revisión específica (BR-007, EC-007, EC-008):
- [ ] El botón ✕ no muestra confirmación (BR-007)
- [ ] El audio de las pistas restantes continúa sin corte (BR-001)
- [ ] Eliminar última pista en PLAYING → IDLE (EC-007)
- [ ] Eliminar última pista en PAUSED → IDLE (EC-008)
- [ ] El botón ✕ tiene `var(--red)` en hover
- [ ] La acción no tiene deshacer

Prueba manual sugerida:
Con 3 pistas sonando, eliminar la del medio. Verificar que las otras 2
siguen sin corte. Luego eliminar las 2 restantes de una en una y verificar
que al eliminar la última el sistema vuelve a IDLE.

---

### TASK-08 — StrudelCodePanel editable

Revisión específica (BR-009, EC-006):
- [ ] El editor acepta input de texto
- [ ] El debounce de 600ms está implementado — no evalúa en cada tecla
- [ ] Código inválido → error inline visible, audio sin cambios (EC-006)
- [ ] Código válido → audio actualizado en el siguiente ciclo
- [ ] Edición del grid → el editor refleja el nuevo código (Grid → Editor)
- [ ] El "modo código" se indica visualmente cuando el grid no puede parsear el código

Prueba manual sugerida:
Editar el código Strudel manualmente con un error de sintaxis.
Verificar que el audio no cambia y el error es visible.
Luego corregir el error y verificar que el audio se actualiza.

---

### TASK-09 — Contexto LLM coherente en modo código

Revisión específica (BR-003, BR-004, BR-005, BR-009):
- [ ] `SessionContext` distingue explícitamente grid mode vs code mode
- [ ] `usePatternGen` no envía `previous.tracks` obsoletos cuando `isCodeManuallyEdited === true`
- [ ] El adapter/prompt informa al LLM de que `strudelCode` es la fuente de verdad en modo código
- [ ] El pipeline no aplica `add/update/remove` sobre un patrón previo no fiable en modo código
- [ ] `replace` sigue funcionando como operación segura cuando el contexto solo tiene `strudelCode`
- [ ] El flujo normal en grid mode no cambia

Prueba manual sugerida:
Editar el código Strudel hasta entrar en modo código y luego enviar un prompt como
"hazlo más lento" o "añade un hi-hat". Verificar que la request no recicla pistas
obsoletas como fuente de verdad y que el sistema no aplica deltas incrementales
sobre un patrón que ya no coincide con el audio actual.

---

### TASK-10 — Editor Strudel con CodeMirror (syntax highlighting)

Revisión específica (BR-009, EC-006, EC-010):
- [ ] `@strudel/codemirror` y el core de CodeMirror 6 están instalados y fijados a un minor compatible
- [ ] El editor carga vía `dynamic(..., { ssr: false })` — no rompe el build de Next
- [ ] El highlighting usa la paleta del design system: keywords `--cyan`, strings `--amber`, números `--violet`, comentarios atenuados
- [ ] La sincronización Grid → Editor sigue funcionando (edita un paso, el código se actualiza con colores)
- [ ] La sincronización Editor → Grid sigue funcionando (debounce de 600ms, `parseStrudelToTrackJson` se invoca igual)
- [ ] El error inline de EC-006 sigue apareciendo y el audio anterior no se interrumpe
- [ ] `isCodeManuallyEdited` se marca correctamente en el store al editar (no se ha perdido la semántica de TASK-08)
- [ ] No hay bucles de update: editar desde fuera no dispara `onChange` del editor
- [ ] El bundle no crece más de ~350 KB gzip respecto a antes de TASK-10

Prueba manual sugerida:
Abrir la pestaña Strudel, verificar highlighting correcto. Editar el grid
en la pestaña Sequencer y volver: el código debe reflejar el cambio con colores.
Escribir código inválido en el editor: debe aparecer el banner rojo sin cortar el audio.

---

### TASK-11 — Hap highlighting en tiempo real

Revisión específica (BR-001, BR-009):
- [ ] El bloque `## Hallazgos` de la task está rellenado con la API real encontrada
- [ ] Cuando el audio suena, los tokens del código reciben un flash visible de ~100-150ms
- [ ] El FPS del editor se mantiene ≥ 55 con 4 pistas a 138 BPM (medir con DevTools)
- [ ] Al pausar el audio, las decoraciones se limpian y no aparecen más flashes
- [ ] Al desmontar el componente, la suscripción al scheduler se cancela (sin leaks de memoria)
- [ ] Editar el código mientras suena no desplaza el cursor ni ralentiza la escritura
- [ ] Si `@strudel/web` no expone la API esperada, el fallback degradado (resaltar paso global) funciona sin errores en consola
- [ ] El código es parseable: si se produce un error de runtime en el scheduler, no se pinta highlighting corrupto

Prueba manual sugerida:
Arrancar un patrón de 3 pistas y observar el editor Strudel: los tokens `"bd"`, `"sd"`, `"hh"`
deben flashear al ritmo del audio. Pulsar Stop: las decoraciones paran. Re-arrancar y editar
el código mientras suena — no debe haber jank perceptible.

---

### TASK-12 — Tercera pestaña config/guía

Revisión específica (CAP-NLM-010):
- [ ] La pestaña existe y es navegable
- [ ] El estado del motor Strudel es correcto (`isReady`)
- [ ] Los ejemplos de prompt son clickables e insertan el texto en el PromptBox
- [ ] Al hacer click en un ejemplo se cambia a la pestaña Sequencer
- [ ] El diseño usa las CSS variables del design system — sin colores hardcodeados
- [ ] Hay espacio previsto para el formulario de API key de v1+ (no implementado, solo el espacio)
- [ ] Toggle `editor` (avanzado/simple) persiste en localStorage y cambia el componente renderizado en el panel Strudel
- [ ] Toggle `highlighting` desactiva los colores sin romper el editor avanzado
- [ ] Toggle `hapVisualization` solo se muestra cuando `editor === 'advanced'`
- [ ] Cambiar cualquier toggle no interrumpe el audio (BR-001)

---

### TASK-13 — Multiidioma UI

Revisión específica (Sección 10):
- [ ] ES y EN están completos — ninguna key sin traducir
- [ ] El system prompt del LLM NO se localiza (siempre inglés)
- [ ] La preferencia de idioma persiste en localStorage
- [ ] El selector de idioma es visible y funcional
- [ ] El cambio de idioma es inmediato — sin recarga de página
- [ ] Los mensajes de error técnicos de Strudel se muestran en inglés (no se localizan)

Prueba manual sugerida:
Cambiar a EN, recargar la página, verificar que el idioma persiste.
Volver a ES y verificar que todos los textos están en español.

---

## Cómo usar este índice con Claude Code

Para ejecutar una tarea con revisión incluida:

```
Ejecuta la tarea en .claude/tasks/TASK-XX-nombre.md.
Al terminar, aplica el protocolo de REVIEW-PROTOCOL.md
y los criterios específicos de TASK-XX en TASK-INDEX.md.
```

Para revisar sin reimplementar:

```
Lee el código relacionado con TASK-XX y ejecuta únicamente
la revisión de REVIEW-PROTOCOL.md + criterios de TASK-XX
en TASK-INDEX.md. No modifiques código a menos que encuentres
un issue bloqueante.
```
