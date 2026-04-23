# TASK-02 — Robustez de inicialización Strudel (EC-010)

**Depende de:** TASK-01 completada
**CAP relacionadas:** CAP-NLM-002 (motor de audio listo)
**Spec de referencia:** `nlmusic-spec.md` Secciones 5 (BR-001), 7 (EC-010)
**Origen:** Hallazgo #4 de la auditoría TASK-01 — `useStrudel.ts:51-53` solo loguea el error en consola.

---

## Objetivo

Cuando la inicialización de `@strudel/web` falla (navegador sin soporte WebAudio,
extensiones que bloquean AudioContext, error de carga del módulo, etc.) la
aplicación debe **comunicarlo claramente al usuario** en vez de quedarse "muerta"
con play sin efecto y un error silencioso en la consola.

---

## Reglas que debe cumplir

- **EC-010:** Si `initStrudel()` falla → mostrar error claro al usuario; la app no es funcional, debe transmitirlo
- **BR-001:** El audio nunca se interrumpe — pero esto sólo aplica con motor inicializado; si nunca se inicializó, no hay audio que proteger
- El error debe ser persistente (no auto-ocultarse) hasta que el usuario recargue, ya que sin Strudel la app no puede hacer su trabajo

---

## Qué implementar

### 1. Exponer el error desde el hook

**Archivo:** `src/features/audio/hooks/useStrudel.ts`

Ampliar `UseStrudelResult`:
```typescript
export interface UseStrudelResult {
  play: (code: string) => Promise<void>;
  stop: () => void;
  isReady: boolean;
  initError: string | null;   // nuevo: mensaje legible si initStrudel falla
}
```

En el `.catch` del dynamic import, en vez de `console.error` solo:
- Guardar el mensaje en estado local `initError`
- Mantener `isReady = false`
- Loguear también en consola para debugging

`play(code)` debe lanzar un error específico si `initError !== null` para que
los consumidores puedan distinguir "no inicializado todavía" de "imposible inicializar".

---

### 2. Banner / overlay de error en la UI

**Archivo:** `src/app/page.tsx` (o donde se monte el layout principal)

Cuando `initError !== null`:
- Mostrar un banner persistente en la parte superior de la app con:
  - Icono de alerta en `var(--red)`
  - Texto principal: "Motor de audio no disponible"
  - Texto descriptivo: el mensaje de `initError` + sugerencia ("Recarga la página o prueba con otro navegador")
  - Botón "Recargar" que llama a `window.location.reload()`
- El banner NO se puede cerrar — la app no es funcional sin Strudel
- Los controles de Play/BPM/PromptBox deben deshabilitarse mientras `initError`
  esté presente, con un tooltip explicando por qué

Diseño sugerido:
```
┌────────────────────────────────────────────────────────────┐
│ ⚠ Motor de audio no disponible                            │
│   <mensaje técnico de Strudel>                             │
│   [Recargar]                                               │
└────────────────────────────────────────────────────────────┘
```

---

### 3. Indicador secundario de estado del motor

**Archivo:** `src/features/transport/components/TransportBar.tsx`

Pequeño indicador discreto al lado del logo / título:
- `● Listo` en `var(--cyan)` cuando `isReady === true`
- `○ Iniciando…` en `var(--text-dim)` mientras se carga
- `✕ Error` en `var(--red)` cuando `initError !== null`

Esto da feedback rápido al usuario sin necesidad del banner principal.

---

### 4. Logging para diagnóstico

Mantener el `console.error('[Strudel] init failed', error)` actual, pero
añadir información del entorno:
- `navigator.userAgent`
- `typeof AudioContext`
- Cualquier error de la promesa de `import('@strudel/web')`

Esto facilita diagnosticar reportes de usuarios sin Strudel funcional.

---

## Escenarios BDD a verificar manualmente

```
Scenario: Strudel se inicializa correctamente
  Given el navegador soporta WebAudio
  When la app carga
  Then el indicador del transport muestra "● Listo"
  And no hay banner de error
  And el botón Play es funcional

Scenario: Strudel falla al inicializar
  Given el navegador o el entorno bloquea WebAudio
  When la app carga
  Then se muestra un banner persistente "Motor de audio no disponible"
  And el indicador del transport muestra "✕ Error"
  And los controles Play / BPM / PromptBox están deshabilitados
  And el banner ofrece la opción de recargar la página

Scenario: Recargar tras fallo de Strudel
  Given el banner de error de Strudel está visible
  When el usuario pulsa "Recargar"
  Then la página se recarga
  And se vuelve a intentar la inicialización del motor
```

---

## Archivos a modificar / crear

- `src/features/audio/hooks/useStrudel.ts` — exponer `initError`, mejorar logging
- `src/features/audio/index.ts` — re-exportar el tipo actualizado
- `src/app/page.tsx` — banner persistente cuando `initError`
- `src/features/transport/components/TransportBar.tsx` — indicador de estado del motor
- `src/features/prompt/components/PromptBox.tsx` — deshabilitar input si motor no disponible
- `src/features/transport/components/PlayControls.tsx` — deshabilitar play si motor no disponible
