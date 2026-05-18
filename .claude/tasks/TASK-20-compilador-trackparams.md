---
id: TASK-20
status: pending
---

# TASK-20 — Compilador: soporte TrackParams en `compileToStrudel`

| Campo | Valor |
|---|---|
| Task-ID | TASK-20 |
| Sprint | 3 |
| Estado | TODO |
| Prioridad | P0 |
| Estimación | 4h |
| Dependencias | TASK-19 |
| Capacidades relacionadas | CAP-NLM-014 · Sintetizador por pista |

> Extiende `compileToStrudel` para traducir `TrackParams` a métodos Strudel
> encadenados. Incluye también la acción `updateTrackParams` en el store,
> ya que su responsabilidad principal es recompilar el código.

---

## Contexto

Actualmente el compilador produce:
```
s("bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~").gain(0.85)
```

Con `params`, la salida debe encadenar los métodos Strudel correspondientes:
```
s("bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~").gain(0.85).room(0.6).delay(0.25)
```

Cuando `synth` es un oscilador (`sine`, `sawtooth`, `square`, `triangle`),
los 16 pasos siguen marcando el gate de cada nota. La salida cambia de forma:
```
note("<c2 eb2>").s("sine").struct("x ~ ~ ~ x ~ ~ ~ x ~ ~ ~ x ~ ~ ~").gain(0.85)
```

---

## Acceptance Criteria

### Compilador

**AC-1 — Sin params: salida idéntica a la actual**
Si `track.params` es `undefined`, el código generado es exactamente igual al
de antes de esta task. Cero regresiones.

**AC-2 — Modo sample + effects**
Dado `params: { room: 0.6, delay: 0.25, delaytime: 0.5, delayfeedback: 0.4, pan: 0.3 }`:
```
s("bd ~ ...").gain(0.85).room(0.6).delay(0.25).delaytime(0.5).delayfeedback(0.4).pan(0.3)
```

**AC-3 — Modo sample + ADSR + filtro**
Dado `params: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 0.5, filterType: 'lp', filterCutoff: 800, filterQ: 5 }`:
```
s("bd ~ ...").gain(0.85).attack(0.1).decay(0.2).sustain(0.8).release(0.5).lpf(800).lpq(5)
```

**AC-4 — Modo synth: gate via `struct()`**
Dado `synth: 'sine'`, `note: '<c2 eb2>'`, steps `[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]`:
```
note("<c2 eb2>").s("sine").struct("x ~ ~ ~ x ~ ~ ~ x ~ ~ ~ x ~ ~ ~").gain(0.85)
```
Los pasos `1` se mapean a `x`, los `0` a `~`.
Si `params.note` no está definido, usar `"c3"` como nota por defecto.

**AC-5 — Filtro HP**
`filterType: 'hp'` emite `.hpf(cutoff).lpq(Q)` en vez de `.lpf()`.

**AC-6 — Solo se emiten los campos definidos**
Un campo `undefined` no añade ningún método. Un valor `0` sí se emite.

**AC-7 — BR-NEW-003: hard cap en `delayfeedback`**
El compilador nunca emite `.delayfeedback(n)` con `n >= 1`. Si el valor
supera `0.9`, se trunca defensivamente.

**AC-8 — `delaytime` y `delayfeedback` solo con `delay`**
Ambos se emiten únicamente si `params.delay` también está definido.

**AC-9 — Orden de encadenamiento consistente**
Siempre: `gain → ADSR → filtro → room → delay/delaytime/delayfeedback → pan`

**AC-10 — Reverse parser: comportamiento conocido documentado**
`parseStrudelToTrackJson` no se modifica. Las pistas con `params` devuelven
`null` y caen a modo código-manual. Se documenta con un comentario en `compiler.ts`:
`// TASK-20: tracks con params caen a código-manual (deuda conocida)`

### Store

**AC-11 — Acción `updateTrackParams` en el store**
```typescript
updateTrackParams(id: string, patch: Partial<TrackParams>): void
```
La acción:
1. Localiza el track por `id`. Si no existe, no-op sin error.
2. Hace **merge** de `patch` sobre `track.params` existente:
   `params = { ...track.params, ...patch }`
3. Recompila `currentCode` con `compileToStrudel`.
4. Mantiene `isCodeManuallyEdited` en `false`.

**AC-12 — Merge semántico**
```
Before: params = { room: 0.6, delay: 0.3 }
Call:   updateTrackParams(id, { room: 0 })
After:  params = { room: 0, delay: 0.3 }   // delay no se pierde
```

**AC-13 — Primer patch sobre track sin params**
```
Before: params = undefined
Call:   updateTrackParams(id, { room: 0.6 })
After:  params = { room: 0.6 }
```

**AC-14 — Persistencia automática**
`params` persiste en localStorage sin cambios en `partialize`, dado que
`tracks` ya está en `PersistedState` y `Track` incluye `params?` tras TASK-19.

**AC-15 — Hook `useUpdateTrackParams`**
```typescript
// src/features/sequencer/hooks/useUpdateTrackParams.ts
export function useUpdateTrackParams(strudel: UseStrudelResult) {
  const updateTrackParams = useSessionStore(s => s.updateTrackParams);
  const isPlaying = useSessionStore(s => s.isPlaying);

  return useCallback((id: string, patch: Partial<TrackParams>) => {
    updateTrackParams(id, patch);
    const newCode = useSessionStore.getState().currentCode;
    if (isPlaying) {
      void strudel.play(newCode);
    }
  }, [updateTrackParams, isPlaying, strudel]);
}
```

