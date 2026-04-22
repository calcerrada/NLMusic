# NLMusic — UI Design Spec para implementación

> Usa este archivo en **Copilot Agent mode** en VSCode.
> Prompt de arranque: *"Implement the NLMusic UI following this design spec exactly. Start with the component listed in ## Implementation Order."*

---

## Objetivo

Implementar la interfaz completa de NLMusic según el diseño aprobado. El mockup de referencia está en HTML puro al final de este documento (`## HTML Reference Mockup`). Úsalo como fuente de verdad visual y de comportamiento.

---

## Layout general

```
┌─────────────────────────────────────────┐
│  TRANSPORT BAR (fija, arriba)           │
│  [app name]  [■][▶]  [-]138[+]  [■□□□] │
├─────────────────────────────────────────┤
│  TABS: [Sequencer] [Strudel Code]       │
├─────────────────────────────────────────┤
│                                         │
│  TRACK ZONE (scrollable)                │
│  · Empty state si no hay pistas         │
│  · TrackCard por cada pista generada    │
│                                         │
├─────────────────────────────────────────┤
│  PROMPT BOX (fija, abajo)               │
│  [textarea expandible]        [send →]  │
└─────────────────────────────────────────┘
```

---

## Componentes — especificación detallada

### 1. `TransportBar`

Barra fija en la parte superior. Fondo `var(--surface)`, borde inferior `1px solid var(--border)`.

Contiene, centrados horizontalmente:
- Nombre de la app a la izquierda (posición absoluta): `NLMusic`, 11px, letter-spacing 0.18em, `var(--text-muted)`, uppercase
- `PlayControls` — botones play y stop
- `BpmControl` — número con +/-
- `BarIndicator` — 4 rectángulos

**Props:** ninguna (lee de sessionStore)

---

### 2. `PlayControls`

```tsx
// Comportamiento:
// - Play: toggle. Activo → fondo cyan-dim, borde cyan, glow sutil
// - Stop: momentáneo (flash activo 200ms). Resetea beat a 0
// - Status dot: punto 5px, cyan pulsante cuando playing, gris cuando stopped
```

**Estado en store:** `isPlaying: boolean`

---

### 3. `BpmControl`

```tsx
// Muestra un número (60-220) con botón − a la izquierda y + a la derecha
// Botones: 22x22px, border var(--border), hover → cyan
// Número: 22px, font-weight 700, min-width 48px centrado
// Label "BPM" encima o a la izquierda: 9px, uppercase, var(--text-muted)
// Al cambiar BPM → actualizar store → useBeatClock recalcula interval
```

**Props:** ninguna (lee/escribe sessionStore.bpm)

---

### 4. `BarIndicator`

```tsx
// 4 rectángulos: 28x8px, border-radius 2px
// Estado por rectángulo:
//   - Pasado: rgba(0,255,200,0.2) — "encendido tenue"
//   - Activo:  var(--cyan) + box-shadow 0 0 8px rgba(0,255,200,0.5)
//   - Futuro:  rgba(255,255,255,0.06) — apagado
// El índice activo viene de useBeatClock (0-3, ciclo de 4 beats)
```

---

### 5. `TrackZone`

Contenedor scrollable entre el tab bar y el prompt. `padding: 20px`, `gap: 10px`.

```tsx
// Si tracks.length === 0 → mostrar EmptyState
// Si tracks.length > 0 → mapear TrackCard por cada track
```

**EmptyState:**
```tsx
// Centrado, opacity 0.25, pointer-events none
// Icono: "◈" (texto unicode, 28px)
// Texto: "Describe tu patrón abajo para empezar", 11px, letter-spacing 0.08em
```

---

### 6. `TrackCard`

