# TASK-INDEX — Índice de tareas

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

## Sprint 1 y 2 — Completados

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

**Dependencias clave Sprint 1–2:**
- TASK-04 desbloquea TASK-05 y TASK-07
- TASK-05 desbloquea TASK-06
- TASK-07 desbloquea TASK-08
- TASK-08 desbloquea TASK-09 y TASK-10
- TASK-10 desbloquea TASK-11
- TASK-08, TASK-10 y TASK-11 desbloquean TASK-12
- TASK-12 desbloquea TASK-13

---

## Sprint de Refactorización — Orden de ejecución recomendado

- [x] **TASK-14** — Correctness: hotfixes y robustez del contrato · `4a1f3a3` · 2026-05-14
- [x] **TASK-15** — Store: División en Zustand slices · `dd083e4` · 2026-05-18
- [x] **TASK-16** — StrudelContext: prop drilling + estado mutable de módulo _(depende de TASK-14)_ · `pending-fill-after-commit` · 2026-05-18
- [ ] **TASK-17** — Performance: suscripciones reactivas y prompt caching _(depende de TASK-14)_ ← siguiente
- [ ] **TASK-18** — Limpieza de UI y convenciones de código _(sin dependencias)_

**Orden recomendado:** TASK-14 → TASK-18 → TASK-17 → TASK-16 → TASK-15

Ejecutar `npm test` + `npm run build` al finalizar cada task antes de continuar.

---

## Sprint 3 — Sintetizador por pista (post-refactor)

- [ ] **TASK-19** — Schema: TrackParams _(antes TASK-14; bloqueante para TASK-20..23)_
- [ ] **TASK-20** — Compilador: soporte TrackParams en `compileToStrudel` _(depende de TASK-19)_
- [ ] **TASK-21** — LLM: system prompt y adapter para parámetros de síntesis _(depende de TASK-19)_
- [ ] **TASK-22** — UI: acordeón de parámetros por pista _(depende de TASK-19)_
- [ ] **TASK-23** — UI: controles avanzados (filtro, efectos, panorama) _(depende de TASK-22)_

