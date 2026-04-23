# TASK-04 — Estado ERROR con reintento

**Depende de:** TASK-01 completada sin issues bloqueantes (TASK-02 y TASK-03 recomendadas pero no obligatorias)
**CAP relacionadas:** CAP-NLM-001, CAP-NLM-002
**Spec de referencia:** `nlmusic-spec.md` Secciones 5 (BR-002, BR-003), 6 (estado ERROR), 7 (EC-001, EC-002), 8 (BDD CAP-NLM-001)

---

## Objetivo

Implementar el estado ERROR de la máquina de estados completo:
el sistema informa al usuario cuando algo falla, mantiene el estado
anterior intacto, conserva el prompt y ofrece la opción de reintentar.

---

## Reglas que debe cumplir (leer la spec antes de implementar)

- **BR-002:** Si el LLM devuelve JSON inválido → descartar, mantener estado, informar, ofrecer reintento
- **BR-003:** Cualquier error (red, timeout, schema) → mismo comportamiento uniforme
- **EC-001:** JSON malformado → mantener estado anterior, prompt intacto
- **EC-002:** Error de red → mismo comportamiento que EC-001
- **El audio nunca se interrumpe (BR-001)** — en estado ERROR el audio sigue sonando si había pistas

---

## Transiciones de estado a implementar

```
LOADING → ERROR    cuando llm.response_error (cualquier tipo)
ERROR   → LOADING  cuando user.retry (reutiliza el prompt anterior)
```

El prompt NO se borra en caso de error.
El prompt SÍ se borra cuando LOADING termina con éxito.

---

## Qué implementar

### 1. Estado ERROR en el store

**Archivo:** `src/store/sessionStore.ts`

Añadir o verificar:
```typescript
// Estado de UI
uiState: 'idle' | 'loading' | 'playing' | 'paused' | 'error'
lastError: string | null   // mensaje de error para mostrar al usuario
lastPrompt: string | null  // prompt que causó el error — para reintento
```

Acciones necesarias:
- `setError(message: string)` — transición a ERROR, guarda el mensaje
- `clearError()` — limpia el error al reintentar
- `retry()` — transición ERROR → LOADING reutilizando `lastPrompt`

---

### 2. Feedback visual de error

**Archivo:** `src/features/prompt/components/PromptBox.tsx`

El componente debe mostrar:
- Mensaje de error no bloqueante (no modal, no bloquea la UI)
- Botón "Reintentar" visible cuando `uiState === 'error'`
- El contenido del prompt permanece intacto en estado ERROR
- El input se desbloquea en estado ERROR (el usuario puede editar el prompt)

Ejemplo de layout sugerido (adaptar al design system existente):
```
┌─────────────────────────────────────────┐
│ ⚠ No se pudo generar el patrón.        │
│   [Reintentar]                          │
├─────────────────────────────────────────┤
│ [el prompt anterior sigue aquí...]  →  │
└─────────────────────────────────────────┘
```

Usar `var(--red)` para el icono/borde de error.
Usar `var(--text-dim)` para el mensaje descriptivo.

---

### 3. Lógica de reintento

**Archivo:** `src/features/prompt/hooks/usePatternGen.ts`

Al pulsar "Reintentar":
- Transición ERROR → LOADING
- Reutiliza `lastPrompt` del store — no requiere que el usuario reescriba
- El flujo continúa igual que un submit normal

---

## Escenarios BDD a verificar manualmente

```
Scenario: Error en la llamada al LLM
  Given hay 2 pistas sonando
  When el LLM devuelve un error o una respuesta inválida
  Then el audio no se interrumpe
  And las pistas existentes no cambian
  And se muestra un mensaje de error al usuario
  And se ofrece la opción de reintentar
  And el contenido del prompt permanece intacto

Scenario: Reintento tras error
  Given el sistema está en estado ERROR con prompt intacto
  When el usuario pulsa Reintentar
  Then el sistema vuelve a LOADING
  And reutiliza el prompt anterior sin que el usuario lo reescriba
```

---

## Archivos a modificar

- `src/store/sessionStore.ts` — añadir estado error y acciones
- `src/features/prompt/components/PromptBox.tsx` — UI de error + reintento
- `src/features/prompt/hooks/usePatternGen.ts` — lógica de reintento
