# NLMusic — Claude Agent Instructions

> Lee este archivo completo antes de tocar cualquier archivo del proyecto.
> La especificación funcional completa está en `nlmusic-spec.md` — es la fuente de verdad.

---

## Qué es este proyecto

NLMusic convierte intenciones musicales en lenguaje natural en audio ejecutándose
en tiempo real en el navegador. El usuario escribe "un bombo 808 para drum and bass"
y el sistema genera y ejecuta el patrón sin interrumpir lo que ya está sonando.

Motor de audio: **Strudel.cc** (TidalCycles en el browser vía WebAudio API).
LLM: **Claude claude-sonnet-4-6** vía API route proxied — nunca llamada directa desde el cliente.

---

## Stack real del proyecto

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript 6 + Next.js 16 (Turbopack, App Router) |
| Audio | `@strudel/web` — dynamic import, NO CDN script |
| Estado | Zustand + middleware persist (localStorage) |
| Estilos | Tailwind CSS — sin CSS modules, sin styled-components |
| LLM | ClaudeAdapter → `/api/generate-pattern` → Anthropic API |
| Deploy | Vercel |

---

## Estructura de directorios

```
src/
├── app/
│   ├── layout.tsx                    # Fuentes + globals
│   ├── page.tsx                      # Layout principal
│   ├── globals.css                   # CSS variables del design system
│   └── api/generate-pattern/
│       └── route.ts                  # API route → pipeline LLM
│
├── features/
│   ├── audio/
│   │   ├── hooks/
│   │   │   ├── useStrudel.ts         # play(), stop(), isReady
│   │   │   └── useBeatClock.ts       # Cursor sincronizado con BPM
│   │   ├── compiler.ts               # TrackJSON → código Strudel
│   │   └── index.ts                  # Barrel export
│   ├── sequencer/
│   │   ├── components/
│   │   │   ├── TrackZone.tsx         # Contenedor de pistas + empty state
│   │   │   ├── TrackCard.tsx         # Pista individual + botón ✕
│   │   │   ├── Sequencer.tsx         # Grid 16 pasos
│   │   │   ├── StepButton.tsx        # Paso clickable
│   │   │   ├── MiniWaveform.tsx      # Visualización decorativa
│   │   │   └── VolumeSlider.tsx      # Volumen por pista
│   │   └── index.ts
│   ├── transport/
│   │   ├── components/
│   │   │   ├── TransportBar.tsx      # Barra superior fija
│   │   │   ├── PlayControls.tsx      # Play/Stop
│   │   │   ├── BpmControl.tsx        # BPM con +/-
│   │   │   └── BarIndicator.tsx      # 4 beats, paso activo
│   │   └── index.ts
│   ├── prompt/
│   │   ├── components/
│   │   │   └── PromptBox.tsx         # Textarea + enviar
│   │   ├── hooks/
│   │   │   └── usePatternGen.ts      # Llamada a /api/generate-pattern
│   │   └── index.ts
│   └── code-view/
│       ├── components/
│       │   └── StrudelCodePanel.tsx  # Código Strudel + osciloscopio
│       └── index.ts
│
├── lib/
│   ├── llm/
│   │   ├── adapters/
│   │   │   └── claude.adapter.ts     # Implementación Anthropic
│   │   ├── prompts/
│   │   │   └── systemPrompt.ts       # System prompt musical (en inglés)
│   │   ├── pipeline.ts               # runV0Pipeline: adapter + validación + fallback
│   │   ├── fallbackPattern.ts        # Patrón fallback si LLM falla
│   │   └── validation.ts             # Schema Zod para TrackJSON
│   └── types/
│       ├── audio.ts                  # Track, TrackJSON, TrackTag
│       ├── session.ts                # SessionContext, SessionTurn
│       ├── api.ts                    # LLMProvider interface
│       └── index.ts                  # Re-exports públicos
│
└── store/
    └── sessionStore.ts               # Zustand: tracks, bpm, turns, ui state
```

**Path aliases:**
- `@features/*` → `./src/features/*`
- `@lib/*` → `./src/lib/*`
- `@store/*` → `./src/store/*`

---

## Modelo de datos central