```tsx
interface TrackCardProps {
  track: Track
  activeStep: number  // 0-15, viene de useBeatClock
}

// Layout:
// ┌─ track-header ──────────────────────────────────────┐
// │ [track name]  [miniWaveform]  [tag]  [vol] [M] [S]  │
// └──────────────────────────────────────────────────────┘
// ┌─ sequencer ─────────────────────────────────────────┐
// │ [paso][paso][paso][paso] [paso][paso][paso][paso]... │
// └──────────────────────────────────────────────────────┘
//
// Fondo: var(--surface), border: 1px solid var(--border), border-radius: 8px
// Muted: opacity 0.45
// Soloed: border-color var(--amber)
// Hover: border-color rgba(255,255,255,0.12)
```

---

### 7. `MiniWaveform`

```tsx
interface MiniWaveformProps {
  tag: string  // determina el color
}

// 32 barras verticales de 2px de ancho, gap 1px, altura aleatoria 4-18px
// Color según tag: kick→cyan, snare→amber, hihat→violet, default→text-dim
// Opacity 0.4 en reposo; en v2 se animará con amplitud real del WebAudio
// La altura aleatoria se genera una vez en el mount (useMemo con seed fija por track.id)
```

---

### 8. `Sequencer`

```tsx
interface SequencerProps {
  trackId: string
  steps: (0|1)[]
  tag: string
  activeStep: number
}

// 16 StepButton en fila, agrupados visualmente en bloques de 4
// Entre grupos: gap extra de 6px (div separador o margin)
// El step activo (activeStep) tiene outline sutil y scaleY(1.08)
```

---

### 9. `StepButton`

```tsx
interface StepButtonProps {
  on: boolean
  active: boolean   // es el paso que está sonando ahora
  tag: string       // determina color cuando está activo
  onClick: () => void
}

// Tamaño: flex:1, height: 26px, border-radius: 3px
// Off:    background rgba(255,255,255,0.06), border rgba(255,255,255,0.04)
// On:     background según tag (cyan/amber/violet), glow box-shadow
// Active: outline 1px solid rgba(255,255,255,0.3), outline-offset 1px
// On+Active: glow intensificado, scaleY(1.08)
// Hover:  rgba(255,255,255,0.1)
// Transition: background 80ms, transform 60ms
```

**Color map:**
```typescript
const stepColors = {
  kick:   { bg: '#00ffc8', glow: 'rgba(0,255,200,0.3)' },
  snare:  { bg: '#ffaa00', glow: 'rgba(255,170,0,0.3)' },
  hihat:  { bg: '#b482ff', glow: 'rgba(180,130,255,0.3)' },
  default:{ bg: '#00ffc8', glow: 'rgba(0,255,200,0.3)' },
}
```

---

### 10. `VolumeSlider`

```tsx
// Slider horizontal custom: width 70px, height 2px, thumb circular 10px
// Track: var(--border); thumb: var(--cyan) con glow
// Label a la izquierda mostrando el valor como porcentaje: "85%"
// onChange → actualizar store → regenerar strudelCode sin llamar al LLM
```

---

### 11. `StrudelCodePanel`

Vista de la tab "Strudel Code". Se muestra cuando `activeTab === 'code'`.

**IMPORTANTE — no implementar syntax highlighting manual.** Usar `@strudel/codemirror` que es el paquete oficial de Strudel. Proporciona de serie: editor editable en vivo, syntax highlighting de JS/Strudel, y resaltado activo de las notas que están sonando (el recuadro sobre `bd`, `sd`, `hh`... al estilo strudel.cc).

#### Cómo funciona el resaltado activo (para que el agente entienda el mecanismo)

El sistema tiene tres capas que trabajan juntas:

1. **El transpilador de Strudel etiqueta cada token con su posición en el código fuente.** Cuando evalúa `s("bd ~ ~ ~")`, convierte internamente cada elemento de la mini-notation a algo como `m("bd", [0, 3, 5])` donde `[0, 3, 5]` es `[línea, char_inicio, char_fin]`. Esto ocurre automáticamente al usar `@strudel/transpiler`.

