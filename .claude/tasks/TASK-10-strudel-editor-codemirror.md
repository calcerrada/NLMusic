---
id: TASK-10
status: done
completed_commit: pending-fill-after-commit
completed_date: 2026-04-28
---

# TASK-10 — Editor Strudel con CodeMirror 6 (syntax highlighting)

**Depende de:** TASK-08 completada
**CAP:** CAP-NLM-008 (extensión visual — no altera el contrato funcional)
**Spec de referencia:** `nlmusic-spec.md` Sección 5 (BR-009), 7 (EC-006), 11 (Design System)

---

## Objetivo

Sustituir el `<textarea>` plano de `StrudelCodePanel` por un editor CodeMirror 6
con resaltado de sintaxis (syntax highlighting) idéntico al de strudel.cc,
preservando **íntegramente** la lógica bidireccional ya implementada en TASK-08
(`setManualCode`, `syncCodePattern`, debounce de 600ms, error inline, sync cuando
el textarea no está enfocado).

Esta tarea es **drop-in**: cambia cómo se pinta el editor, no qué hace.

---

## Reglas que debe cumplir

- **BR-009:** La sincronización bidireccional Grid ↔ Editor no debe romperse
- **BR-001:** Cambiar de editor no puede introducir cortes de audio
- **EC-006:** El error inline del debounce sigue funcionando igual
- **EC-010:** Si el motor Strudel falla, el editor sigue siendo editable pero no evalúa

---

## Decisiones de diseño

### Librerías

- `codemirror@^6` (core)
- `@codemirror/state`, `@codemirror/view`, `@codemirror/language`, `@codemirror/commands`
- `@codemirror/lang-javascript` — base léxica (Strudel es JS + mini-notation)
- `@strudel/codemirror` — extensiones oficiales Strudel (tokens de mini-notation, theme de referencia)

**Sin wrapper React de terceros** (`@uiw/react-codemirror` u otros) —
integramos CodeMirror directamente en un componente propio para controlar
el ciclo de vida y evitar incompatibilidades con React 19.

### SSR

- Cargar el editor vía `dynamic(() => import('./StrudelEditor'), { ssr: false })`
- CodeMirror toca `document` y `window` en su construcción — no puede SSR-rear

### Theme

- Replicar la paleta existente de `globals.css`:
  - Keywords (`stack`, `s`, `gain`, `cpm`, `slow`, `fast`, `silence`): `var(--cyan)`
  - Strings: `var(--amber)`
  - Números: `var(--violet)`
  - Comentarios: `rgba(98,114,164,0.6)` (ya usado en el highlight actual)
  - Selección: `rgba(0,255,200,0.15)`
  - Caret: `var(--cyan)`
  - Fondo: `transparent` (hereda de la card)
- Fuente: `JetBrains Mono`, tamaño `12px`, line-height `1.5`

### Contrato con el store (SIN cambios)

- Sigue usando `currentCode`, `setManualCode`, `syncCodePattern`, `tracks`, `isPlaying`, `isCodeManuallyEdited`
- Sigue usando `parseStrudelToTrackJson` tras el debounce
- El flag `isCodeManuallyEdited` sigue gobernando el "modo código" del grid

---

## Qué implementar

### 1. Nuevo componente `StrudelEditor`

**Archivo:** `src/features/code-view/components/StrudelEditor.tsx`

Responsabilidades:
- Montar una instancia de CodeMirror 6 en un div propio
- Recibir props: `value: string`, `onChange: (code: string) => void`, `onFocus`, `onBlur`, `disabled?: boolean`
- Aplicar el theme custom con la paleta del design system
- Sincronizar `value` externo → editor cuando cambia desde fuera (grid/LLM)
- Sincronizar editor → `onChange` en cada tecla (el debounce vive fuera)
- Exponer un ref que permita decorar rangos (para TASK-11)

No contiene lógica de Strudel ni de store — es un editor genérico con theme.

