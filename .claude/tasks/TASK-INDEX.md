# TASK-INDEX — Índice de tareas Sprint 2

> Orden de ejecución, dependencias y estado histórico de todas las tasks.

---

## Mecanismo de tracking

Cada `TASK-XX-*.md` lleva un frontmatter YAML con `status: done | in-progress | pending`,
`completed_commit` y `completed_date` cuando aplica. Este índice mantiene la vista
agregada (checklist abajo). Para listar pendientes desde la terminal:

```bash
grep -l "^status: pending" .claude/tasks/TASK-*.md
```

**Al cerrar una task:**
1. Cambia `status: pending` → `status: done` en el frontmatter del archivo
2. Añade `completed_commit:` y `completed_date:`
3. Marca `[x]` en el checklist de abajo
4. Actualiza la sección "Estado actual del proyecto" en `CLAUDE.md` si la task introdujo cambios estructurales (nuevas dependencias, nuevos directorios, cambios en el modelo de datos)

---

## Estado y orden de ejecución

- [x] **TASK-01** — Validación e2e (auditoría) · `c462484` · 2026-04-23
- [x] **TASK-02** — Robustez inicialización Strudel (EC-010) · `c462484` · 2026-04-23
- [x] **TASK-03** — Límite máximo 5 pistas (BR-006) · `3281748` · 2026-04-23
- [x] **TASK-04** — Estado ERROR con reintento · `fdfa46c` · 2026-04-23
- [x] **TASK-05** — Incrementalidad de pistas (PatternDelta) · `0b654c9` · 2026-04-24
- [x] **TASK-06** — Coherencia compiler + contrato API · `6aa9dc4` · 2026-04-24
- [x] **TASK-07** — Eliminar pista desde UI · `7ec08f9` · 2026-04-24
- [x] **TASK-08** — StrudelCodePanel editable (textarea) · `177f001` · 2026-04-24
- [x] **TASK-09** — Contexto LLM coherente en modo código · `b870bd0` · 2026-04-27
- [x] **TASK-10** — Editor Strudel con CodeMirror (syntax highlighting) · `4da9edf` · 2026-04-28
- [x] **TASK-11** — Hap highlighting en tiempo real · `2932b42` · 2026-05-11
- [x] **TASK-12** — Tercera pestaña config/guía (+ toggle editor avanzado/simple) · `5e655c9` · 2026-05-05
- [x] **TASK-13** — Multiidioma UI (ES / EN) · `1aacc87` · 2026-05-08

**Dependencias clave:**
- TASK-04 desbloquea TASK-05 y TASK-07
- TASK-05 desbloquea TASK-06
- TASK-07 desbloquea TASK-08
- TASK-08 desbloquea TASK-09 y TASK-10
- TASK-10 desbloquea TASK-11
- TASK-08, TASK-10 y TASK-11 desbloquean TASK-12
- TASK-12 desbloquea TASK-13