2. **Cada evento disparado por el scheduler lleva esa posición como metadato.** Cuando `bd` suena en el tiempo T, el evento incluye `{ from: 3, to: 5 }` — la posición exacta del texto `bd` dentro del string original.

3. **El plugin de CodeMirror de `@strudel/codemirror` consulta el patrón en cada frame** (`requestAnimationFrame`) y aplica decoraciones de CodeMirror (`Decoration.mark`) sobre los rangos activos en ese instante. El resultado visual es el recuadro que se ve en strudel.cc.

#### Implementación

```tsx
// src/components/code-view/StrudelCodePanel.tsx
// Dependencias: npm i @strudel/codemirror @strudel/transpiler codemirror @codemirror/view @codemirror/state

import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { strudelTheme, activatePattern } from '@strudel/codemirror'
// strudelTheme: tema oscuro compatible con el diseño de NLMusic
// activatePattern: extensión que conecta el scheduler de Strudel con CodeMirror
//                 para marcar los tokens activos en tiempo real

interface StrudelCodePanelProps {
  code: string                         // viene de sessionStore.currentCode
  onChange: (newCode: string) => void  // actualiza store + re-evalúa Strudel
}

export function StrudelCodePanel({ code, onChange }: StrudelCodePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const view = new EditorView({
      doc: code,
      extensions: [
        basicSetup,
        javascript(),      // syntax highlighting JS
        strudelTheme,      // tema oscuro de Strudel (adaptar colores si es necesario)
        activatePattern(), // resaltado de notas activas en tiempo real
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newCode = update.state.doc.toString()
            onChange(newCode)  // debounce recomendado: 600-800ms antes de re-evaluar
          }
        }),
      ],
      parent: containerRef.current,
    })

    viewRef.current = view
    return () => view.destroy()
  }, []) // solo montar una vez

  // Sincronizar código externo (cuando el LLM genera nuevo patrón)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentDoc = view.state.doc.toString()
    if (currentDoc !== code) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: code }
      })
    }
  }, [code])

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto"
      style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}
    />
  )
}
```

#### Theming de CodeMirror para NLMusic

El tema por defecto de `@strudel/codemirror` puede no coincidir exactamente con el diseño. Para sobreescribir colores usar `EditorView.theme({})`:

```typescript
const nlmusicTheme = EditorView.theme({
  '&': { background: 'transparent', color: '#7affc8' },
  '.cm-content': { caretColor: '#00ffc8', fontFamily: 'JetBrains Mono, monospace' },
  '.cm-gutters': { background: '#111116', borderRight: '1px solid rgba(255,255,255,0.07)', color: 'rgba(232,232,240,0.2)' },
  '.cm-activeLineGutter': { background: 'rgba(0,255,200,0.04)' },
  '.cm-activeLine': { background: 'rgba(0,255,200,0.03)' },
  // El highlight activo de Strudel usa .strudel-highlight — sobreescribir aquí:
  '.strudel-highlight': { outline: '1px solid rgba(0,255,200,0.6)', borderRadius: '2px', background: 'rgba(0,255,200,0.1)' },
})
// Añadir nlmusicTheme al array de extensions junto con strudelTheme
```

#### ScopeCanvas (visualizador de audio real)

Colocar debajo del editor CodeMirror. Conectar al `AnalyserNode` del `AudioContext` de Strudel:

```tsx
// Acceder al AudioContext de Strudel tras initStrudel():
// import { getAudioContext } from '@strudel/webaudio'
// const analyser = getAudioContext().createAnalyser()
// analyser.connect(getAudioContext().destination)
// En requestAnimationFrame: analyser.getByteFrequencyData(dataArray)
// Dibujar barras de frecuencia (estilo píxeles grandes) en el canvas
// Si getAudioContext() no está disponible en la versión usada,
// fallback: senoide simulada con Math.sin hasta resolver el acceso
```

---

### 12. `PromptBox`

