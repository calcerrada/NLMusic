# NLMusic — Especificación de producto

| Campo | Valor |
|---|---|
| Spec-ID | SPEC-NLM-000 |
| Producto | NLMusic |
| Alcance | Especificación completa del producto (todas las capacidades) |
| Versión | 0.1 |
| Autor | Calcerrada |
| Fecha | 2026-04-22 |
| Estado | DRAFT |
| Revisores | — |

> Lenguaje natural como instrumento musical en tiempo real.

---

## Problem statement

> Los músicos y artistas que quieren explorar música generativa en tiempo real necesitan aprender un lenguaje de programación específico (TidalCycles, SuperCollider) para poder hacerlo. Esta barrera técnica excluye a quienes tienen la intención musical pero no el perfil de programador, y ralentiza incluso a quienes sí lo tienen. El resultado es que la exploración creativa queda subordinada a la sintaxis.

---

## Sección 2 — Descripción Funcional

NLMusic es un instrumento de live coding musical controlado por lenguaje natural. El usuario describe intenciones musicales en texto — abstractas ("oscuro, hipnótico") o concretas ("bombo en negras, hi-hat cada dos compases") — y el sistema genera y ejecuta audio en tiempo real en el navegador, sin instalaciones ni conocimiento de programación.

Una vez generado el patrón, el usuario puede refinarlo de tres formas: enviando nuevos prompts que modifiquen o eliminen pistas concretas, editando los pasos directamente en el secuenciador visual, o modificando el código Strudel generado en la pestaña de código. Todos los cambios se aplican en el siguiente ciclo sin interrumpir el audio.

La experiencia es la de un instrumento para tocar en vivo, no la de un generador de archivos.

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

## Capacidades del producto

| ID | Capacidad | MVP |
|---|---|---|
| CAP-NLM-001 | Generar patrón desde prompt de lenguaje natural | ✅ |
| CAP-NLM-002 | Modificar o eliminar pistas desde prompt | ✅ |
| CAP-NLM-003 | Eliminar pista desde UI (botón ✕) | ✅ |
| CAP-NLM-004 | Controlar reproducción (play / stop) | ✅ |
| CAP-NLM-005 | Modificar BPM | ✅ |
| CAP-NLM-006 | Editar pasos del secuenciador manualmente | ✅ |
| CAP-NLM-007 | Mute y Solo por pista | ✅ |
| CAP-NLM-008 | Ver y editar código Strudel directamente | ✅ |
| CAP-NLM-009 | Persistencia automática de sesión | ✅ |
| CAP-NLM-010 | Guía de prompts (pestaña Configuración/Guía) | ✅ |
| CAP-NLM-011 | Gestión de API key por el usuario | ⏳ v1 |
| CAP-NLM-012 | Waveform en pestaña Strudel | ⏳ v1 |

---

## Sección 3 — Actores y Precondiciones

### Actor principal
Usuario autenticado implícitamente — en el MVP, el propio autor del proyecto. En v1+, cualquier usuario con acceso a la URL.

### Actores secundarios
- Motor de audio Strudel (WebAudio API en el navegador)
- LLM Provider (Claude vía API de Anthropic en el MVP)
- Sistema de persistencia (localStorage del navegador)

### Precondiciones
- El usuario dispone de un navegador con soporte de WebAudio API
  (pendiente de validar compatibilidad exacta)
- La aplicación está desplegada y accesible vía URL
- La API key del LLM está configurada en el servidor (.env.local)
  — en v1+ será introducida por el usuario en la configuración
- El dispositivo tiene conexión a internet activa
  — en v1+ será opcional si se usa Ollama en local
- El motor Strudel ha completado su inicialización
  (initStrudel() ha resuelto correctamente)

### Notas de evolución
- Control de acceso: inexistente en MVP (solo uso personal);
  a definir en v1+ cuando la app sea pública
- Gestión de API key por el usuario: CAP-NLM-011, planificada para v1+
- Modo offline con Ollama: compatible con la arquitectura actual,
  planificado para v1+

---

## Sección 4 — Flujo Principal (Golden Path)

### CAP-NLM-001 · Generar patrón desde prompt

1. El usuario escribe una intención musical en lenguaje natural
   en la caja de prompt y pulsa Enter.
2. El sistema muestra un indicador de carga:
   - Primera interacción (sin pistas): ocupa el área principal
     donde aparecerán las pistas.
   - Interacciones posteriores (con pistas): indicador no
     intrusivo que no interfiere con las pistas existentes
     ni interrumpe el audio en curso.
