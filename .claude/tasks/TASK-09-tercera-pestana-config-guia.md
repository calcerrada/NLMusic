# TASK-09 — Tercera pestaña: Configuración / Guía (CAP-NLM-010)

**Depende de:** TASK-08 completada
**CAP:** CAP-NLM-010
**Spec de referencia:** `nlmusic-spec.md` Secciones 2, 3 (nota sobre API key en MVP)

---

## Objetivo

Crear la tercera pestaña de la aplicación que combina una guía de uso
de prompts con información de configuración del sistema. En el MVP
la API key vive en `.env.local` — no hay formulario de configuración
de key para el usuario. La pestaña es principalmente una guía de referencia.

---

## Contenido de la pestaña

### Bloque 1 — Estado del sistema

Información de solo lectura sobre la configuración actual:

```
Motor de audio:  [● Listo / ○ No iniciado]
LLM:             Claude claude-sonnet-4-6
BPM actual:      138
Pistas activas:  3 / 5
```

- Estado del motor Strudel (`isReady` de `useStrudel`)
- Modelo LLM configurado (leer de `process.env.ANTHROPIC_MODEL` vía API o hardcodear el valor por defecto)
- BPM actual del store
- Número de pistas activas / límite máximo (BR-006)

---

### Bloque 2 — Guía de prompts

Ejemplos organizados por categoría. Usar el contenido de `PROMPT_GUIDE.md`
si existe en el proyecto, o crear el contenido siguiendo estas categorías:

**Crear desde cero:**
```
"Un kick 909 en 4x4 techno a 138 BPM"
"Drum and bass con amen break, snappy y rápido"
"Patrón minimalista, solo hi-hat y bombo suaves"
```

**Modificar pistas existentes:**
```
"Hazlo más oscuro y lento"
"Añade un clap en el tiempo 3"
"En la pista 1, quita los golpes de la segunda mitad"
```

**Referencia de estilo:**
```
"Algo entre Aphex Twin y minimal techno"
"Al estilo Burial, percusivo y atmosférico"
"Ritmo afrobeat con mucho groove"
```

**Eliminar:**
```
"Elimina el hi-hat"
"Quita todas las pistas y empieza con solo un bombo"
```

---

### Bloque 3 — Atajos de teclado

```
Enter          Enviar prompt
Shift + Enter  Nueva línea en el prompt
```

---

## Diseño

Seguir el design system existente:
- Fondo `var(--surface)`, texto `var(--text-dim)`
- Títulos de sección: 10px, uppercase, letter-spacing, `var(--text-muted)`
- Ejemplos de prompt: `font-family: JetBrains Mono`, `var(--cyan)` o `var(--surface2)` como fondo de cada ejemplo
- Cada ejemplo clickable: al hacer click copia el texto al portapapeles o lo inserta directamente en el PromptBox

**Comportamiento de los ejemplos:**
Al hacer click en un ejemplo de prompt:
- Insertar el texto en el PromptBox (no enviar — el usuario decide cuándo enviar)
- Cambiar automáticamente a la pestaña Sequencer para que el usuario vea el resultado

---

## Estructura de componentes sugerida

```
src/features/config/
├── components/
│   ├── ConfigTab.tsx          # Contenedor de la pestaña
│   ├── SystemStatus.tsx       # Bloque 1: estado del sistema
│   ├── PromptGuide.tsx        # Bloque 2: ejemplos de prompts
│   └── KeyboardShortcuts.tsx  # Bloque 3: atajos
└── index.ts
```

---

## Integración con el layout de pestañas

**Archivo:** `src/app/page.tsx` (o donde viva el TabBar actual)

Añadir la tercera pestaña al sistema de navegación existente:
- Tab 1: Sequencer (existente)
- Tab 2: Strudel Code (existente)
- Tab 3: Configuración / Guía (nueva)

El label de la pestaña puede ser "Config" o "Guía" — mantener consistencia
con el estilo de los labels existentes.

---

## Nota sobre v1+

La gestión de API key por el usuario (CAP-NLM-011) se añadirá en v1+
como un formulario en esta misma pestaña. El diseño debe dejar espacio
para ello sin necesitar rediseño completo.

---

## Archivos a crear / modificar

- `src/features/config/components/ConfigTab.tsx` — nuevo
- `src/features/config/components/SystemStatus.tsx` — nuevo
- `src/features/config/components/PromptGuide.tsx` — nuevo
- `src/features/config/components/KeyboardShortcuts.tsx` — nuevo
- `src/features/config/index.ts` — nuevo barrel export
- `src/app/page.tsx` — añadir tercera pestaña al TabBar
