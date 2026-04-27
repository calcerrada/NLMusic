---
id: TASK-13
status: pending
---

# TASK-13 — Multiidioma UI: ES / EN

**Depende de:** TASK-12 completada (UI estable antes de añadir i18n)
**Spec de referencia:** `nlmusic-spec.md` Sección 10 (Adaptaciones Geográficas)

---

## Objetivo

Añadir soporte de dos idiomas a la interfaz: español (ES) y español inglés (EN).
El prompt del usuario puede estar en cualquier idioma — no hay restricción.
El system prompt interno del LLM permanece en inglés (decisión tomada en Sección 10).

---

## Decisiones ya tomadas (no cambiar)

- **System prompt interno:** inglés fijo — no localizar
- **Prompt del usuario:** sin restricción de idioma — el LLM lo procesa en cualquier idioma
- **Idiomas de UI:** ES y EN para el MVP
- **Idioma por defecto:** inferir del navegador; fallback a ES

---

## Qué localizar

Todos los textos visibles en la UI:

**TransportBar / PlayControls:**
- Tooltips de Play / Stop

**PromptBox:**
- Placeholder del textarea
- Mensaje de error
- Texto del botón de reintento
- Feedback de prompt vacío

**TrackZone:**
- Texto del empty state
- Label del botón ✕ (accesibilidad, `aria-label`)

**BarIndicator / BpmControl:**
- Labels de accesibilidad

**Tabs:**
- Labels: "Secuenciador" / "Sequencer", "Código Strudel" / "Strudel Code", "Configuración" / "Settings"

**ConfigTab:**
- Todos los títulos y textos de la guía de prompts
- Labels de estado del sistema
- Atajos de teclado

---

## Implementación recomendada

Para un proyecto de este tamaño, una solución ligera sin dependencias
externas es suficiente. No es necesario instalar `next-intl` o `react-i18next`
a menos que la complejidad lo justifique.

### Opción A — Diccionario simple (recomendada para MVP)

```typescript
// src/lib/i18n/translations.ts

const translations = {
  es: {
    'prompt.placeholder': 'Describe tu patrón... ("kick 909 en 4x4 techno")',
    'prompt.error': 'No se pudo generar el patrón.',
    'prompt.retry': 'Reintentar',
    'tracks.empty': 'Escribe un prompt para empezar',
    'tabs.sequencer': 'Secuenciador',
    'tabs.strudel': 'Código Strudel',
    'tabs.config': 'Configuración',
    // ...
  },
  en: {
    'prompt.placeholder': 'Describe your pattern... ("909 kick in 4x4 techno")',
    'prompt.error': 'Could not generate the pattern.',
    'prompt.retry': 'Retry',
    'tracks.empty': 'Write a prompt to get started',
    'tabs.sequencer': 'Sequencer',
    'tabs.strudel': 'Strudel Code',
    'tabs.config': 'Settings',
    // ...
  }
} as const

// src/lib/i18n/useTranslation.ts
export function useTranslation() {
  const lang = store.language // 'es' | 'en'
  return (key: string) => translations[lang][key] ?? key
}
```

### Opción B — next-intl (si el proyecto crece)

Solo usar si en el futuro se necesitan más de 2 idiomas o pluralización compleja.

---

## Detección de idioma

1. Al iniciar la app, leer `navigator.language`
2. Si empieza por 'es' → usar ES
3. Si empieza por 'en' → usar EN
4. Cualquier otro → fallback a ES
5. Guardar preferencia en el store (persiste en localStorage)

---

## Selector de idioma en la UI

Añadir un selector discreto en la `TransportBar` o en la pestaña de Configuración:

```
ES | EN
```

- Dos botones de texto pequeños (10px, uppercase)
- El activo en `var(--text)`, el inactivo en `var(--text-muted)`
- Al cambiar: actualizar el store, la UI cambia inmediatamente

---

## Lo que NO se localiza

- El system prompt del LLM (siempre en inglés — BR de Sección 10)
- Los nombres de los instrumentos que devuelve el LLM (kick, snare, hihat...)
- El código Strudel generado
- Los mensajes de error técnicos de Strudel (mostrarlos en inglés tal cual)

---

## Archivos a crear / modificar

- `src/lib/i18n/translations.ts` — nuevo: diccionario ES/EN
- `src/lib/i18n/useTranslation.ts` — nuevo: hook de traducción
- `src/lib/i18n/index.ts` — nuevo: barrel export
- `src/store/sessionStore.ts` — añadir `language: 'es' | 'en'` al estado
- Todos los componentes con texto visible — sustituir strings por `t('key')`
- `src/features/transport/components/TransportBar.tsx` — añadir selector de idioma
