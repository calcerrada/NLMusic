# NLMusic — Especificación de producto v0.1

> Lenguaje natural como instrumento musical en tiempo real.

---

## Resumen ejecutivo

NLMusic es una interfaz de live coding musical dirigida por lenguaje natural. El usuario describe intenciones musicales en texto ("un bombo 909 en 4x4 techno, oscuro y acelerado") y el sistema genera y ejecuta audio en tiempo real, de forma iterativa y conversacional. La experiencia es la de un instrumento para tocar en vivo, no la de un generador de archivos de audio.

El proyecto parte del concepto del **algorave** (generación musical a partir de código, como TidalCycles o SuperCollider) y lo lleva al lenguaje humano, eliminando la barrera de la programación sin sacrificar el control ni la expresividad.

---

## Problem statement

> Los músicos y artistas que quieren explorar música generativa en tiempo real necesitan aprender un lenguaje de programación específico (TidalCycles, SuperCollider) para poder hacerlo. Esta barrera técnica excluye a quienes tienen la intención musical pero no el perfil de programador, y ralentiza incluso a quienes sí lo tienen. El resultado es que la exploración creativa queda subordinada a la sintaxis.

---

## Propuesta de valor

NLMusic convierte la intención musical expresada en lenguaje natural — abstracta ("oscuro, hipnótico") o concreta ("bombo en negras, hi-hat cada dos compases") — en audio ejecutándose en tiempo real en el navegador, con control visual directo sobre cada pista generada, sin necesidad de instalar nada ni saber programar.

---

## Usuarios objetivo

**Perfil inicial (MVP):** Una sola persona — el propio creador del proyecto — como herramienta de exploración y jam personal. Enfocado en música electrónica: techno, drum and bass, música generativa.

**Perfil futuro (v1+):**
- Músicos y productores con perfil técnico que quieren acelerar su proceso creativo
- Artistas sin conocimiento de programación que quieren explorar música generativa
- Performers de live electronics que buscan una interfaz más expresiva que el código puro

---

## La pieza clave: Strudel.cc

**Strudel** (strudel.cc) es TidalCycles ejecutándose en el navegador vía WebAudio API. Es el motor que hace viable este proyecto sin depender de DAWs, instalaciones locales ni hardware externo.

Capacidades relevantes:
- Samples de 909 / 808 / 606 incluidos (kick, snare, hi-hat, clap, etc.)
- Evaluación en tiempo real — el patrón cambia en el siguiente ciclo sin interrumpir el loop
- Sintaxis compacta y aprendible por un LLM: `s("bd ~ sd ~").fast(2)`
- Soporte nativo de efectos, filtros, envolventes ADSR, armonía — disponible para versiones futuras
- Es código JavaScript ejecutable directamente en el browser

**Flujo principal:**
```
Lenguaje natural → LLM genera código Strudel + JSON de pistas → Strudel ejecuta el audio → UI renderiza el secuenciador
```

---

## Arquitectura técnica

### Capas del sistema

```
┌─────────────────────────────────────────────────────┐
│           Interfaz de usuario (React + TS)           │
│   Prompt box · Track lanes · Sequencer · Faders     │
└────────────┬───────────────────────┬────────────────┘
             │                       │
    ┌────────▼────────┐   ┌─────────▼──────────┐
    │  Motor de audio │   │  Backend (proxy)    │
    │  Strudel.cc     │   │  Next.js / Hono     │
    │  WebAudio API   │   │  API key · contexto │
    └────────┬────────┘   └─────────┬───────────┘
             │                       │
    ┌────────▼────────┐   ┌─────────▼───────────┐
    │ Estado (Zustand)│◄──│   LLM Provider      │
    │ TrackState      │   │   (adapter pattern) │
    │ BPM · Pattern   │   └─────────┬───────────┘
    └─────────────────┘             │
                          ┌─────────▼───────────┐
                          │  Claude / GPT / Ollama│
                          │  NL → Strudel + JSON  │
                          └───────────────────────┘
```

### Modelo de datos (fuente de verdad)