3. El sistema envía el prompt junto con el contexto de sesión
   actual (pistas existentes, BPM, historial) al LLM.
4. El LLM devuelve una respuesta válida con el schema definido:
   JSON con tracks[] y strudelCode.
5. El sistema añade la nueva pista al estado de sesión (Zustand)
   de forma secuencial — independientemente de si el usuario
   referenció un número de pista concreto.
6. El sistema oculta el indicador de carga.
7. El sistema renderiza una nueva lane en el secuenciador con:
   el nombre de la pista, los pasos activos, y los controles
   de mute, solo y eliminar (✕).
8. El sistema evalúa el código Strudel generado en el motor
   de audio.
9. El audio comienza a sonar en el siguiente ciclo de Strudel.
10. El cursor del secuenciador se activa mostrando el paso
    que se está ejecutando en cada momento.

---

## Sección 5 — Reglas de Negocio

| ID | Regla | Tipo | Consecuencia si se viola |
|---|---|---|---|
| BR-001 | El audio nunca se interrumpe durante una llamada al LLM | RESTRICTION | El patrón actual sigue sonando hasta que el nuevo esté listo |
| BR-002 | El LLM debe devolver una respuesta que cumpla el schema definido (JSON válido con tracks[] y strudelCode) | VALIDATION | Se descarta la respuesta, se mantiene el estado anterior, se informa al usuario y se ofrece la opción de reintentar |
| BR-003 | Cualquier error en la llamada al LLM (red, timeout, schema inválido) se trata de forma uniforme | RESTRICTION | Se mantiene el estado anterior, se informa al usuario y se ofrece la opción de reintentar |
| BR-004 | Las pistas se crean siempre de forma secuencial, independientemente de si el usuario referencia un número de pista concreto | AUTOMATIC | Si el usuario dice "en la pista 5 añade un bombo" y no hay pistas, se crea la pista 1 |
| BR-005 | Las referencias a pistas en el prompt solo tienen efecto si esa pista ya existe | VALIDATION | Si la pista referenciada no existe, se trata como error: se informa al usuario y no se realiza ningún cambio |
| BR-006 | El número máximo de pistas es 5 | RESTRICTION | Si el usuario intenta añadir una sexta pista, se informa del límite y no se crea la pista |
| BR-007 | Eliminar una pista es una acción destructiva e irreversible | RESTRICTION | No requiere confirmación. No existe deshacer en el MVP |
| BR-008 | Editar el grid manualmente no invoca al LLM | AUTOMATIC | Los cambios se aplican localmente, se regenera el strudelCode desde el JSON, y el audio se actualiza en el siguiente ciclo |
| BR-009 | El editor de código Strudel y el grid del secuenciador están sincronizados bidireccionalmente | RESTRICTION | Cualquier cambio en uno se refleja inmediatamente en el otro |
| BR-010 | Un prompt vacío no genera llamada al LLM | VALIDATION | Se ignora con feedback visual al usuario |
| BR-011 | La API key nunca se expone al cliente | AUTHORIZATION | Toda llamada al LLM va proxied por Next.js API route. La key solo vive en .env.local |

---

## Sección 6 — Máquina de Estados

### Estados

| Estado | Descripción |
|---|---|
| IDLE | App cargada, sin pistas, sin audio |
| LOADING | LLM procesando una petición. Input de prompt bloqueado |
| PLAYING | Pistas activas, audio sonando, cursor activo |
| PAUSED | Pistas activas, audio detenido |
| ERROR | Llamada al LLM fallida. Pistas y prompt intactos |

### Transiciones

| De | A | Trigger | Guard | Side effect |
|---|---|---|---|---|
| IDLE | LOADING | user.submit_prompt | Prompt no vacío | Mostrar indicador de carga en área principal; bloquear input |
| LOADING | PLAYING | llm.response_ok | JSON válido, pistas ≤ 5 | Limpiar prompt; ocultar indicador; renderizar pista; arrancar audio |
| LOADING | ERROR | llm.response_error | Cualquier error (red, schema, timeout) | Ocultar indicador; desbloquear input; mantener prompt; mostrar error con opción de reintentar |
| PLAYING | LOADING | user.submit_prompt | Prompt no vacío | Mostrar indicador no intrusivo; bloquear input; audio continúa |
| PLAYING | PAUSED | user.stop | — | Detener audio; cursor se detiene; pistas permanecen |
| PLAYING | IDLE | user.delete_track | Era la última pista | Detener audio; limpiar estado; resetear secuenciador |
| PAUSED | PLAYING | user.play | Al menos una pista existe | Audio arranca desde el principio del ciclo |
| PAUSED | LOADING | user.submit_prompt | Prompt no vacío | Mostrar indicador no intrusivo; bloquear input |
| PAUSED | IDLE | user.delete_track | Era la última pista | Limpiar estado; resetear secuenciador |
| ERROR | LOADING | user.retry | Prompt no vacío | Mostrar indicador de carga; bloquear input; reutilizar prompt anterior |