Fija en la parte inferior. Fondo `var(--surface)`, borde superior `1px solid var(--border)`.

```tsx
// Contenedor interno: display flex, background var(--surface2),
//   border 1px solid var(--border), border-radius 10px, padding 10px 12px
//   focus-within → border-color var(--border-active), box-shadow 0 0 0 3px rgba(0,255,200,0.06)
//
// Textarea:
//   - placeholder: "Ej: kick 909 en 4x4 techno oscuro, añade snare en los tiempos 2 y 4…"
//   - min-height: 20px, max-height: 80px, auto-resize con onInput
//   - Enter → enviar; Shift+Enter → nueva línea
//   - Font: var(--mono), 13px
//
// Botón send:
//   - 34x34px, border-radius 7px
//   - Fondo: rgba(0,255,200,0.12), border: var(--border-active), color: var(--cyan)
//   - Hover: rgba(0,255,200,0.2), box-shadow glow
//   - Icono: SVG flecha → (triángulo apuntando derecha)
//
// Hint debajo: "Enter para enviar · Shift+Enter nueva línea"
//   9px, var(--text-muted), "Enter" y "Shift+Enter" en var(--cyan) opacity 0.6
```

---

## Hooks — especificación

### `useBeatClock`
```typescript
// Devuelve: { beat: number (0-3), step: number (0-15), isPlaying: boolean }
// Internamente: setInterval basado en sessionStore.bpm
// Fórmula: interval = (60000 / bpm) / 4  (subdivisions de 16 = 4 beats × 4 steps)
// Limpia el interval en cleanup del useEffect
// Se reinicia cuando cambia bpm o isPlaying
```

### `useStrudel`
```typescript
// IMPORTANTE: Strudel debe instalarse como paquetes npm, NO como CDN script.
// Usar CDN impide acceder a @strudel/codemirror que requiere bundler (Vite/Next.js).
//
// Instalación: npm i @strudel/web @strudel/webaudio @strudel/transpiler
//
// Devuelve: { play(code: string): void, stop(): void, isReady: boolean }
//
// Inicialización (llamar una vez en layout.tsx o en el hook al montar):
//   import { initStrudel } from '@strudel/web'
//   await initStrudel()   // carga samples, arranca AudioContext, registra outputs
//
// play(code):
//   import { evaluate } from '@strudel/transpiler'  // transpila + añade locations
//   const { pattern } = await evaluate(code)
//   pattern.play()   // o usar la API interna del scheduler de Strudel
//   El transpilador añade automáticamente withMiniLocation a cada token,
//   lo que permite al plugin de @strudel/codemirror resaltar los activos.
//
// stop():
//   import { hush } from '@strudel/web'
//   hush()   // detiene toda reproducción
//
// isReady: true cuando initStrudel() ha resuelto (usar useState + useEffect)
//
// AudioContext para el osciloscopio:
//   import { getAudioContext } from '@strudel/webaudio'
//   const ctx = getAudioContext()   // el mismo contexto que usa Strudel internamente
```

### `usePatternGen`
```typescript
// Devuelve: { generate(prompt: string): Promise<void>, isLoading: boolean, error: string|null }
// Hace fetch a /api/generate-pattern con { prompt, context: sessionStore.context }
// En éxito: actualiza sessionStore.tracks, sessionStore.currentCode, añade turn al historial
// El audio NO se interrumpe durante la generación
```

---

## Zustand store (sessionStore)

```typescript
interface SessionStore {
  // State
  tracks: Track[]
  bpm: number
  isPlaying: boolean
  activeTab: 'sequencer' | 'code'
  currentCode: string
  turns: { role: 'user' | 'assistant'; content: string }[]

  // Actions
  setTracks: (tracks: Track[]) => void
  setBpm: (bpm: number) => void
  setPlaying: (v: boolean) => void
  setActiveTab: (tab: 'sequencer' | 'code') => void
  setCurrentCode: (code: string) => void
  toggleStep: (trackId: string, stepIndex: number) => void
  setVolume: (trackId: string, volume: number) => void
  toggleMute: (trackId: string) => void
  toggleSolo: (trackId: string) => void
  addTurn: (role: 'user' | 'assistant', content: string) => void
}

// Persistir en localStorage: bpm, turns, tracks (última sesión)
// NO persistir: isPlaying, activeTab
```