```typescript
interface Track {
  id: string
  name: string
  tag: 'kick' | 'snare' | 'hihat' | 'clap' | 'perc' | string
  steps: (0 | 1)[]   // siempre 16 elementos
  volume: number     // 0.0 - 1.0
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

---

## Estados del sistema — SIEMPRE respetar esta máquina de estados

```
IDLE → LOADING → PLAYING → PAUSED → ERROR
```

| De | A | Trigger | Guard | Side effect |
|---|---|---|---|---|
| IDLE | LOADING | user.submit_prompt | Prompt no vacío | Indicador carga área principal; bloquear input |
| LOADING | PLAYING | llm.response_ok | JSON válido, tracks ≤ 5 | Limpiar prompt; renderizar pista; arrancar audio |
| LOADING | ERROR | llm.response_error | Cualquier error | Mantener prompt; mostrar error; ofrecer reintento |
| PLAYING | LOADING | user.submit_prompt | Prompt no vacío | Indicador no intrusivo; audio continúa |
| PLAYING | PAUSED | user.stop | — | Detener audio; cursor se detiene; pistas permanecen |
| PLAYING | IDLE | user.delete_track | Era la última pista | Detener audio; limpiar estado |
| PAUSED | PLAYING | user.play | Al menos una pista | Audio desde inicio del ciclo |
| PAUSED | LOADING | user.submit_prompt | Prompt no vacío | Indicador no intrusivo; bloquear input |
| PAUSED | IDLE | user.delete_track | Era la última pista | Limpiar estado; resetear secuenciador |
| ERROR | LOADING | user.retry | Prompt no vacío | Reutilizar prompt anterior |

---

## Reglas de negocio — NUNCA violarlas

Antes de implementar cualquier feature, localiza su BR-ID en `nlmusic-spec.md` Sección 5.
Cada regla debe estar comentada en el código con su ID.

| ID | Regla crítica |
|---|---|
| **BR-001** | El audio NUNCA se interrumpe durante una llamada al LLM |
| **BR-002** | El LLM debe devolver JSON válido con tracks[] y strudelCode |
| **BR-003** | Cualquier error (red, schema, timeout) → mismo comportamiento: mantener estado, informar, ofrecer reintento |
| **BR-004** | Las pistas se crean siempre de forma secuencial |
| **BR-005** | Referencias a pistas inexistentes → informar, no hacer nada |
| **BR-006** | Máximo 5 pistas |
| **BR-007** | Eliminar pista: destructivo e irreversible, sin confirmación, sin deshacer |
| **BR-008** | Editar grid manualmente NO invoca al LLM |
| **BR-009** | Editor Strudel y grid están sincronizados bidireccionalmente |
| **BR-010** | Prompt vacío → no llamar al LLM |
| **BR-011** | La API key NUNCA se expone al cliente — siempre proxied por API route |

---

## Edge cases conocidos — SIEMPRE cubrirlos

Ver `nlmusic-spec.md` Sección 7 para la lista completa. Los más críticos:

- **EC-001/002**: Error de LLM o red → mantener estado, mostrar error, ofrecer reintento
- **EC-004**: Usuario intenta crear pista 6 → informar del límite, no crear
- **EC-005**: LLM quiere crear más pistas de las disponibles → informar, dejar decidir al usuario
- **EC-006**: Código Strudel inválido en editor → capturar error, informar, mantener audio
- **EC-007/008**: Eliminar última pista → IDLE en cualquier estado
- **EC-010**: initStrudel() falla → mostrar error claro, la app no es funcional

---

## Convenciones de código

- **Componentes:** funcionales con hooks, named exports, un componente por archivo
- **Nunca** usar `any` — preferir tipos explícitos o `unknown`
- **No** lógica de negocio en componentes UI — delegar a hooks y store
- **Imports cross-feature:** usar barrel (`@features/audio`)
- **Imports intra-feature:** usar rutas relativas
- **Comentar reglas de negocio:** `// BR-001: el audio nunca se interrumpe`

---

## Paleta de colores (CSS variables en globals.css)

```css
--bg: #0a0a0c
--surface: #111116
--surface2: #1a1a22
--border: rgba(255,255,255,0.07)
--border-active: rgba(0,255,200,0.3)
--cyan: #00ffc8       /* kick, acento principal */
--amber: #ffaa00      /* snare */
--violet: #b482ff     /* hihat */
--red: #ff4466        /* mute activo, stop */
--text: #e8e8f0
--text-dim: rgba(232,232,240,0.4)
--text-muted: rgba(232,232,240,0.2)
```

**Color por instrumento:** kick=cyan · snare=amber · hihat=violet — consistente en steps, tags y waveforms.

---

## Reglas de UI

- Tema siempre oscuro, sin toggle light/dark
- Tipografía: JetBrains Mono para código y labels; DM Sans para texto descriptivo
- Step buttons activos: `box-shadow: 0 0 6px <color-instrumento>`
- Empty state visible cuando `tracks.length === 0`
- Prompt siempre abajo, ancho completo, `Enter` envía, `Shift+Enter` nueva línea

---

## Notas críticas de Strudel

- `@strudel/web` se carga vía **dynamic import**, NO como CDN script
- Audio se actualiza en el **siguiente ciclo** — nunca interrumpe el loop actual
- `useBeatClock` usa `setInterval` basado en BPM (pendiente sincronizar con clock real de Strudel en v1)
- `initStrudel()` debe llamarse una vez al montar la app — si falla, la app no es funcional (EC-010)

---

## Patrón LLM Adapter

```typescript
// NUNCA llamar directamente a Anthropic desde componentes o el cliente
// SIEMPRE pasar por /api/generate-pattern

interface LLMProvider {
  generatePattern(prompt: string, context: SessionContext): Promise<TrackJSON>
}
// Implementaciones: ClaudeAdapter, OpenAIAdapter (futuro), OllamaAdapter (futuro)
```

---

## Cómo trabajar con tareas

Cada tarea de desarrollo tiene su propio archivo en `.claude/tasks/`.
Antes de implementar cualquier feature:

1. Lee el archivo de tarea correspondiente en `.claude/tasks/`
2. Localiza el CAP-ID en `nlmusic-spec.md`
3. Lee las secciones 5 (reglas), 6 (estados), 7 (edges) y 8 (BDD) para esa capacidad
4. Implementa respetando todas las reglas y cubriendo todos los edge cases
5. Verifica contra los escenarios BDD de la Sección 8

---

## Estado actual del proyecto (Abril 2026)

**Completado:**
- Pipeline LLM → JSON → Strudel ✅
- Sequencer visual 16 pasos, mute/solo, volumen ✅
- Play/Stop, BPM control, BarIndicator ✅
- StrudelCodePanel (read-only) + osciloscopio ✅
- Persistencia Zustand + localStorage ✅
- Build producción sin errores ✅

**Pendiente Sprint 2:**
- Validación e2e en navegador (prompt → audio real)
- useBeatClock sincronizado con clock real de Strudel
- StrudelCodePanel editable + sincronización bidireccional (CAP-NLM-008)
- Gestión de estado ERROR con reintento (Sección 6)
- Eliminar pista desde UI — botón ✕ (CAP-NLM-003)
- Tercera pestaña Configuración/Guía (CAP-NLM-010)
- Multiidioma UI — ES / EN (Sección 10)
