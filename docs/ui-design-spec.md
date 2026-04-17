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

```tsx
// Código generado con syntax highlighting manual (spans con clases)
//   .kw    → #ff79c6  (keywords)
//   .str   → #f1fa8c  (strings)
//   .fn    → #50fa7b  (functions)
//   .op    → var(--text-dim) (operators)
//   .comment → rgba(98,114,164,0.6)
// Números de línea a la izquierda: var(--text-muted), user-select none
// Cursor parpadeante al final: 2px wide, var(--cyan), keyframe blink 1s
//
// Debajo del código: ScopeCanvas
```

**ScopeCanvas:**
```tsx
// <canvas> al 100% de ancho, 50px de alto
// Dibuja una senoide suavizada en var(--cyan) con opacity 0.5, stroke 1.5px
// En v2: conectar a AnalyserNode de WebAudio para onda real en tiempo real
// Por ahora: Math.sin simulado, redibujado en requestAnimationFrame
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
// Devuelve: { play(code: string): void, stop(): void, isReady: boolean }
// Lee window.strudel (o window.Strudel) — probar ambos en runtime
// isReady: true cuando el CDN ha cargado (listener en window load o polling)
// play(): evalúa el código Strudel, actualiza el patrón en el siguiente ciclo
// stop(): detiene toda reproducción de Strudel
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
5. `hooks/useBeatClock.ts`
6. `hooks/useStrudel.ts`
7. `components/transport/` — BpmControl, BarIndicator, TransportBar
8. `components/tracks/StepButton.tsx`
9. `components/tracks/Sequencer.tsx`
10. `components/tracks/MiniWaveform.tsx`
11. `components/tracks/TrackCard.tsx`
12. `components/tracks/TrackZone.tsx`
13. `components/code-view/StrudelCodePanel.tsx`
14. `components/prompt/PromptBox.tsx`
15. `hooks/usePatternGen.ts`
16. `app/page.tsx` — ensamblaje final
17. `app/api/generate-pattern/route.ts` — API route

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
  <div class="code-view">
    <div class="code-line">
      <span class="code-num">1</span>
      <span class="code-comment">// NLMusic — patrón generado</span>
    </div>
    <div class="code-line">
      <span class="code-num">3</span>
      <span>$: <span class="code-fn">stack</span><span class="code-op">(</span></span>
    </div>
    <div class="code-line">
      <span class="code-num">4</span>
      <span>&nbsp;&nbsp;<span class="code-fn">s</span><span class="code-op">(</span><span class="code-str">"bd ~ ~ ~"</span><span class="code-op">)</span>.<span class="code-fn">gain</span><span class="code-op">(</span>0.85<span class="code-op">),</span></span>
    </div>
    <div class="code-line">
      <span class="code-num">7</span>
      <span class="code-op">).<span class="code-fn">setcpm</span>(138/2)<span class="code-cursor"></span></span>
    </div>
    <!-- ScopeCanvas -->
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

- Tailwind es la herramienta de estilos principal — usa clases de utilidad. Para los valores custom del design system (`--cyan`, `--surface`, etc.), extiende `tailwind.config.ts` con los colores del proyecto.
- Los colores del design system deben estar en `tailwind.config.ts` bajo `theme.extend.colors` Y como CSS variables en `globals.css` para que los hooks de canvas puedan acceder a ellos.
- El glow de los step buttons (`box-shadow`) no tiene equivalente Tailwind nativo — usa `style` prop o clase arbitraria `shadow-[0_0_6px_rgba(0,255,200,0.3)]`.
- `JetBrains Mono` y `DM Sans` se cargan en `layout.tsx` con `next/font/google`.
- El canvas del osciloscopio usa la API nativa del browser — no hay librería necesaria para la versión simulada.
