# NLMusic — Implementación: Panel Strudel Code

| Campo | Valor |
|---|---|
| Doc-ID | IMPL-NLM-008 |
| Capacidad relacionada | CAP-NLM-008 · Ver y editar código Strudel directamente |
| Spec de referencia | SPEC-NLM-000 v0.1 |
| Versión | 0.1 |
| Autor | Calcerrada |
| Fecha | 2026-04-22 |
| Estado | DRAFT |

> Documento técnico de implementación. No forma parte de la especificación funcional.
> Para el comportamiento esperado, reglas y criterios de aceptación de esta capacidad,
> consultar SPEC-NLM-000, secciones 5 (BR-009), 7 (EC-006) y 8 (CAP-NLM-008).

---

## Descripción

Feature planificada para v1. Proporciona un editor de código editable con resaltado de notas activas en tiempo real, usando el ecosistema oficial de Strudel.

---

## Cómo funciona el resaltado activo

El mecanismo tiene tres capas:

1. **El transpilador etiqueta cada token con su posición en el código fuente.**
   `evaluate(code)` de `@strudel/transpiler` parsea el código con `acorn` y añade
   metadatos de posición (`withMiniLocation`) a cada elemento de la mini-notation.
   Por ejemplo, en `s("bd ~ ~ ~")`, el token `bd` queda etiquetado como `{ from: 3, to: 5 }`.

2. **Cada evento disparado lleva esa posición.**
   Cuando el scheduler reproduce `bd` en el tiempo T, el evento incluye las coordenadas
   de ese token en el código fuente original.

3. **El plugin de CodeMirror lee los eventos activos en cada frame** y aplica decoraciones
   (`Decoration.mark`) sobre los rangos correspondientes. El resultado es el recuadro visual
   que aparece sobre `bd`, `sd`, `hh`... al estilo del REPL de strudel.cc.

---

## Pasos de implementación

```
1. Instalar dependencias
   npm i @strudel/web @strudel/webaudio @strudel/transpiler
   npm i @strudel/codemirror codemirror @codemirror/lang-javascript @codemirror/view @codemirror/state

2. Eliminar cualquier <script src="...strudel..."> de layout.tsx
   Reemplazar por: import { initStrudel } from '@strudel/web'
   Llamar initStrudel() una vez al arrancar la app (en useEffect en layout o page)

3. Actualizar useStrudel hook
   - play(code): usar evaluate(code) de @strudel/transpiler → pattern.play()
   - stop(): usar hush() de @strudel/web
   - isReady: true cuando initStrudel() resuelve

4. Crear components/code-view/StrudelCodePanel.tsx
   - Montar EditorView de CodeMirror con extensions:
       basicSetup
       javascript()        ← syntax highlighting
       strudelTheme        ← tema oscuro base de Strudel
       nlmusicTheme        ← override de colores del design system
       activatePattern()   ← resaltado de notas activas en tiempo real
   - EditorView.updateListener: onChange con debounce 600ms → re-evaluar código
   - useEffect para sincronizar código externo (cuando LLM genera nuevo patrón)

5. Crear components/code-view/ScopeCanvas.tsx  [CAP-NLM-012 · v1]
   - Importar getAudioContext de @strudel/webaudio (llamar después de initStrudel)
   - Crear AnalyserNode, conectar al destination del AudioContext
   - requestAnimationFrame: getByteFrequencyData → dibujar barras en canvas
   - Estilo: barras de frecuencia tipo píxeles grandes, color var(--cyan)
   - Fallback si getAudioContext no disponible: senoide simulada con Math.sin

6. Theming de CodeMirror para NLMusic
   - La clase del highlight activo es .strudel-highlight
   - Sobreescribir en nlmusicTheme:
       '.strudel-highlight': { outline: '1px solid rgba(0,255,200,0.6)', background: 'rgba(0,255,200,0.1)' }
   - Gutters: fondo #111116, color de números rgba(232,232,240,0.2)
   - Fondo del editor: transparent (el contenedor ya tiene el fondo correcto)

7. Integrar en page.tsx
   - StrudelCodePanel recibe: code (sessionStore.currentCode), onChange
   - ScopeCanvas: montar siempre, visible solo en tab 'code'
   - La tab "Strudel Code" muestra StrudelCodePanel + ScopeCanvas
```

---

## Archivos afectados

```
src/
├── hooks/
│   └── useStrudel.ts                    ← actualizar: evaluate() + hush() + getAudioContext()
├── components/
│   └── code-view/
│       ├── StrudelCodePanel.tsx         ← nuevo: CodeMirror + @strudel/codemirror
│       └── ScopeCanvas.tsx              ← nuevo: AnalyserNode + canvas frecuencias [v1]
└── app/
    └── layout.tsx                       ← actualizar: initStrudel() en lugar de CDN script
```

---

## Riesgos conocidos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| `getAudioContext()` no accesible en la versión de Strudel instalada | Medio | Fallback: senoide simulada con Math.sin hasta resolver; buscar en `@strudel/core` o en el objeto devuelto por `initStrudel()` |
| Sincronismo visual-audio (grid vs clock de Strudel) | Bajo → resuelto | `activatePattern()` gestiona el highlighting sincronizado con el scheduler interno automáticamente |

---

*Documento vivo — actualizar conforme avance la implementación.*