### Notas
- El prompt nunca se borra en caso de error — el usuario puede
  reenviarlo o modificarlo.
- El prompt se limpia únicamente cuando LOADING termina con éxito.

---

## Sección 7 — Edge Cases

| ID | Escenario | Comportamiento esperado |
|---|---|---|
| EC-001 | El LLM devuelve JSON malformado o que no cumple el schema | Mantener estado anterior; informar al usuario; ofrecer reintento; prompt intacto |
| EC-002 | Error de red durante la llamada al LLM | Mismo comportamiento que EC-001 |
| EC-003 | El usuario referencia en el prompt una pista que no existe | Informar al usuario; no realizar ningún cambio; no invocar al LLM |
| EC-004 | El usuario intenta añadir una pista cuando ya hay 5 | Informar del límite; no crear ninguna pista |
| EC-005 | El LLM devuelve un prompt que requiere crear más pistas de las disponibles (ej: quedan 1 libre, el LLM quiere crear 3) | Informar al usuario del conflicto y dejarle decidir cómo proceder |
| EC-006 | El usuario escribe código Strudel inválido en la pestaña de código | Capturar el error de Strudel e informar al usuario; si Strudel no lanza error, no hacer nada |
| EC-007 | El usuario elimina la última pista mientras el sistema está en PLAYING | Detener audio; volver a IDLE; resetear secuenciador |
| EC-008 | El usuario elimina la última pista mientras el sistema está en PAUSED | Volver a IDLE; resetear secuenciador |
| EC-009 | El usuario envía un prompt mientras LOADING está activo | El input está bloqueado; no se genera ninguna llamada al LLM |
| EC-010 | initStrudel() falla durante la carga de la app | La app no es funcional; mostrar mensaje de error claro indicando que el motor de audio no ha podido inicializarse |

---

## Sección 8 — BDD (Criterios de Aceptación)

### CAP-NLM-001 · Generar patrón desde prompt

**Scenario: Primera generación exitosa**
```
Given la app está cargada y no hay pistas
When el usuario escribe "un bombo 808 para drum and bass" y pulsa Enter
Then el indicador de carga aparece en el área principal
And en menos de 5 segundos aparece una nueva pista en el secuenciador
And el audio comienza a sonar
And el cursor del secuenciador muestra el paso activo
And el campo de prompt queda vacío
```

**Scenario: Generación con pistas existentes**
```
Given hay 2 pistas sonando
When el usuario escribe "añade un hi-hat" y pulsa Enter
Then el indicador de carga aparece sin tapar las pistas existentes
And el audio de las pistas existentes no se interrumpe
And aparece una tercera pista en el secuenciador
And el campo de prompt queda vacío
```

**Scenario: Prompt vacío**
```
Given la app está en cualquier estado
When el usuario pulsa Enter con el campo de prompt vacío
Then no se realiza ninguna llamada al LLM
And se muestra feedback visual indicando que el prompt está vacío
```

**Scenario: Error en la llamada al LLM**
```
Given hay 2 pistas sonando
When el LLM devuelve un error o una respuesta inválida
Then el audio no se interrumpe
And las pistas existentes no cambian
And se muestra un mensaje de error al usuario
And se ofrece la opción de reintentar
And el contenido del prompt permanece intacto
```

**Scenario: Intento de crear una sexta pista**
```
Given hay 5 pistas activas
When el usuario escribe "añade una conga" y pulsa Enter
Then no se crea ninguna pista nueva
And se informa al usuario de que se ha alcanzado el límite de pistas
```

---

### CAP-NLM-004 · Controlar reproducción

**Scenario: Stop con pistas activas**
```
Given hay pistas sonando
When el usuario pulsa Stop
Then el audio se detiene
And el cursor del secuenciador se detiene
And las pistas permanecen visibles
```

**Scenario: Play tras Stop**
```
Given hay pistas visibles y el audio está detenido
When el usuario pulsa Play
Then el audio arranca desde el principio del ciclo
And el cursor del secuenciador se activa
```

