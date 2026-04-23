## Resultado TASK-01 — Auditoría e2e

### Flujo: ⚠️ Parcial

### Problemas encontrados
| # | Archivo | Descripción | Severidad |
|---|---|---|---|
| 1 | src/store/sessionStore.ts | El estado inicial arranca con una pista por defecto (`initialTracks`), por lo que la app no inicia en IDLE sin pistas. Esto contradice el flujo principal de primera generación. | BLOQUEANTE |
| 2 | src/store/sessionStore.ts | `loadPattern` reemplaza el arreglo de pistas completo en vez de aplicar una adición secuencial garantizada. Depende totalmente de la salida del LLM para conservar pistas previas (riesgo BR-004). | MAYOR |
| 3 | src/features/prompt/hooks/usePatternGen.ts | Se añade el turno de usuario al store antes de construir el contexto, pero se envía `turns` desde un snapshot previo del hook; el contexto enviado al API puede quedar un turno por detrás. | MAYOR |
| 4 | src/app/api/generate-pattern/route.ts y src/features/prompt/hooks/usePatternGen.ts | Cuando el pipeline entra en fallback, la API responde `success: false` y el cliente lanza error inmediato, descartando `trackJson` fallback. La ruta degradada existe pero no se aprovecha en cliente. | MAYOR |

### Conexiones verificadas
- [x] Prompt → API Route
- [x] API Route → Pipeline
- [x] Pipeline → Adapter → LLM
- [x] Pipeline → Validation → Store
- [x] Store → Compiler → Strudel
- [x] Strudel → Audio (play/stop)
- [x] BeatClock → BarIndicator

### Listo para validación en navegador: NO
### Si NO, resolver primero: issue #1
