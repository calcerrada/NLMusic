---
id: TASK-07
status: done
completed_commit: 7ec08f9
completed_date: 2026-04-24
---

# TASK-07 — Eliminar pista desde UI (CAP-NLM-003)

**Depende de:** TASK-04 completada (estado ERROR debe estar estable antes de añadir transiciones IDLE)
**CAP:** CAP-NLM-003
**Spec de referencia:** `nlmusic-spec.md` Secciones 5 (BR-007), 6 (transiciones PLAYING/PAUSED → IDLE), 7 (EC-007, EC-008), 8 (BDD CAP-NLM-003)

---

## Objetivo

Implementar el botón ✕ en cada pista que elimina esa pista de forma
destructiva e irreversible, y gestiona correctamente las transiciones
de estado cuando se elimina la última pista.

---

## Reglas que debe cumplir

- **BR-007:** Eliminar es destructivo e irreversible. Sin confirmación. Sin deshacer.
- **EC-007:** Eliminar última pista en PLAYING → IDLE (detener audio, limpiar estado)
- **EC-008:** Eliminar última pista en PAUSED → IDLE (limpiar estado)
- **BR-001:** El audio de las pistas restantes NO se interrumpe al eliminar una pista

---

## Transiciones de estado a implementar

```
PLAYING + delete_track (quedan pistas)  → PLAYING  (audio continúa, sin interrupción)
PLAYING + delete_track (última pista)   → IDLE     (detener audio, limpiar estado)
PAUSED  + delete_track (quedan pistas)  → PAUSED   (pistas actualizadas, sin audio)
PAUSED  + delete_track (última pista)   → IDLE     (limpiar estado, resetear secuenciador)
```

---

## Qué implementar

### 1. Acción en el store

**Archivo:** `src/store/sessionStore.ts`

```typescript
deleteTrack(id: string): void
// 1. Eliminar el track con ese id del array
// 2. Regenerar strudelCode desde los tracks restantes (compiler)
// 3. Si tracks.length === 0 → transición a IDLE:
//    - Llamar a hush() para detener el audio
//    - Resetear uiState a 'idle'
// 4. Si quedan tracks → actualizar el audio con el nuevo código
//    sin interrupción (BR-001)
```

---

### 2. Botón ✕ en TrackCard

**Archivo:** `src/features/sequencer/components/TrackCard.tsx`

El botón ya existe visualmente. Conectar al store:
- `onClick` → `deleteTrack(track.id)`
- Sin diálogo de confirmación (BR-007)
- El botón debe ser claramente clickable pero no prominente
  (no queremos eliminaciones accidentales, pero tampoco confirmación)
- Color: `var(--text-muted)` en reposo, `var(--red)` en hover

---

### 3. Actualización del audio tras eliminar

**Archivo:** `src/features/audio/hooks/useStrudel.ts`

Cuando se elimina una pista con pistas restantes:
- Regenerar `strudelCode` desde los tracks restantes
- Llamar a `play(newStrudelCode)` — Strudel actualizará en el siguiente ciclo
- El audio en curso no se interrumpe (BR-001)

---

## Escenarios BDD a verificar manualmente

```
Scenario: Eliminar una pista con pistas restantes
  Given hay 3 pistas sonando
  When el usuario pulsa ✕ en la pista 2
  Then la pista desaparece del secuenciador
  And el audio de las pistas restantes continúa sin interrupción
  And la acción no se puede deshacer

Scenario: Eliminar la última pista en PLAYING
  Given hay 1 pista sonando (estado PLAYING)
  When el usuario pulsa ✕ en esa pista
  Then el audio se detiene
  And el secuenciador queda vacío
  And el sistema vuelve a IDLE

Scenario: Eliminar la última pista en PAUSED
  Given hay 1 pista visible, audio detenido (estado PAUSED)
  When el usuario pulsa ✕ en esa pista
  Then el secuenciador queda vacío
  And el sistema vuelve a IDLE
```

---

## Archivos a modificar

- `src/store/sessionStore.ts` — acción `deleteTrack`
- `src/features/sequencer/components/TrackCard.tsx` — conectar botón ✕
- `src/features/audio/hooks/useStrudel.ts` — actualizar audio sin interrupción
