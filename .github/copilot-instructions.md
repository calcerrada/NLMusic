# NLMusic — Copilot Instructions

## Fuente de verdad

Lee `CLAUDE.md` en la raíz del proyecto antes de cualquier tarea.
Contiene el contexto completo del proyecto: stack, estructura,
reglas de negocio, máquina de estados y edge cases.

## Instrucciones específicas de Copilot

- En Agent mode: usa `#file:CLAUDE.md` si necesitas referenciar
  el contexto explícitamente en el chat
- Las tareas de desarrollo están en `.claude/tasks/`
- La especificación funcional completa está en `nlmusic-spec.md`

## Lo más importante

BR-001: El audio NUNCA se interrumpe — es la regla que más
fácilmente se rompe en un refactor. Tenla siempre presente.
