# NLMusic — Copilot Instructions

## Descripción del proyecto
NLMusic es una interfaz de **live coding musical dirigida por lenguaje natural**. El usuario describe intenciones musicales en texto y el sistema genera y ejecuta audio en tiempo real usando Strudel.cc (TidalCycles en el browser vía WebAudio API).

## Stack tecnológico
- **Framework:** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript (strict mode)
- **Estilos:** Tailwind CSS — sin CSS modules, sin styled-components
- **Estado global:** Zustand (con middleware `persist` para localStorage)
- **Audio engine:** Strudel.cc cargado vía CDN en `layout.tsx`
- **LLM:** Claude claude-sonnet-4-6 vía API route `/api/generate-pattern` (patrón adapter, nunca llamada directa desde el cliente)
- **Fuentes:** JetBrains Mono (principal), DM Sans (secundaria) — importadas desde Google Fonts en `layout.tsx`

## Convenciones de código
- **Componentes:** funcionales con hooks, named exports, un componente por archivo
- **Tipos:** definidos en `src/lib/types/` (split: `audio.ts`, `session.ts`, `api.ts`), importados con `@lib/types`
- **Path aliases:** `@features/*` → `./src/features/*`, `@lib/*` → `./src/lib/*`, `@store/*` → `./src/store/*`
- **Barrel exports:** cada feature expone un `index.ts` público. Imports cross-feature usan el barrel (`@features/audio`), imports intra-feature usan rutas relativas
- **Nunca** usar `any`; preferir tipos explícitos o `unknown`
- **Hooks personalizados** colocados en `hooks/` dentro de su feature (ej: `src/features/audio/hooks/useBeatClock.ts`)
- **No** lógica de negocio en componentes UI — delegar a hooks y store

## Estructura de directorios
```
src/
├── app/
│   ├── layout.tsx              # Fuentes + globals
│   ├── page.tsx                # Layout principal de la app
│   ├── globals.css             # Variables CSS del design system
│   └── api/
│       └── generate-pattern/
│           └── route.ts        # Next.js API route → pipeline
│
├── features/
│   ├── audio/
│   │   ├── hooks/
│   │   │   ├── useStrudel.ts   # play(), stop(), isReady
│   │   │   └── useBeatClock.ts # Cursor sincronizado con BPM
│   │   ├── compiler.ts         # TrackJSON → código Strudel
│   │   └── index.ts            # Barrel export
│   ├── sequencer/
│   │   ├── components/
│   │   │   ├── TrackZone.tsx    # Contenedor de pistas + empty state
│   │   │   ├── TrackCard.tsx    # Pista individual
│   │   │   ├── Sequencer.tsx    # Grid de 16 pasos
│   │   │   ├── StepButton.tsx   # Paso individual clickable
│   │   │   ├── MiniWaveform.tsx # Mini visualización decorativa
│   │   │   └── VolumeSlider.tsx # Control de volumen por pista
│   │   └── index.ts
│   ├── transport/
│   │   ├── components/
│   │   │   ├── TransportBar.tsx  # Play/Stop + BPM + BarIndicator
│   │   │   ├── PlayControls.tsx  # Botón play/stop con estado
│   │   │   ├── BpmControl.tsx    # Número con botones +/-
│   │   │   └── BarIndicator.tsx  # 4 rectángulos, beat activo
│   │   └── index.ts
│   ├── prompt/
│   │   ├── components/
│   │   │   └── PromptBox.tsx     # Textarea + botón enviar
│   │   ├── hooks/
│   │   │   └── usePatternGen.ts  # Llamada a /api/generate-pattern
│   │   └── index.ts
│   └── code-view/
│       ├── components/
│       │   └── StrudelCodePanel.tsx # Código generado + osciloscopio
│       └── index.ts
│
├── lib/
│   ├── llm/
│   │   ├── adapters/
│   │   │   └── claude.adapter.ts  # Implementación Anthropic
│   │   ├── prompts/
│   │   │   └── systemPrompt.ts    # System prompt musical
│   │   ├── pipeline.ts            # Pipeline v0 (adapter + validación + fallback)
│   │   ├── fallbackPattern.ts     # Patrón fallback si LLM falla
│   │   └── validation.ts          # Schema Zod para TrackJSON
│   └── types/
│       ├── audio.ts               # Track, TrackJSON, TrackTag
│       ├── session.ts             # SessionContext, SessionTurn
│       ├── api.ts                 # LLMProvider
│       ├── strudel-web.d.ts       # Tipos para @strudel/web
│       └── index.ts               # Re-exports públicos
│
└── store/
    └── sessionStore.ts            # Zustand store: tracks, bpm, turns, ui
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
- Strudel se carga como script CDN en `layout.tsx`; acceso via `window.strudel` o `window.Strudel` (verificar en runtime)
- El audio NUNCA se interrumpe al modificar pasos en el sequencer — solo se regenera el código Strudel y se re-evalúa en el siguiente ciclo
- `useBeatClock` usa `setInterval` basado en BPM; en v2 se sincronizará con el clock interno de Strudel
- El contexto de sesión (historial de turns) vive en Zustand con `persist` — NO en el servidor
