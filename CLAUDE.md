# NLMusic — Claude Agent Instructions

> Este archivo es un resumen operativo del proyecto.
> Consulta `nlmusic-spec.md` solo cuando necesites reglas funcionales, edge cases o escenarios BDD específicos.

## Qué es este proyecto

NLMusic convierte instrucciones musicales en lenguaje natural en patrones reproducidos en tiempo real en el navegador, sin interrumpir lo que ya está sonando.

## Stack

- Frontend: React 19 + TypeScript + Next.js App Router
- Audio: `@strudel/web`
- Estado: Zustand con persistencia
- LLM: adapter server-side vía `/api/generate-pattern`
- Estilos: Tailwind CSS

## Invariantes críticas

- BR-001: el audio nunca se interrumpe durante generación o cambios incrementales.
- BR-006: nunca superar 5 pistas.
- BR-007: eliminar pista es destructivo e irreversible.
- BR-008: editar el grid manualmente no invoca al LLM.
- BR-009: grid y editor Strudel deben mantenerse coherentes.
- BR-011: la API key nunca se expone al cliente.

## Mapa rápido del proyecto

- `src/app`: layout, page y API routes
- `src/features/audio`: compilación y hooks de Strudel
- `src/features/prompt`: prompt box y generación
- `src/features/sequencer`: grid y cards de pistas
- `src/features/transport`: play, stop, BPM, barra superior
- `src/features/code-view`: panel y editor Strudel
- `src/lib/llm`: prompts, pipeline, adapters, validación
- `src/store/sessionStore.ts`: estado global de sesión

## Cómo leer contexto según la tarea

- Si tocas audio o reproducción: revisa reglas de continuidad de audio y el código en `src/features/audio`.
- Si tocas generación LLM o pipeline: revisa `src/lib/llm` y, solo si hace falta, la spec para BR-002, BR-003, BR-004, BR-006, BR-009 y BR-011.
- Si tocas UI local o estilos: empieza por el componente y sus tests; no leas la spec completa salvo dependencia funcional explícita.
- Si tocas estados, retry o errores: revisa store, transiciones y edge cases relevantes.
- Si la tarea viene del backlog: abre solo la task concreta y sus dependencias directas.

## Máquina de estados

La app debe mantenerse coherente con este flujo:

`IDLE → LOADING → PLAYING → PAUSED → ERROR`

Usa la spec solo si necesitas detalle exacto de transiciones y edge cases.

## Convenciones

- Componentes funcionales con hooks y exports nombrados.
- Sin `any` salvo necesidad excepcional justificada.
- Sin lógica de negocio compleja en componentes UI.
- Importaciones cross-feature por barrel cuando exista.
- Cambios mínimos y verificables.

## Cuándo abrir la spec completa

Consulta `nlmusic-spec.md` únicamente si ocurre alguno de estos casos:

- el cambio modifica una regla BR-*
- afecta transiciones de estado
- toca edge cases de error o retry
- cambia comportamiento funcional visible al usuario
- implementa una task con criterios de aceptación

## Qué no meter aquí

- Estado histórico del proyecto
- Roadmap largo
- Checklist completo de tareas
- Detalle exhaustivo de edge cases
- Ejemplos extensos que no sean necesarios para orientar trabajo local

1. Mira `TASK-INDEX.md` para identificar qué task toca y cuáles son sus dependencias
2. Lee el archivo de tarea correspondiente — fíjate en el frontmatter (`status`)
3. Localiza el CAP-ID en `nlmusic-spec.md`
4. Lee las secciones 5 (reglas), 6 (estados), 7 (edges) y 8 (BDD) para esa capacidad
5. Implementa respetando todas las reglas y cubriendo todos los edge cases
6. Verifica contra los escenarios BDD de la Sección 8

**Al cerrar una task:**

Una vez cerrada tu parte la task, mostraras un mensaje dando el OK, para el agente nlmusic-reviewer

No cambies  el estado de los archivos TASK-**.md ni de   TASK-INDEX-md, no hagas commit. de este se encargará otro agente 

Si la task introdujo cambios estructurales (nuevas dependencias, nuevos directorios,
   cambios en el modelo de datos) actualiza la sección "Estado actual del proyecto"
   más abajo en este mismo `CLAUDE.md`

---

## Estado actual del proyecto (Abril 2026)

**Completado:**
- Pipeline LLM → JSON → Strudel ✅
- Sequencer visual 16 pasos, mute/solo, volumen ✅
- Play/Stop, BPM control, BarIndicator ✅
- Persistencia Zustand + localStorage ✅
- Build producción sin errores ✅
- Validación e2e del flujo Prompt → API → Pipeline → Adapter → Store → Strudel (TASK-01)
- Robustez de inicialización Strudel + banner EC-010 (TASK-02)
- Límite máximo de 5 pistas, contador y truncado defensivo (TASK-03)
- Estado ERROR con reintento, prompt persistente (TASK-04)
- Incrementalidad de pistas con `applyDelta` (add/update/remove/replace) (TASK-05)
- Coherencia compiler + contrato API (mute via `gain(0)`) (TASK-06)
- Eliminar pista desde UI con botón ✕ — transición a IDLE en última pista (TASK-07)
- StrudelCodePanel editable (textarea) con sincronización bidireccional grid ↔ código + flag `isCodeManuallyEdited` (TASK-08)
- Contexto LLM coherente en modo código: `codeMode` como fuente de verdad y guardas de pipeline para deltas inseguros (TASK-09)
- Editor CodeMirror 6 con syntax highlighting (paleta del design system) — deps: codemirror, @codemirror/*, @strudel/codemirror (TASK-10)
- Tercera pestaña Configuración/Guía con estado del sistema, guía de prompts clickable y preferencias de editor persistidas (TASK-12)

- Multiidioma UI ES / EN: selector discreto en TransportBar, detección del navegador, diccionario tipado centralizado, hook `useTranslation` reactivo, persistencia en localStorage (TASK-13)

**Pendiente Sprint 2 (orden de ejecución):**
- TASK-11 — Hap highlighting en tiempo real (flash de tokens al sonar) sobre el editor CodeMirror

**Nuevas dependencias añadidas (TASK-10):**
- `codemirror@6.0.2`, `@codemirror/state`, `@codemirror/view`, `@codemirror/language`, `@codemirror/commands`, `@codemirror/lang-javascript`, `@strudel/codemirror@1.3.0`

**Nuevos directorios/archivos (TASK-10):**
- `src/features/code-view/theme/nlmusicTheme.ts` — theme dedicado reutilizable
- `src/features/code-view/components/StrudelEditor.tsx` — componente CodeMirror puro (sin lógica de store)

**Nuevos directorios/archivos (TASK-12):**
- `src/features/config/` — tercera pestaña Configuración/Guía (estado, guía de prompts, atajos, preferencias)
- `src/features/code-view/components/__tests__/StrudelCodePanel.task12.test.tsx` — cobertura del toggle editor avanzado/simple

**Nuevos directorios/archivos (TASK-13):**
- `src/lib/i18n/translations.ts` — diccionario ES/EN tipado con `TranslationKey` union
- `src/lib/i18n/useTranslation.ts` — hook reactivo que lee `language` del store
- `src/lib/i18n/index.ts` — barrel export

 El índice maestro
con dependencias y criterios de revisión está en `.claude/tasks/TASK-INDEX.md`.