El LLM genera un JSON estructurado que alimenta simultáneamente el motor de audio y el secuenciador visual:

```json
{
  "bpm": 138,
  "tracks": [
    {
      "id": "kick",
      "name": "Kick 909",
      "steps": [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
      "volume": 0.85,
      "muted": false,
      "solo": false
    },
    {
      "id": "snare",
      "name": "Snare",
      "steps": [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      "volume": 0.75,
      "muted": false,
      "solo": false
    },
    {
      "id": "hihat",
      "name": "Hi-Hat cerrado",
      "steps": [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      "volume": 0.55,
      "muted": false,
      "solo": false
    }
  ],
  "strudelCode": "stack(s('bd ~ ~ ~').gain(0.85), s('~ ~ sd ~').gain(0.75), s('hh ~ hh ~').gain(0.55)).setcpm(138/2)"
}
```

Cuando el usuario modifica un paso en el grid o mueve un fader, se actualiza el JSON y se regenera el código Strudel automáticamente — **sin necesidad de llamar al LLM**.

---

## Patrón de arquitectura: LLM Adapter

La aplicación nunca llama directamente a ninguna API de LLM. Siempre interactúa con una interfaz común, lo que permite cambiar de proveedor sin tocar la lógica de negocio.

```typescript
// Interfaz común
interface LLMProvider {
  generatePattern(prompt: string, context: SessionContext): Promise<TrackJSON>
}

// Implementaciones intercambiables
class ClaudeAdapter implements LLMProvider { ... }   // Anthropic API
class OpenAIAdapter implements LLMProvider { ... }   // OpenAI API  
class OllamaAdapter implements LLMProvider { ... }   // 100% local, sin coste
class CustomAdapter implements LLMProvider { ... }   // Cualquier proveedor compatible
```

**Lo que no cambia entre adaptadores:** el system prompt musical, el schema JSON de salida, la lógica de Strudel, el estado de la sesión.

---

## Stack tecnológico

| Capa | Tecnología | Razón |
|---|---|---|
| Frontend | React + TypeScript + Next.js | App router, API routes en el mismo proyecto |
| Audio engine | Strudel.cc | TidalCycles en el browser, samples incluidos |
| Estado | Zustand + localStorage | Sincronización tracks ↔ UI ↔ Strudel; persistencia local de sesión |
| Estilos | Tailwind CSS | Prototipado rápido del secuenciador y faders |
| LLM principal | Claude claude-sonnet-4-6 | Mejor generación de código con contexto musical |
| Backend | Next.js API routes | Proteger API key; contexto de sesión gestionado en cliente |
| Deploy | Vercel | Sin fricción, gratuito para uso personal |
| Desktop futuro | Tauri wrapping la web app | Latencia ultrabaja si se necesita |

---

## Features priorizadas (MoSCoW)

### Must — sin esto no hay MVP

| Feature | Justificación |
|---|---|
| Input de lenguaje natural (caja de texto libre) | Core del producto |
| LLM genera patrón de drums en tiempo real | Criterio de éxito del MVP |
| Motor Strudel ejecuta el audio en el browser | Sin audio no hay nada |
| Samples 909/808 listos para usar | Necesario para techno/D&B desde el día 1 |
| Vista de tracks con nombre y tipo de instrumento | Feedback visual mínimo |
| Secuenciador de 16 pasos por track (click para activar/desactivar) | Control directo sobre el patrón |
| Fader de volumen por track | Control básico de mezcla |
| Mute y Solo por track | Esencial para jam en vivo |
| Reproducción continua en loop mientras se edita | Experiencia de instrumento, no de render |
| Iteración conversacional — el LLM recuerda el contexto de la sesión | Flujo de sesión continua |
| LLMProvider adapter desde el principio | Coste cero ahora, evita refactor futuro |

### Should — v1 si el MVP funciona bien

