---
id: TASK-11
status: pending
---

# TASK-11 — Hap highlighting (visualización de pasos tocándose)

**Depende de:** TASK-10 completada
**CAP:** CAP-NLM-008 (extensión visual avanzada)
**Spec de referencia:** `nlmusic-spec.md` Sección 5 (BR-001, BR-009)

---

## Objetivo

Añadir al editor CodeMirror la visualización en tiempo real de cada evento
sonoro (hap) sobre el código que lo produce — igual que strudel.cc:
cuando suena un golpe, el token correspondiente del código se resalta
brevemente.

---

## Contexto técnico

Strudel expone, durante la evaluación, la localización (offset inicio/fin)
de cada hap en el código fuente. La extensión `highlightMiniLocations`
de `@strudel/codemirror` consume esos eventos y pinta decoraciones.

El camino esperado:

```
_evaluate(code)  →  onTrigger / ciclo Strudel emite haps con (begin, end, time)
                 →  extensión de CodeMirror recibe los eventos
                 →  decorations en StateEffect → flash temporal sobre el rango
```

**Punto clave:** esto **solo es posible con CodeMirror**. Un `<textarea>` no
puede decorar caracteres individuales. Por eso TASK-11 depende de TASK-10.

---

## Reglas que debe cumplir

- **BR-001:** La visualización no puede afectar al timing del audio ni causar drops
- **BR-009:** El highlighting sigue al código real — si el usuario edita, los rangos se recalculan en el siguiente ciclo
- **EC-006:** Si el código es inválido, no hay haps que pintar — el editor queda estático sin errores visuales

---

## Plan de trabajo

### 1. Investigación previa (obligatoria, ~30 min)

**No asumir la API sin leer.** Antes de implementar, verificar en el repo
Strudel (https://github.com/tidalcycles/strudel):

- Qué export exacto provee `@strudel/codemirror` para hap highlighting
  (candidatos: `highlightMiniLocations`, `highlightExtension`, `flash`)
- Cómo se conecta ese extension con el ciclo de `evaluate`/`scheduler` que
  ya usa `useStrudel` en nuestro proyecto (vía `@strudel/web`)
- Si `@strudel/web@1.3` expone un `onTrigger`/`setHighlightListener` usable
  desde el cliente, o si hace falta pasar por un scheduler explícito

Registrar los hallazgos en un bloque `## Hallazgos` al final de este archivo
antes de implementar. Si la API ha cambiado entre versiones, decidir:
- **A**: actualizar `@strudel/web` al minor compatible con `@strudel/codemirror`
- **B**: implementar fallback con `useBeatClock` (resalta sólo el paso global 0-15)

### 2. Integración de la extensión

**Archivo:** `src/features/code-view/components/StrudelEditor.tsx`

Añadir:
- Una prop `enableHapHighlighting?: boolean` (default: `true`)
- La extensión de highlighting al array de extensiones del `EditorState`
- Un puente entre el `useStrudel` (nivel app) y el `EditorView` (nivel editor)
  que entregue los eventos de hap al plugin

El puente puede vivir en `useStrudel.ts` (exponer un `onHap` o un EventEmitter)
o en un hook nuevo `useHapEvents` que suscribe al scheduler de Strudel.

### 3. Theme de flash

**Archivo:** `src/features/code-view/theme/nlmusicTheme.ts`

- Clase `.cm-hap-flash` con animación de `box-shadow` + `background` en `var(--cyan)`
- Duración: 100-150ms
- Fade-out con `transition`
- El color puede variar por tipo de instrumento (cyan kick, amber snare, violet hihat) si la API expone el sample
- Si no expone el sample, usar un único color (`var(--cyan)`)

### 4. Throttle / seguridad

- Limitar el número máximo de decorations simultáneas (ej: ~64) para no saturar el DOM en patrones densos
- Usar `StateEffect` acumulado y un `DecorationSet` reutilizable — **no** crear decorations nuevas cada frame
- Limpiar decoraciones viejas en cada tick del scheduler

### 5. Fallback degradado

Si el API esperado no está disponible (caso B de la investigación):

- Resaltar **solo el paso actual global** (0-15) sincronizado con `useBeatClock`
- Pintar una franja tenue detrás del rango aproximado del token que representa ese paso (best effort)
- No es idéntico a strudel.cc pero ofrece feedback visual mínimo

Este fallback debe quedar claramente comentado como "degraded mode" para que
si en un sprint futuro se actualiza `@strudel/web`, la ruta principal sea
recuperable sin reescribir todo.

---

## Riesgos conocidos

1. **Rendimiento** — a 138 BPM con 16 pasos y 4 pistas activas, llegan ~35 haps/seg. Una implementación ingenua (decoration nueva por hap, full re-render del editor) puede tirar el FPS por debajo de 60. Medir con DevTools antes de cerrar.
2. **Tab inactiva** — si el usuario cambia a otra pestaña del navegador, el scheduler sigue pero la UI no repinta. Verificar que no se acumulan decorations (memoria) al volver.
3. **Desacople editor-pausado** — si el audio está en `PAUSED`, no debe haber highlighting. Garantizar que la suscripción se cancela al parar (no solo cuando se desmonta el componente).
4. **Conflicto con edición** — si el usuario está escribiendo y llega un hap, la decoración no debe desplazar el cursor ni alterar la selección.

---

## Escenarios BDD a verificar manualmente

```
Scenario: Haps pintan tokens al sonar
  Given hay un patrón sonando
  When el motor dispara un kick
  Then el token `s("bd")` (o equivalente) recibe un flash visible de ~150ms
  And el flash desaparece antes del siguiente hap

Scenario: El highlighting se detiene al pausar
  Given hay un patrón sonando con highlighting activo
  When el usuario pulsa Stop
  Then no aparecen más flashes en el editor
  And el editor queda limpio

Scenario: La edición no se ve afectada
  Given el patrón está sonando y el editor tiene highlighting activo
  When el usuario escribe en el editor
  Then el cursor no se mueve por los flashes
  And la escritura no se ralentiza perceptiblemente

Scenario: Fallback degradado (si el API no está disponible)
  Given `@strudel/web` no expone `onTrigger` / locations
  When el patrón está sonando
  Then se resalta al menos el paso global actual (0-15)
  And no se lanza ningún error en consola
```

---

## Archivos a crear / modificar

- `src/features/code-view/components/StrudelEditor.tsx` — añadir extensión de hap highlighting
- `src/features/code-view/theme/nlmusicTheme.ts` — añadir estilos `.cm-hap-flash`
- `src/features/audio/hooks/useStrudel.ts` — exponer suscripción a haps (si hace falta puente)
- Posible nuevo: `src/features/audio/hooks/useHapEvents.ts` — hook dedicado a la suscripción
- `package.json` — actualizar `@strudel/web` si la investigación concluye que es necesario

---

## Fuera de alcance

- Cambio de tipografía o tamaño — se hereda de TASK-10
- Animaciones complejas estilo "particle system" — un flash simple es suficiente para v1
- Visualización de los mismos haps fuera del editor (p. ej. en el grid) — ya lo hace el `BarIndicator`

---

## Hallazgos

<!-- Rellenar tras el paso 1 (investigación previa) antes de implementar -->

- API exacta de `@strudel/codemirror`: _pendiente_
- Compatibilidad con `@strudel/web@1.3.0`: _pendiente_
- ¿Hace falta upgrade?: _pendiente_
- Decisión sobre fallback degradado: _pendiente_
