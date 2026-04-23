# TASK-INDEX — Índice de tareas Sprint 2

> Orden de ejecución, dependencias y criterios de revisión específicos por tarea.
> El protocolo de revisión común está en REVIEW-PROTOCOL.md.

---

## Orden de ejecución

```
TASK-01 — Validación e2e (auditoría)
    ↓ desbloquea todo
TASK-02 — Robustez inicialización Strudel
TASK-03 — Límite máximo 5 pistas
    ↓ ambas independientes, ejecutar en cualquier orden
TASK-04 — Estado ERROR con reintento
    ↓ máquina de estados completa
TASK-05 — Incrementalidad de pistas (PatternDelta)
    ↓ cambia el contrato LLM → necesaria antes de limpiezas
TASK-06 — Coherencia compiler + contrato API
    ↓ limpieza sobre lo anterior
TASK-07 — Eliminar pista desde UI
    ↓ transiciones IDLE completas
TASK-08 — StrudelCodePanel editable
    ↓ UI estable
TASK-09 — Tercera pestaña config/guía
    ↓ i18n requiere UI terminada
TASK-10 — Multiidioma UI
```

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

### TASK-09 — Tercera pestaña config/guía

Revisión específica (CAP-NLM-010):
- [ ] La pestaña existe y es navegable
- [ ] El estado del motor Strudel es correcto (`isReady`)
- [ ] Los ejemplos de prompt son clickables e insertan el texto en el PromptBox
- [ ] Al hacer click en un ejemplo se cambia a la pestaña Sequencer
- [ ] El diseño usa las CSS variables del design system — sin colores hardcodeados
- [ ] Hay espacio previsto para el formulario de API key de v1+ (no implementado, solo el espacio)

---

### TASK-10 — Multiidioma UI

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
