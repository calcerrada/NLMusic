---
id: TASK-16
status: done
completed_commit: pending-fill-after-commit
completed_date: 2026-05-18
---

# TASK-16 — StrudelContext: eliminar prop drilling y estado mutable de módulo

| Campo | Valor |
|---|---|
| Task-ID | TASK-16 |
| Sprint | Refactor |
| Prioridad | P1 |
| Estimación | 3–4 h |
| Dependencias | TASK-14 recomendada |

> Elimina el estado mutable a nivel de módulo en `useStrudel.ts` y el prop drilling del
> objeto `strudel` a través de `TransportBar`, `StrudelCodePanel` y `ConfigTab`.

---

## Contexto

`useStrudel.ts` usa 6 variables de módulo (`let _hush`, `let _evaluate`, etc.) para
persistir el estado del runtime de Strudel entre renders sin causar re-renders.
Este patrón es un anti-patrón en React:
- El estado de módulo persiste entre tests (contaminación entre it-blocks)
- Impide múltiples instancias del hook
- Crea estado global implícito difícil de razonar

Adicionalmente, el resultado de `useStrudel()` se pasa manualmente como prop desde
`page.tsx` a `TransportBar`, `StrudelCodePanel` y `ConfigTab` (prop drilling innecesario).

---

## Objetivo

1. Mover las variables de módulo a `useRef` dentro del hook (estado encapsulado)
2. Crear un `StrudelContext` que proporcione el resultado de `useStrudel()` a cualquier
   descendiente sin props adicionales
3. Eliminar las props `strudel` de los componentes consumidores

---

## Variables de módulo a eliminar

```typescript
// useStrudel.ts — estas 6 vars se eliminan:
let _hush: (() => void) | null = null;
let _evaluate: ((code: string, autoplay?: boolean) => Promise<unknown>) | null = null;
let _transpiler: (...) | null = null;
let _getTime: (() => number) | null = null;
let _lastPattern: unknown = null;
let _lastMiniLocations: [number, number][] = [];
```

**Reemplazo:** un único `useRef<StrudelInternalState>` que agrupa todos estos campos:

```typescript
interface StrudelInternalState {
  hush: (() => void) | null;
  evaluate: ((code: string, autoplay?: boolean) => Promise<unknown>) | null;
  transpiler: (...) | null;
  getTime: (() => number) | null;
  lastPattern: unknown;
  lastMiniLocations: [number, number][];
}

// Dentro de useStrudel():
const internalRef = useRef<StrudelInternalState>({
  hush: null, evaluate: null, transpiler: null,
  getTime: null, lastPattern: null, lastMiniLocations: [],
});
```

Los callbacks (`play`, `stop`, `getHapState`) leen y escriben `internalRef.current`
en lugar de las variables de módulo.

---

## Estructura propuesta

### Nuevo archivo: `src/features/audio/context/StrudelContext.tsx`

```typescript
import { createContext, useContext } from 'react';
import { useStrudel, type UseStrudelResult } from '../hooks/useStrudel';

const StrudelContext = createContext<UseStrudelResult | null>(null);

export function StrudelProvider({ children }: { children: React.ReactNode }) {
  const strudel = useStrudel();
  return (
    <StrudelContext.Provider value={strudel}>
      {children}
    </StrudelContext.Provider>
  );
}

export function useStrudelContext(): UseStrudelResult {
  const ctx = useContext(StrudelContext);
  if (!ctx) throw new Error('useStrudelContext must be inside StrudelProvider');
  return ctx;
}
```

### `src/features/audio/index.ts`

Añadir exports:
```typescript
export { StrudelProvider, useStrudelContext } from './context/StrudelContext';
```

### `src/app/page.tsx`

```typescript
// Antes:
const strudel = useStrudel();
<TransportBar strudel={strudel} />
<StrudelCodePanel strudel={strudel} />

// Después:
<StrudelProvider>
  <TransportBar />
  {/* ... */}
</StrudelProvider>
```

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/features/audio/hooks/useStrudel.ts` | Vars de módulo → `useRef<StrudelInternalState>` |
| `src/features/audio/context/StrudelContext.tsx` | Crear (nuevo) |
| `src/features/audio/index.ts` | Exportar `StrudelProvider`, `useStrudelContext` |
| `src/app/page.tsx` | Envolver con `StrudelProvider`, eliminar prop strudel |
| `src/features/transport/components/TransportBar.tsx` | Eliminar prop `strudel`, usar `useStrudelContext()` |
| `src/features/transport/components/PlayControls.tsx` | Revisar si usa strudel directamente |
| `src/features/code-view/components/StrudelCodePanel.tsx` | Eliminar prop `strudel`, usar `useStrudelContext()` |
| `src/features/config/components/ConfigTab.tsx` | Eliminar prop `strudel`, usar `useStrudelContext()` |

---

## Tests

- `npm test` sin modificar tests existentes.
- Verificar que `initError` y `isReady` se propagan correctamente al banner EC-010.
- Con el Context, los tests de `useStrudel` no comparten estado entre it-blocks — cada
  test puede crear su propio Provider con mocks limpios.

---

## Escenarios BDD

```gherkin
Scenario: initError se propaga correctamente (EC-010)
  Given Strudel falla al inicializarse
  When la app renderiza
  Then TransportBar muestra el badge de error
  And StrudelCodePanel muestra el banner de error
  And PromptBox está deshabilitado

Scenario: play/stop funcionan sin prop drilling
  Given StrudelProvider envuelve la app
  When PlayControls llama a strudel.play()
  Then el audio inicia correctamente
  And el estado isPlaying se actualiza en el store

Scenario: estado encapsulado en useRef (aislamiento de tests)
  Given dos instancias independientes del hook en tests distintos
  When el primer test llama a stop()
  Then el segundo test no ve el estado modificado
```
