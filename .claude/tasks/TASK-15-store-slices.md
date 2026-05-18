---
id: TASK-15
status: done
completed_commit: dd083e4
completed_date: 2026-05-18
---

# TASK-15 — Store: División en Zustand slices

| Campo | Valor |
|---|---|
| Task-ID | TASK-15 |
| Sprint | Refactor |
| Prioridad | P1 — riesgo alto, ejecutar como penúltima task del sprint de refactor |
| Estimación | 4–6 h |
| Dependencias | TASK-14 recomendada (reduce superficie de cambio) |

> Divide `sessionStore.ts` (>430 líneas, 8+ responsabilidades) en slices Zustand
> cohesionados. El barrel export de `useSessionStore` garantiza que los consumidores
> no necesitan actualizar sus imports.

---

## Contexto

`sessionStore.ts` viola el principio de responsabilidad única mezclando: estado de
audio, tracks, UI, historial de conversación, preferencias del editor e i18n.
Esto dificulta el testeo aislado y la localización de bugs. La solución estándar en
Zustand es el patrón de **slices** con composición en el store raíz.

---

## Objetivo

Separar el store en 5 slices cohesionados. El store combinado sigue exportando un
único `useSessionStore` — ningún consumidor (componente o hook) cambia su import.

---

## Slices propuestos

### `tracksSlice`
**Estado:** `tracks`, `bpm`
**Acciones:** `setTracks`, `setBpm`, `toggleStep`, `setVolume`, `toggleMute`,
`toggleSolo`, `addTrack`, `updateTrack`, `deleteTrack`, `loadPattern`, `syncCodePattern`

### `audioSlice`
**Estado:** `isPlaying`, `currentCode`, `isCodeManuallyEdited`
**Acciones:** `setPlaying`, `setCurrentCode`, `setManualCode`

### `uiSlice`
**Estado:** `activeTab`, `uiState`, `lastError`, `lastPrompt`, `promptDraft`
**Acciones:** `setActiveTab`, `startLoading`, `setError`, `clearError`, `setLastPrompt`,
`retry`, `setPromptDraft`

### `sessionSlice`
**Estado:** `turns`, `language`
**Acciones:** `addTurn`, `setLanguage`

### `editorSlice`
**Estado:** `editorMode`, `highlightingEnabled`, `hapVisualizationEnabled`
**Acciones:** `setEditorMode`, `setHighlightingEnabled`, `setHapVisualizationEnabled`

---

## Estructura de archivos a crear

```
src/store/
  helpers.ts              <- deriveUiState, compileCode (helpers compartidos)
  slices/
    tracksSlice.ts
    audioSlice.ts
    uiSlice.ts
    sessionSlice.ts
    editorSlice.ts
  sessionStore.ts         <- solo combina slices; mantiene API pública igual
```

---

## Firma de cada slice

Cada slice exporta su tipo y su factory function:

```typescript
// tracksSlice.ts
import type { StateCreator } from 'zustand';
import type { SessionStore } from '../sessionStore';

export type TracksSlice = {
  tracks: Track[];
  bpm: number;
  setTracks: (tracks: Track[]) => void;
  // ...resto de acciones del slice
};

export const createTracksSlice: StateCreator<
  SessionStore,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  TracksSlice
> = (set, get) => ({
  tracks: initialTracks,
  bpm: initialBpm,
  // ...implementación
});
```

---

## Store combinado (`sessionStore.ts` tras el refactor)

```typescript
export const useSessionStore = create<SessionStore>()(
  devtools(
    persist(
      (...args) => ({
        ...createTracksSlice(...args),
        ...createAudioSlice(...args),
        ...createUiSlice(...args),
        ...createSessionSlice(...args),
        ...createEditorSlice(...args),
      }),
      {
        name: 'nlmusic-session',
        partialize: (state): PersistedState => ({
          bpm: state.bpm,
          tracks: state.tracks,
          turns: state.turns.slice(-40),
          editorMode: state.editorMode,
          highlightingEnabled: state.highlightingEnabled,
          hapVisualizationEnabled: state.hapVisualizationEnabled,
          language: state.language,
        }),
      }
    )
  )
);
```

---

## Reglas de corte

- `deriveUiState` y `compileCode` → `src/store/helpers.ts` (compartidos entre slices)
- `detectLanguage` → `sessionSlice.ts` (se usa solo al inicializar `language`)
- `defaultKickTrack`, `initialTracks`, `initialBpm` → `tracksSlice.ts`
- `PersistedState` y `SessionStore` (tipo unión) → `sessionStore.ts`
- La lógica que cruza slices (ej: `loadPattern` que actualiza tracks, audio y ui a la vez)
  vive en `tracksSlice` y accede al estado completo via el tipo `SessionStore` unificado.

---

## Acciones que cruzan slice boundaries

| Acción | Slices afectados |
|--------|-----------------|
| `loadPattern` | tracks + audio + ui |
| `deleteTrack` | tracks + audio + ui |
| `setTracks` | tracks + audio |
| `syncCodePattern` | tracks + audio |
| `startLoading` | ui |
| `setError` | ui |
| `retry` | ui |

---

## Riesgo

🔴 **Alto** — este cambio toca virtualmente todos los archivos que importan del store.

Antes de empezar, ejecutar:
```bash
grep -r "useSessionStore" src/ --include="*.ts" --include="*.tsx" -l
```

Verificar que la lista de archivos es manejable. Tras el refactor:
1. `npm test` completo — ningún test debe modificarse
2. `npm run build` — sin errores TypeScript
3. Verificar que el devtools de Zustand sigue mostrando el estado correctamente

---

## Tests

- `npm test` completo sin modificar ningún test existente.
- `npm run build` — TypeScript limpio.
- Test de regresión: flujo completo prompt → generación → grid → mute → código.
- Verificar persistencia en localStorage tras recargar.

---

## Escenarios BDD

```gherkin
Scenario: imports de consumidores no cambian
  Given cualquier componente que usa useSessionStore
  When se aplica el refactor de slices
  Then los imports siguen siendo desde '@store/sessionStore'
  And el tipo SessionStore sigue siendo compatible

Scenario: estado persiste entre recargas
  Given la app tiene 3 pistas con BPM 140
  When el usuario recarga la página
  Then las 3 pistas y el BPM 140 se restauran desde localStorage

Scenario: acciones que cruzan slices funcionan
  Given la app está reproduciendo con 1 pista
  When se llama a deleteTrack con el id de esa pista
  Then tracks queda vacío, isPlaying es false y uiState es 'idle'
```
