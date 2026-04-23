# REVIEW-PROTOCOL — Revisión final de cada tarea

> Añade este paso al final de CADA tarea antes de marcarla como completa.
> Prompt exacto para Claude Code: 
> "Ejecuta el protocolo de revisión de REVIEW-PROTOCOL.md para la TASK-XX que acabas de implementar."

---

## Paso 1 — Autorevisar contra la spec

Lee `nlmusic-spec.md` y verifica que el código implementado cumple:

### Reglas de negocio (Sección 5)
Para cada BR-XXX referenciado en la tarea:
- [ ] La regla está implementada
- [ ] El ID está comentado en el código (`// BR-001: el audio nunca se interrumpe`)
- [ ] La consecuencia si se viola está gestionada (no hay camino silencioso)

### Máquina de estados (Sección 6)
Para cada transición afectada por la tarea:
- [ ] La transición existe en el código
- [ ] El trigger está capturado
- [ ] El guard está validado antes de ejecutar
- [ ] El side effect se produce correctamente

### Edge cases (Sección 7)
Para cada EC-XXX referenciado en la tarea:
- [ ] El escenario está cubierto
- [ ] El comportamiento esperado coincide con la spec
- [ ] No hay camino de código que deje el sistema en estado inconsistente

---

## Paso 2 — Verificar BDD (Sección 8)

Para cada escenario BDD de la tarea:

```
[ ] Scenario: <nombre>
    Given: <condición inicial verificable>
    When:  <acción que se puede reproducir>
    Then:  <resultado mecánicamente verificable>
```

Marca cada escenario como:
- ✅ Implementado y verificable
- ⚠️ Implementado pero difícil de verificar automáticamente (requiere prueba manual)
- ❌ No implementado — bloqueante

Si hay algún ❌, la tarea no está completa.

---

## Paso 3 — Verificar BR-001 (regla transversal)

**Esta verificación es obligatoria en TODAS las tareas sin excepción.**

BR-001: El audio NUNCA se interrumpe durante operaciones del sistema.

Responde explícitamente:
- ¿Hay algún camino de código en esta tarea donde el audio pueda interrumpirse?
- ¿Las llamadas al LLM dejan el audio corriendo?
- ¿Las modificaciones del store regeneran el código Strudel sin llamar a `stop()`?
- ¿Las transiciones de estado mantienen el audio cuando corresponde?

Si la respuesta a cualquier punto es "sí puede interrumpirse", corregirlo antes de continuar.

---

## Paso 4 — Revisión de calidad de código

Verifica que el código cumple las convenciones del proyecto (`CLAUDE.md`):

- [ ] Sin `any` — tipos explícitos o `unknown`
- [ ] Sin lógica de negocio en componentes UI
- [ ] Imports cross-feature usan barrel (`@features/audio`)
- [ ] Imports intra-feature usan rutas relativas
- [ ] Named exports en todos los componentes
- [ ] Un componente por archivo
- [ ] Reglas de negocio comentadas con su ID (`// BR-006`)

---

## Paso 5 — Verificar build

```bash
npm run build
```

- [ ] Build sin errores TypeScript
- [ ] Build sin warnings nuevos (los existentes antes de la tarea son aceptables)

Si el build falla, corregir antes de marcar la tarea como completa.

---

## Paso 6 — Generar informe de revisión

Al terminar, genera este informe:

```markdown
## Revisión TASK-XX — [nombre de la tarea]

### Resultado: ✅ Completa / ⚠️ Completa con advertencias / ❌ Incompleta

### Reglas de negocio
| ID | Implementada | Comentada en código |
|---|---|---|
| BR-XXX | ✅ / ❌ | ✅ / ❌ |

### Edge cases
| ID | Cubierto | Notas |
|---|---|---|
| EC-XXX | ✅ / ⚠️ / ❌ | ... |

### BDD
| Scenario | Estado |
|---|---|
| <nombre> | ✅ / ⚠️ / ❌ |

### BR-001 (audio)
[ ] El audio no se interrumpe en ningún camino de esta tarea

### Build
[ ] npm run build: sin errores

### Advertencias o deuda técnica
(lista de cosas a revisar en el futuro, si las hay)

### Lista para TASK-XX+1: SÍ / NO
```

---

## Prompt exacto para Claude Code

Copia y pega esto en Claude Code al terminar cada tarea:

```
Acabas de implementar TASK-XX. Ahora ejecuta el protocolo completo 
de REVIEW-PROTOCOL.md sobre el código que acabas de escribir.
Genera el informe de revisión al finalizar.
```