**AC-16 — Todos los tests existentes pasan**

---

## Business Rules

**BR-NEW-001** (heredada de TASK-19) — tracks sin `params` se compilan igual que antes.

**BR-NEW-002** (heredada de TASK-19) — `note` solo tiene efecto cuando `synth` es oscilador.

**BR-NEW-003** (heredada de TASK-19) — `delayfeedback` nunca se emite `>= 1`.

**BR-001** — El cambio de params no interrumpe el audio.
Si `isPlaying` es `false`, `useUpdateTrackParams` no llama a `strudel.play()`.

---

## Archivos a modificar

| Archivo | Acción |
|---------|--------|
| `src/features/audio/compiler.ts` | Extender `CompilableTrack`, añadir `buildParamsChain()`, modificar `compileToStrudel` |
| `src/features/audio/__tests__/compiler.test.ts` | Añadir suite `TASK-20` |
| `src/store/sessionStore.ts` | Añadir `updateTrackParams` a `SessionStore` e implementación |
| `src/features/sequencer/hooks/useUpdateTrackParams.ts` | Crear hook nuevo |
| `src/store/__tests__/sessionStore.test.ts` | Añadir suite `TASK-20` |

---

## Implementación orientativa

```typescript
// compiler.ts — función auxiliar pura
function buildParamsChain(params: TrackParams | undefined): string {
  if (!params) return '';
  const parts: string[] = [];

  // ADSR
  if (params.attack   !== undefined) parts.push(`.attack(${params.attack})`);
  if (params.decay    !== undefined) parts.push(`.decay(${params.decay})`);
  if (params.sustain  !== undefined) parts.push(`.sustain(${params.sustain})`);
  if (params.release  !== undefined) parts.push(`.release(${params.release})`);

  // Filtro
  if (params.filterCutoff !== undefined) {
    const method = params.filterType === 'hp' ? 'hpf' : 'lpf';
    parts.push(`.${method}(${params.filterCutoff})`);
    if (params.filterQ !== undefined) parts.push(`.lpq(${params.filterQ})`);
  }

  // Reverb
  if (params.room !== undefined) parts.push(`.room(${params.room})`);

  // Delay chain
  if (params.delay !== undefined) {
    parts.push(`.delay(${params.delay})`);
    if (params.delaytime     !== undefined) parts.push(`.delaytime(${params.delaytime})`);
    if (params.delayfeedback !== undefined) {
      const fb = Math.min(params.delayfeedback, 0.9); // BR-NEW-003
      parts.push(`.delayfeedback(${fb})`);
    }
  }

  // Pan
  if (params.pan !== undefined) parts.push(`.pan(${params.pan})`);

  return parts.join('');
}

// En compileToStrudel, construcción del bloque por track:
const params = track.params;
const isSynth = params?.synth && params.synth !== 'sample';

if (isSynth) {
  const noteVal = params.note ?? 'c3';
  const structPat = track.steps.map(s => s === 1 ? 'x' : '~').join(' ');
  return `note("${noteVal}").s("${params.synth}").struct("${structPat}").gain(${gain.toFixed(2)})${buildParamsChain(params)}`;
}

return `s("${pattern}").gain(${gain.toFixed(2)})${buildParamsChain(params)}`;
```

---

## Tests

```typescript
describe('TASK-20: TrackParams → Strudel (compilador)', () => {
  it('AC-1: sin params → salida idéntica a la actual', () => { ... })
  it('AC-2: sample + room + delay → métodos encadenados en orden', () => { ... })
  it('AC-3: sample + ADSR + lpf', () => { ... })
  it('AC-4: synth sine + note + steps → note().s().struct().gain()', () => { ... })
  it('AC-5: filterType hp → hpf()', () => { ... })
  it('AC-6: campo undefined no emite método', () => { ... })
  it('AC-7: delayfeedback se trunca a 0.9 si supera el límite', () => { ... })
  it('AC-8: delaytime sin delay no se emite', () => { ... })
  it('AC-9: orden de encadenamiento correcto con todos los params', () => { ... })
  it('AC-10: parseStrudelToTrackJson devuelve null con params en la cadena', () => { ... })
})

describe('TASK-20: updateTrackParams (store)', () => {
  it('AC-11: añade params a un track sin params previos', () => { ... })
  it('AC-12: hace merge — no machaca params existentes', () => { ... })
  it('AC-13: actualiza currentCode tras el cambio', () => { ... })
  it('AC-14: no-op si el id no existe', () => { ... })
  it('AC-15: params persiste en localStorage', () => { ... })
  it('AC-16: isCodeManuallyEdited permanece false', () => { ... })
})
```

---

## Notas para el implementador

- `buildParamsChain` debe ser función pura y testeable de forma aislada.
- El tipo `CompilableTrack` (interfaz interna del compilador) debe añadir
  `params?: TrackParams` para no depender del tipo `Track` completo.
- `parseStrudelToTrackJson` no se modifica — añadir solo el comentario de deuda.
- El hook `useUpdateTrackParams` vive en `src/features/sequencer/hooks/`.
- Leer `currentCode` via `useSessionStore.getState().currentCode` tras la acción
  para garantizar el valor recompilado en el mismo tick.
- No importar `strudel` directamente en el store — el store permanece puro.