---

## Orden de implementación sugerido

1. `globals.css` — variables CSS, reset, fuentes
2. `types/index.ts` — TrackJSON, Track, SessionContext
3. `store/sessionStore.ts` — Zustand store completo
4. `lib/strudel/compiler.ts` — TrackJSON → strudelCode
5. `hooks/useStrudel.ts` — wrappea `@strudel/web`: initStrudel, evaluate, hush, getAudioContext
6. `hooks/useBeatClock.ts`
7. `components/transport/` — BpmControl, BarIndicator, TransportBar
8. `components/tracks/StepButton.tsx`
9. `components/tracks/Sequencer.tsx`
10. `components/tracks/MiniWaveform.tsx`
11. `components/tracks/TrackCard.tsx`
12. `components/tracks/TrackZone.tsx`
13. `components/code-view/StrudelCodePanel.tsx` — CodeMirror + `@strudel/codemirror` (ver spec detallada arriba)
14. `components/code-view/ScopeCanvas.tsx` — AnalyserNode de `getAudioContext()` + canvas
15. `components/prompt/PromptBox.tsx`
16. `hooks/usePatternGen.ts`
17. `app/page.tsx` — ensamblaje final
18. `app/api/generate-pattern/route.ts` — API route

---

## HTML Reference Mockup

Estructura HTML de referencia para la traducción a componentes React. Los estilos están documentados por componente en las secciones anteriores y en `copilot-instructions.md`.

```html
<body>

  <!-- TransportBar -->
  <div class="transport">
    <span class="app-name">NLMusic</span>

    <!-- PlayControls -->
    <div class="play-controls">
      <div class="status-dot stopped"></div>
      <button class="btn-transport stop">■</button>
      <button class="btn-transport play">▶</button>
    </div>

    <!-- BpmControl -->
    <div class="bpm-control">
      <span class="bpm-label">BPM</span>
      <button class="btn-bpm">−</button>
      <span class="bpm-value">138</span>
      <button class="btn-bpm">+</button>
    </div>

    <!-- BarIndicator -->
    <div class="bar-indicator">
      <span class="bar-label">Bar</span>
      <div class="beat active"></div>
      <div class="beat on"></div>
      <div class="beat"></div>
      <div class="beat"></div>
    </div>
  </div>

  <!-- Tab bar -->
  <div class="tab-bar">
    <div class="tab active">Sequencer</div>
    <div class="tab">Strudel Code</div>
  </div>

  <!-- TrackZone — vista Sequencer -->
  <div class="track-zone">

    <!-- EmptyState (visible cuando tracks.length === 0) -->
    <div class="empty-state">
      <div class="icon">◈</div>
      <p>Describe tu patrón abajo para empezar</p>
    </div>

    <!-- TrackCard (repetir por cada track) -->
    <div class="track">
      <div class="track-header">
        <span class="track-name">Kick 909</span>

        <!-- MiniWaveform (32 barras) -->
        <div class="waveform">
          <div class="bar" style="height:12px"></div>
          <div class="bar" style="height:6px"></div>
          <!-- ... 30 barras más ... -->
        </div>

        <span class="track-tag kick">kick</span>

        <!-- Controls -->
        <div class="track-controls">
          <div class="vol-wrap">
            <span class="vol-label">85%</span>
            <input type="range" class="vol" min="0" max="100" value="85">
          </div>
          <button class="btn-tiny">M</button>
          <button class="btn-tiny">S</button>
        </div>
      </div>

      <!-- Sequencer: 16 pasos en 4 grupos de 4 -->
      <div class="sequencer">
        <div class="step on cursor"></div>
        <div class="step"></div>
        <div class="step"></div>
        <div class="step"></div>
        <div class="step-gap"></div>
        <div class="step on"></div>
        <div class="step"></div>
        <div class="step"></div>
        <div class="step"></div>
        <div class="step-gap"></div>
        <div class="step on"></div>
        <div class="step"></div>
        <div class="step"></div>
        <div class="step"></div>
        <div class="step-gap"></div>
        <div class="step on"></div>
        <div class="step"></div>
        <div class="step"></div>
        <div class="step"></div>
      </div>
    </div>

  </div>

  <!-- StrudelCodePanel — vista Code (hidden por defecto) -->
  <!-- NO implementar con spans manuales. Montar CodeMirror aquí. -->
  <!-- Ver especificación completa en ## 11. StrudelCodePanel -->
  <div class="code-view">
    <!-- CodeMirror se monta en este div vía EditorView({ parent: containerRef.current }) -->
    <div id="codemirror-mount"></div>
    <!-- ScopeCanvas debajo del editor -->
    <div class="scope-wrap">
      <canvas class="scope-canvas" width="600" height="50"></canvas>
    </div>
  </div>

  <!-- PromptBox -->
  <div class="prompt-zone">
    <div class="prompt-wrap">
      <textarea class="prompt-input"
        placeholder="Ej: kick 909 en 4x4 techno oscuro, añade snare en los tiempos 2 y 4…">
      </textarea>
      <button class="btn-send">→</button>
    </div>
    <p class="prompt-hint"><span>Enter</span> para enviar · <span>Shift+Enter</span> nueva línea</p>
  </div>

</body>
```

