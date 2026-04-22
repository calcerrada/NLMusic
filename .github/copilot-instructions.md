# NLMusic — Copilot Instructions

## Descripción del proyecto
NLMusic es una interfaz de **live coding musical dirigida por lenguaje natural**. El usuario describe intenciones musicales en texto y el sistema genera y ejecuta audio en tiempo real usando Strudel.cc (TidalCycles en el browser vía WebAudio API).

## Stack tecnológico
- **Framework:** Next.js 14 (App Router) + React + TypeScript (strict mode)
- **Estilos:** Tailwind CSS — sin CSS modules, sin styled-components
- **Estado global:** Zustand (con middleware `persist` para localStorage)
- **Audio engine:** Strudel instalado como paquetes npm (NO como CDN script):
  - `@strudel/web` — `initStrudel()`, `hush()`
  - `@strudel/webaudio` — `getAudioContext()` para el osciloscopio
  - `@strudel/transpiler` — `evaluate(code)` que transpila y añade location metadata
  - `@strudel/codemirror` — editor CodeMirror con highlight de notas activas en tiempo real
- **Editor de código:** CodeMirror 6 vía `@strudel/codemirror`:
  - `strudelTheme` + tema custom `nlmusicTheme` para adaptar colores
  - `activatePattern()` — extensión que marca los tokens activos mientras suena
  - `javascript()` de `@codemirror/lang-javascript` para syntax highlighting
- **LLM:** Claude claude-sonnet-4-6 vía API route `/api/generate-pattern` (patrón adapter, nunca llamada directa desde el cliente)
- **Fuentes:** JetBrains Mono (principal), DM Sans (secundaria) — importadas desde Google Fonts en `layout.tsx`

## Convenciones de código
- **Componentes:** funcionales con hooks, named exports, un componente por archivo
- **Tipos:** definidos en `src/types/index.ts`, importados con `@/types`
- **Path aliases:** `@/components/*`, `@/lib/*`, `@/hooks/*`, `@/types/*`, `@/store/*`
- **Nunca** usar `any`; preferir tipos explícitos o `unknown`
- **Hooks personalizados** en `src/hooks/` para lógica reutilizable (useStrudel, useSessionStore, useBeatClock)
- **No** lógica de negocio en componentes UI — delegar a hooks y store

## Estructura de directorios
```
src/
├── app/
│   ├── layout.tsx          # Fuentes + Strudel CDN loader
│   ├── page.tsx            # Layout principal de la app
│   └── api/
│       └── generate-pattern/
│           └── route.ts    # Next.js API route → ClaudeAdapter
├── components/
│   ├── transport/
│   │   ├── TransportBar.tsx      # Play/Stop + BPM + BarIndicator
│   │   ├── BpmControl.tsx        # Número con botones +/-
│   │   └── BarIndicator.tsx      # 4 rectángulos, beat activo
│   ├── tracks/
│   │   ├── TrackZone.tsx         # Contenedor de pistas + empty state
│   │   ├── TrackCard.tsx         # Pista individual
│   │   ├── Sequencer.tsx         # Grid de 16 pasos
│   │   ├── StepButton.tsx        # Paso individual clickable
│   │   └── MiniWaveform.tsx      # Mini visualización de onda por pista
│   ├── code-view/
│   │   └── StrudelCodePanel.tsx  # Código generado + osciloscopio canvas
│   └── prompt/
│       └── PromptBox.tsx         # Textarea + botón enviar
├── hooks/
│   ├── useStrudel.ts       # play(), stop(), reset(), evaluateCode()
│   ├── useBeatClock.ts     # Beat cursor sincronizado con BPM
│   └── usePatternGen.ts    # Llamada a /api/generate-pattern + gestión de estado
├── store/
│   └── sessionStore.ts     # Zustand store: tracks, bpm, turns, ui state
├── lib/
│   ├── adapters/
│   │   ├── LLMProvider.ts        # Interfaz común
│   │   ├── ClaudeAdapter.ts      # Implementación Anthropic
│   │   └── OllamaAdapter.ts      # Implementación local (futura)
│   ├── strudel/
│   │   ├── compiler.ts           # TrackJSON → código Strudel
│   │   └── systemPrompt.ts       # System prompt musical para el LLM
│   └── types.ts                  # Re-export de @/types
└── types/
    └── index.ts            # TrackJSON, Track, SessionContext, etc.
```

## Modelo de datos central (TrackJSON)
```typescript
interface Track {
  id: string
  name: string
  tag: 'kick' | 'snare' | 'hihat' | 'clap' | 'perc' | string
  steps: (0 | 1)[]   // siempre 16 elementos
  volume: number      // 0-1
  muted: boolean
  solo: boolean
}

interface TrackJSON {
  bpm: number
  tracks: Track[]
  strudelCode: string
}

interface SessionContext {
  turns: { role: 'user' | 'assistant'; content: string }[]
  currentPattern: TrackJSON | null
}
```

## Paleta de colores (CSS variables en globals.css)
```css
--bg: #0a0a0c
--surface: #111116
--surface2: #1a1a22
--border: rgba(255,255,255,0.07)
--border-active: rgba(0,255,200,0.3)
--cyan: #00ffc8          /* kick, acento principal */
--amber: #ffaa00         /* snare */
--violet: #b482ff        /* hihat */
--red: #ff4466           /* mute activo, stop */
--text: #e8e8f0
--text-dim: rgba(232,232,240,0.4)
--text-muted: rgba(232,232,240,0.2)
```

## Reglas de UI
- **Tema:** siempre oscuro, sin toggle light/dark
- **Tipografía:** JetBrains Mono para todo el código y labels; DM Sans para texto descriptivo
- **Color por instrumento:** kick=cyan, snare=amber, hihat=violet — consistente en step buttons, tags y miniWaveform
- **Step buttons activos:** `box-shadow: 0 0 6px <color-del-instrumento>` para el glow
- **Empty state:** visible cuando `tracks.length === 0`; desaparece al añadir la primera pista
- **Prompt:** siempre en la parte inferior, ancho completo, `Enter` envía, `Shift+Enter` nueva línea

## Patrón LLM Adapter
```typescript
// NUNCA llamar directamente a anthropic o fetch a api.anthropic.com desde componentes
// SIEMPRE pasar por /api/generate-pattern que usa el adapter internamente
interface LLMProvider {
  generatePattern(prompt: string, context: SessionContext): Promise<TrackJSON>
}
```

## Notas importantes
- **Strudel se instala como paquetes npm, NO como script CDN.** Eliminar cualquier `<script src="...strudel...">` del `layout.tsx`. Usar `import { initStrudel } from '@strudel/web'` y llamarlo una vez al montar la app.
- El código del usuario pasa por `evaluate(code)` de `@strudel/transpiler` antes de ejecutarse. Este paso añade metadata de posición (`withMiniLocation`) a cada token, que es lo que permite al plugin `activatePattern()` de `@strudel/codemirror` resaltar los tokens activos en tiempo real.
- El audio NUNCA se interrumpe al modificar pasos en el sequencer — solo se regenera el código Strudel y se re-evalúa en el siguiente ciclo
- `useBeatClock` usa `setInterval` basado en BPM; en v2 se sincronizará con el clock interno de Strudel
- El contexto de sesión (historial de turns) vive en Zustand con `persist` — NO en el servidor
- `getAudioContext()` de `@strudel/webaudio` da acceso al `AudioContext` interno de Strudel — usar para conectar el `AnalyserNode` del osciloscopio
