# NLMusic — Copilot Instructions

## Prioridad

- BR-001: el audio nunca se interrumpe.
- BR-006: máximo 5 pistas.
- BR-011: la API key nunca se expone al cliente.

## Cómo cargar contexto

- Empieza por el archivo, símbolo o test más cercano al cambio.
- Lee documentación adicional solo si el cambio toca reglas de negocio, estados, edge cases o comportamiento entre features.
- Usa `CLAUDE.md` como resumen general del proyecto.
- Usa `nlmusic-spec.md` solo cuando necesites validar reglas BR-*, estados, edge cases o criterios funcionales.
- Usa `.claude/tasks/` solo si el trabajo corresponde a una task concreta.

## Arquitectura base

- Frontend: Next.js + React + TypeScript
- Audio: Strudel en cliente
- Estado: Zustand
- LLM: server-side proxy vía `/api/generate-pattern`

## Forma de trabajar

- Haz routing local primero: archivo, símbolo, test o error concreto.
- No cargues la spec completa por defecto.
- Si el cambio es local de UI, typing, tests o refactor interno, evita leer documentación amplia salvo que aparezca una dependencia funcional real.
- Si el cambio afecta audio, generación, estados o sincronización grid ↔ code, valida las reglas de negocio relevantes antes de editar.
- Mantén los cambios pequeños, verificables y consistentes con el estilo del repo.

## Reglas críticas por área

- Audio y transporte: preservar BR-001.
- Generación LLM: preservar BR-002, BR-003, BR-004, BR-006, BR-009 y BR-011.
- Editor y secuenciador: preservar BR-008 y BR-009.
- Eliminación de pistas: preservar BR-007.
