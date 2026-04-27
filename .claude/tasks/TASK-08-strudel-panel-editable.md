---
id: TASK-08
status: done
completed_commit: 177f001
completed_date: 2026-04-24
notes: Implementado con `<textarea>` + debounce 600ms + `setManualCode`/`syncCodePattern`. La migración a CodeMirror queda en TASK-10.
---

# TASK-08 — StrudelCodePanel editable + sincronización bidireccional (CAP-NLM-008)

**Depende de:** TASK-07 completada
**CAP:** CAP-NLM-008
**Spec de referencia:** `nlmusic-spec.md` Secciones 5 (BR-009), 7 (EC-006), 8 (BDD CAP-NLM-008)
**Doc técnico de referencia:** `docs/implementation/nlmusic-strudel-panel-implementation.md`

---

## Objetivo

Convertir el `StrudelCodePanel` de read-only a editable, con sincronización
bidireccional entre el editor de código y el grid del secuenciador.
Cualquier cambio en uno se refleja en el otro.

---

## Reglas que debe cumplir

- **BR-009:** Editor Strudel y grid sincronizados bidireccionalmente — cualquier cambio en uno se refleja en el otro
- **EC-006:** Código Strudel inválido → capturar error de Strudel, informar al usuario, mantener audio anterior

---

## Las dos direcciones de sincronización

```
Grid → Editor:
  Usuario edita un paso en el grid
  → compiler genera nuevo strudelCode
  → store actualiza strudelCode
  → editor refleja el nuevo código

Editor → Grid:
  Usuario edita el código Strudel manualmente
  → Strudel evalúa el código
  → si es válido: audio se actualiza en el siguiente ciclo
  → si es válido: intentar actualizar el grid desde el código
  → si es inválido: capturar error, informar, mantener audio anterior (EC-006)
```

**Nota sobre Editor → Grid:** La sincronización inversa (código → grid) es
compleja porque Strudel tiene una sintaxis rica que no siempre mapea
1:1 a pasos de 16. Si no es posible parsear el código de vuelta a steps,
el grid puede marcarse como "modo código" (desactivado visualmente)
sin que sea un bug — lo importante es que el audio suene correctamente.

---

## Qué implementar

### 1. Hacer el editor editable

**Archivo:** `src/features/code-view/components/StrudelCodePanel.tsx`

Actualmente es read-only. Cambios necesarios:
- Permitir edición directa del código
- Debounce de 600ms antes de evaluar cambios (evitar evaluaciones en cada tecla)
- Al cambiar: llamar a `useStrudel.play(newCode)` para actualizar el audio
- Capturar errores de Strudel y mostrarlos inline (EC-006)

```typescript
// Pseudocódigo del flujo de edición
onChange(newCode) {
  debounce(600ms, () => {
    try {
      strudel.play(newCode)           // evaluar en Strudel
      store.setStrudelCode(newCode)   // actualizar store si es válido
      tryUpdateGrid(newCode)          // intentar actualizar grid (best effort)
    } catch (error) {
      showInlineError(error.message)  // EC-006: informar, no romper
      // el audio anterior sigue sonando
    }
  })
}
```

---

### 2. Sincronización Grid → Editor (ya debería funcionar)

**Archivo:** `src/store/sessionStore.ts`

Cuando el usuario edita un paso en el grid:
- El compiler genera nuevo `strudelCode`
- El store actualiza `strudelCode`
- El editor debe reaccionar al cambio en el store y mostrar el nuevo código

Verificar que el editor tiene un `useEffect` que sincroniza el código
del store al editor cuando cambia externamente (por LLM o por edición del grid).

---

### 3. Indicador de error inline

Cuando el código es inválido (EC-006):
- Mostrar el error debajo del editor, en `var(--red)` con `var(--text-dim)`
- No modal, no bloqueante
- Desaparece cuando el código vuelve a ser válido
- El audio anterior sigue sonando (BR-001)

---

### 4. Indicador de "modo código"

Si el código editado manualmente no puede mapearse de vuelta al grid:
- Marcar el grid visualmente como "modo código" (por ejemplo, opacidad reducida)
- Tooltip o label: "Editado manualmente — el grid puede no reflejar el código actual"
- El audio sigue funcionando con normalidad

---

## Escenarios BDD a verificar manualmente

```
Scenario: Edición válida de código Strudel
  Given hay pistas sonando y el usuario está en la pestaña Strudel
  When el usuario modifica el código Strudel y el código es válido
  Then el audio se actualiza en el siguiente ciclo
  And el grid del secuenciador refleja los cambios (si el código es parseable)

Scenario: Edición inválida de código Strudel
  Given el usuario está editando código en la pestaña Strudel
  When el usuario escribe código que Strudel no puede ejecutar
  Then se captura el error y se informa al usuario de forma no bloqueante
  And el estado anterior del audio se mantiene

Scenario: Edición del grid se refleja en el editor
  Given hay pistas en el secuenciador y el usuario está en la pestaña Strudel
  When el usuario activa un paso en el grid (desde la pestaña Sequencer)
  Then el código Strudel en el editor se actualiza automáticamente
```

---

## Archivos a modificar

- `src/features/code-view/components/StrudelCodePanel.tsx` — hacer editable
- `src/store/sessionStore.ts` — acción `setStrudelCode` si no existe
- `src/features/audio/hooks/useStrudel.ts` — captura de errores de evaluación