### 2. Refactor `StrudelCodePanel`

**Archivo:** `src/features/code-view/components/StrudelCodePanel.tsx`

- Sustituir el `<textarea>` por `<StrudelEditor />` cargado vía `dynamic(..., { ssr: false })`
- El resto de la lógica (debounce, `strudel.play`, `parseStrudelToTrackJson`,
  `setManualCode`, `syncCodePattern`, error inline) se mantiene sin cambios
- Eliminar el pintado casero de line numbers — CodeMirror incluye su propio gutter
- El osciloscopio y el banner de error siguen fuera del editor

### 3. Theme dedicado

**Archivo:** `src/features/code-view/theme/nlmusicTheme.ts`

Exportar un array de extensiones (`EditorView.theme`, `HighlightStyle`) que
replique la paleta. Vivirá aquí para poder reutilizarse en la pestaña de
configuración (TASK-12, toggle editor simple/avanzado).

### 4. Dependencias

```bash
npm install codemirror @codemirror/state @codemirror/view \
  @codemirror/language @codemirror/commands @codemirror/lang-javascript \
  @strudel/codemirror
```

Verificar que `@strudel/codemirror` es compatible con la versión de
`@strudel/web@^1.3.0` ya instalada. Si hay divergencia de versiones,
fijar ambos al mismo minor del monorepo Strudel.

---

## Riesgos conocidos

1. **Compatibilidad React 19.2** — montar CodeMirror desde `useEffect` con cleanup es seguro; evitar patrones que dependan de `useLayoutEffect` sincrónico con el DOM.
2. **Bundle size** — CodeMirror + Strudel añade ~200-300 KB gzip. Aceptado por el usuario mientras el rendimiento runtime no sufra.
3. **Doble cursor** — si el `value` externo cambia mientras el usuario está tecleando, hay que detectar si la update viene del propio editor y no reemitir `onChange` (evitar loops).
4. **Selection preservation** — al aplicar un `value` externo (por edición del grid), mantener la posición del cursor si el documento ha cambiado mínimamente; reset a `(0, 0)` si el cambio es estructural.

---

## Escenarios BDD a verificar manualmente

```
Scenario: Highlighting funciona desde el primer render
  Given la app arranca con el patrón por defecto en el store
  When el usuario cambia a la pestaña Strudel
  Then el código se muestra con keywords en cyan, strings en amber y comentarios atenuados

Scenario: La sincronización Grid → Editor se preserva
  Given hay pistas en el secuenciador y el usuario está en la pestaña Strudel
  When el usuario activa un paso en el grid (desde la pestaña Sequencer)
  Then el código del editor se actualiza automáticamente con highlighting

Scenario: La sincronización Editor → Grid se preserva
  Given el usuario edita el código y es parseable
  When pasan 600ms sin tecla
  Then el grid se actualiza y `isCodeManuallyEdited` es false

Scenario: Error inline sigue funcionando
  Given el usuario escribe código inválido
  When pasan 600ms sin tecla
  Then el banner de error se muestra bajo el editor
  And el audio anterior sigue sonando
  And el highlighting del código inválido NO rompe el editor
```

---

## Archivos a crear / modificar

- `package.json` — añadir deps de CodeMirror y `@strudel/codemirror`
- `src/features/code-view/components/StrudelEditor.tsx` — nuevo componente
- `src/features/code-view/theme/nlmusicTheme.ts` — nuevo theme dedicado
- `src/features/code-view/components/StrudelCodePanel.tsx` — sustituir textarea por `<StrudelEditor />`
- `src/features/code-view/index.ts` — exportar `StrudelEditor` si es útil fuera del panel

---

## Fuera de alcance

- **Hap highlighting** (visualización de pasos tocándose) → TASK-11
- **Toggle editor simple / avanzado** (fallback a textarea si el usuario prefiere) → TASK-12
- **Autocompletado / lint / tooltips** → se evalúa tras TASK-11; no es objetivo de esta tarea