| Feature | Justificación |
|---|---|
| BPM ajustable con slider | Importante para el feeling, Strudel tiene un default usable |
| Indicador visual del paso activo (beat cursor) | Mejora la experiencia en vivo notablemente |
| Referencias artísticas ("algo entre Aphex Twin y minimal") | Alta complejidad de prompting |
| Export WAV/MP3 | Útil pero no es el core de la experiencia |
| Panel con el código Strudel visible y editable | Para usuarios avanzados, puente al algorave clásico |

### Could — v2 en adelante

| Feature | Justificación |
|---|---|
| Melodías y armonías | Extiende el modelo de datos y el prompting |
| Envolventes ADSR por track | Mayor control, UI más compleja |
| Filtros y efectos por track | Idem |
| Piezas evolutivas largas (más allá del loop) | Requiere concepto de "arrangement" |
| Selección de LLM desde la UI | La arquitectura ya lo soporta, solo falta la pantalla |
| Aprendizaje de gustos del usuario | Requiere persistencia y datos suficientes |

### Won't — fuera de alcance v1

| Feature | Razón |
|---|---|
| Input por voz | Añade dependencia de Whisper/STT |
| Colaboración multi-usuario en tiempo real | Complejidad de sincronización enorme |
| Integración con DAWs externos | Contradice el principio de no depender de DAWs |
| App móvil nativa | WebAudio en móvil tiene limitaciones de latencia |

---

## Definición de éxito del MVP

**Éxito mínimo:** Escribir "un kick 909 en 4x4" y escuchar ese patrón sonando en el browser en menos de 5 segundos.

**Éxito completo del MVP:** Una sesión de jam de 15 minutos en la que se genera un patrón completo de drums (kick, snare, hi-hat), se ajustan pasos con el secuenciador, se mezcla con faders, y se itera con prompts sucesivos ("hazlo más oscuro", "añade un clap cada 4 compases") sin interrumpir el audio.

**Fracaso del MVP:** No poder generar al menos un kick que suene correctamente.

---

## Roadmap

### v0 — Prueba de concepto (solo validación técnica)
- Prompt → Claude genera código Strudel → suena en el browser
- Sin UI elaborada, sin secuenciador visual
- Objetivo: validar que el puente NL→Strudel funciona de forma consistente
- Entregable: un script o página HTML mínima que demuestre el ciclo completo

### MVP — Instrumento mínimo jugable
- Todo lo marcado como Must
- Una sesión de jam funcional: escribes, suena, ajustas, iteras
- Despliegue en Vercel para acceso desde cualquier navegador

### v1 — Experiencia completa de live coding natural
- BPM slider, beat cursor, código Strudel visible
- Contexto de sesión más rico y coherente
- Primeras melodías y armonías
- Selección de LLM desde la interfaz

---

## Riesgos y decisiones pendientes

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Sincronismo visual-audio (grid vs clock de Strudel) | Alto | Integración cuidadosa con el scheduler interno de Strudel desde el principio |
| Consistencia del output del LLM (Strudel válido cada vez) | Alto | System prompt muy trabajado con ejemplos y schema estricto de salida JSON |
| Latencia de la llamada al LLM interrumpe la experiencia | Medio | El audio nunca se para; el LLM actualiza el siguiente ciclo |
| Calidad musical varía entre modelos LLM | Medio | El adapter permite testear y elegir; Claude es el benchmark inicial |
| WebAudio en Safari tiene comportamiento diferente | Bajo | Strudel lo abstrae en gran medida; testear desde el principio |

### Decisiones tomadas ✅
- **Backend:** Next.js API routes (monolito en Vercel, sin servidor separado).
- **Contexto de sesión:** Solo en cliente — Zustand + localStorage para MVP.
- **API key:** Protegida en servidor desde el principio (Next.js API route), incluso en v0 local se usa `.env` sin exposición al cliente.

---

## Referencias

- [Strudel.cc](https://strudel.cc) — TidalCycles en el browser
- [TidalCycles](https://tidalcycles.org) — live coding musical original
- [Algorave](https://algorave.com) — comunidad y concepto de partida
- [Anthropic API](https://docs.anthropic.com) — LLM principal del MVP

---

*Documento generado como especificación inicial. Versión viva — actualizar conforme avance el proyecto.*