---

## Notas para el agente

- Tailwind es la herramienta de estilos principal. Para los valores custom del design system (`--cyan`, `--surface`, etc.), extiende `tailwind.config.ts` bajo `theme.extend.colors` Y decláralos como CSS variables en `globals.css`.
- El glow de los step buttons (`box-shadow`) no tiene equivalente Tailwind nativo — usa `style` prop o clase arbitraria `shadow-[0_0_6px_rgba(0,255,200,0.3)]`.
- `JetBrains Mono` y `DM Sans` se cargan en `layout.tsx` con `next/font/google`.

**Strudel — paquetes npm obligatorios (no CDN):**
```bash
npm i @strudel/web @strudel/webaudio @strudel/transpiler @strudel/codemirror codemirror @codemirror/lang-javascript @codemirror/view @codemirror/state
```
Usar CDN bloqueará el acceso a `@strudel/codemirror` que requiere bundler. Eliminar cualquier `<script src="...strudel...">` del `layout.tsx` y reemplazar por `import { initStrudel } from '@strudel/web'`.

**`@strudel/codemirror` — aclaraciones de API:**
- `strudelTheme`: extensión de CodeMirror con el tema visual de Strudel. Sobreescribir con `nlmusicTheme` (ver spec del componente) para adaptar colores.
- `activatePattern()`: extensión que conecta el scheduler interno de Strudel con CodeMirror para marcar los tokens activos. Requiere que `initStrudel()` haya resuelto antes de montar el editor.
- La clase CSS del highlight activo es `.strudel-highlight` — sobreescribir en el theme para que use el cian del design system.

**ScopeCanvas — acceso al AudioContext:**
```typescript
import { getAudioContext } from '@strudel/webaudio'
// Llamar solo después de initStrudel() — antes el contexto no existe
const ctx = getAudioContext()
const analyser = ctx.createAnalyser()
analyser.fftSize = 256
ctx.destination  // conectar analyser aquí para capturar el mix final
```
Si `getAudioContext` no está disponible en la versión instalada, buscar en `@strudel/core` o en el objeto devuelto por `initStrudel()`. Fallback: senoide simulada con `Math.sin` hasta resolver.