---

### CAP-NLM-006 · Editar pasos del secuenciador manualmente

**Scenario: Edición manual de un paso**
```
Given hay una pista sonando
When el usuario activa o desactiva un paso en el grid
Then no se realiza ninguna llamada al LLM
And el cambio se refleja en el audio en el siguiente ciclo
And el código Strudel en la pestaña de código se actualiza
```

---

### CAP-NLM-008 · Editar código Strudel directamente

**Scenario: Edición válida de código Strudel**
```
Given hay pistas sonando y el usuario está en la pestaña Strudel
When el usuario modifica el código Strudel y el código es válido
Then el audio se actualiza en el siguiente ciclo
And el grid del secuenciador refleja los cambios
```

**Scenario: Edición inválida de código Strudel**
```
Given el usuario está editando código en la pestaña Strudel
When el usuario escribe código que Strudel no puede ejecutar
Then se captura el error y se informa al usuario
And el estado anterior del audio se mantiene
```

---

### CAP-NLM-003 · Eliminar pista

**Scenario: Eliminar una pista con pistas restantes**
```
Given hay 3 pistas sonando
When el usuario pulsa ✕ en la pista 2
Then la pista desaparece del secuenciador
And el audio de las pistas restantes continúa sin interrupción
And la acción no se puede deshacer
```

**Scenario: Eliminar la última pista**
```
Given hay 1 pista activa en cualquier estado
When el usuario pulsa ✕ en esa pista
Then el audio se detiene
And el secuenciador queda vacío
And el sistema vuelve a IDLE
```

---

## Sección 9 — Necesidades de Integración

| Necesidad | Propósito | Dirección | Criticidad |
|---|---|---|---|
| Generación de patrón musical | Transformar un prompt en lenguaje natural en un JSON válido con tracks[] y strudelCode | OUT (petición) / IN (respuesta) | ALTA |
| Motor de audio en tiempo real | Ejecutar patrones Strudel en el navegador sin instalaciones externas | IN (ejecución local vía WebAudio API) | ALTA |
| Persistencia de sesión | Guardar y recuperar el estado completo de la sesión entre visitas | IN/OUT (lectura y escritura local) | MEDIA |

### Proveedores actuales (MVP)

| Necesidad | Proveedor | Notas |
|---|---|---|
| Generación de patrón musical | Claude (Anthropic API) | API key en .env.local; proxied por Next.js API route |
| Motor de audio en tiempo real | Strudel.cc (@strudel/web, @strudel/webaudio, @strudel/transpiler) | Paquetes npm; no CDN |
| Persistencia de sesión | localStorage del navegador vía Zustand persist | Solo en cliente |

### Evolución prevista

| Integración | Versión | Notas |
|---|---|---|
| LLMs alternativos (OpenAI, etc.) | v1+ | La arquitectura Adapter ya lo soporta |
| LLM en local (Ollama) | v1+ | Permitiría uso offline; compatible con arquitectura actual |
| Autenticación de usuarios | v1+ | Necesaria cuando la app sea pública |

---

## Sección 10 — Adaptaciones Geográficas

### Idiomas de la UI

| Aspecto | ES | EN |
|---|---|---|
| Idioma de la interfaz | Español | Inglés |
| Idioma del prompt del usuario | Libre — cualquier idioma aceptado | Libre — cualquier idioma aceptado |
| Idioma del system prompt interno (LLM) | Inglés (fijo) | Inglés (fijo) |

### Decisiones tomadas

| Decisión | Valor | Razón |
|---|---|---|
| System prompt interno | Inglés | Máximo rendimiento en todos los modelos LLM |
| Prompt del usuario | Sin restricción de idioma | El LLM es capaz de procesar cualquier idioma |
| Idiomas de UI en MVP | Español e Inglés | Perfil del autor y audiencia inicial |

### Evolución prevista

| Aspecto | Versión | Notas |
|---|---|---|
| Idiomas adicionales de UI | v1+ | A definir según audiencia |

### Notas
- No existen variaciones regulatorias, legales ni de comportamiento
  por geografía en el MVP.
- La experiencia musical es universalmente consistente
  independientemente del idioma del usuario.

---

## La pieza clave: Strudel.cc

**Strudel** (strudel.cc) es TidalCycles ejecutándose en el navegador vía WebAudio API. Es el motor que hace viable este proyecto sin depender de DAWs, instalaciones locales ni hardware externo.

Capacidades relevantes:
- Samples de 909 / 808 / 606 incluidos (kick, snare, hi-hat, clap, etc.)
- Evaluación en tiempo real — el patrón cambia en el siguiente ciclo sin interrumpir el loop
- Sintaxis compacta y aprendible por un LLM: `s("bd ~ sd ~").fast(2)`
- Soporte nativo de efectos, filtros, envolventes ADSR, armonía — disponible para versiones futuras
- Paquete oficial `@strudel/codemirror` que añade editor editable + resaltado activo de notas en tiempo real

**Strudel se instala como paquetes npm, no como script CDN.** Esto es necesario para poder usar `@strudel/codemirror`, que requiere bundler (Vite / Next.js).

```bash
npm i @strudel/web @strudel/webaudio @strudel/transpiler @strudel/codemirror
```

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
| Frontend | React + TypeScript + Next.js 14 (App Router) | API routes integradas, sin servidor separado |
| Audio engine | `@strudel/web` + `@strudel/webaudio` + `@strudel/transpiler` | TidalCycles en el browser como paquetes npm |
| Editor de código | `@strudel/codemirror` + CodeMirror 6 | Editor editable + resaltado de notas activas en tiempo real |
| Estado | Zustand + middleware persist | Sincronización tracks ↔ UI ↔ Strudel; sesión en localStorage |
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
| Panel Strudel Code editable con resaltado activo | `@strudel/codemirror` lo da de serie — coste bajo, valor muy alto para usuarios avanzados |
| Osciloscopio de audio real (frecuencias) | `getAudioContext()` de `@strudel/webaudio` da acceso directo — sin librerías extra |
| Referencias artísticas ("algo entre Aphex Twin y minimal") | Alta complejidad de prompting |
| Export WAV/MP3 | Útil pero no es el core de la experiencia |

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
- BPM slider ajustable en la barra de transporte
- Beat cursor sincronizado con el clock de Strudel
- Panel "Strudel Code" con CodeMirror editable y resaltado activo de notas (`@strudel/codemirror`)
- Osciloscopio de audio real por frecuencias vía `AnalyserNode` de WebAudio
- Contexto de sesión más rico y coherente
- Selección de LLM desde la interfaz (la arquitectura adapter ya lo soporta)

---

## Riesgos y decisiones pendientes

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Sincronismo visual-audio (grid vs clock de Strudel) | Bajo → resuelto | `activatePattern()` de `@strudel/codemirror` gestiona el highlighting sincronizado con el scheduler interno automáticamente |
| Consistencia del output del LLM (Strudel válido cada vez) | Alto | System prompt muy trabajado con ejemplos y schema estricto de salida JSON |
| Latencia de la llamada al LLM interrumpe la experiencia | Medio | El audio nunca se para; el LLM actualiza el siguiente ciclo |
| Calidad musical varía entre modelos LLM | Medio | El adapter permite testear y elegir; Claude es el benchmark inicial |
| `getAudioContext()` no accesible en la versión de Strudel instalada | Medio | Fallback: senoide simulada con Math.sin hasta resolver; buscar en `@strudel/core` o en el objeto devuelto por `initStrudel()` |
| WebAudio en Safari tiene comportamiento diferente | Bajo | Strudel lo abstrae en gran medida; testear desde el principio |

### Decisiones tomadas ✅
- **Backend:** Next.js API routes — monolito en Vercel, sin servidor separado
- **Contexto de sesión:** solo en cliente — Zustand + localStorage
- **Strudel:** paquetes npm (`@strudel/web`, `@strudel/codemirror`, etc.) — no CDN script
- **API key en v0:** protegida en servidor desde el principio vía Next.js API route, `.env.local`
- **System prompt interno:** en inglés — máximo rendimiento en todos los modelos LLM
- **Modo offline:** no en MVP; compatible con la arquitectura actual vía OllamaAdapter en v1+

---

## Referencias

- [Strudel.cc](https://strudel.cc) — TidalCycles en el browser
- [Strudel npm packages](https://www.npmjs.com/org/strudel) — `@strudel/web`, `@strudel/codemirror`, etc.
- [Strudel — technical manual REPL](https://strudel.cc/technical-manual/repl/) — documentación del mecanismo de highlighting
- [TidalCycles](https://tidalcycles.org) — live coding musical original
- [Algorave](https://algorave.com) — comunidad y concepto de partida
- [Anthropic API](https://docs.anthropic.com) — LLM principal del MVP

---

*Documento vivo — actualizar conforme avance el proyecto.*
