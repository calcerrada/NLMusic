---
id: TASK-18
status: pending
---

# TASK-18 — Limpieza de UI y convenciones de código

| Campo | Valor |
|---|---|
| Task-ID | TASK-18 |
| Sprint | Refactor |
| Prioridad | P3 — mejora mantenibilidad, sin impacto funcional |
| Estimación | 2–3 h |
| Dependencias | Ninguna |

> Aplica correcciones de estilo, convenciones y SRP a nivel de componentes sin
> alterar ningún comportamiento funcional. Cada item es independiente y puede
> ejecutarse por separado si se prefiere.

---

## FIX-1 — Oscilloscope como componente propio

**Archivos afectados:**
- `src/features/code-view/components/StrudelCodePanel.tsx` (eliminar lógica canvas)
- `src/features/code-view/components/Oscilloscope.tsx` (crear)

El canvas decorativo con el RAF loop de seno vive dentro de `StrudelCodePanel`
mezclando un concern visual independiente con la lógica del editor. Extraer a
`<Oscilloscope />` sin props (no necesita nada externo):

```typescript
// Oscilloscope.tsx
'use client';
import { useEffect, useRef } from 'react';

export function Oscilloscope() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let frame = 0;
    const draw = () => {
      frame += 1;
      const width = canvas.clientWidth;
      const height = canvas.height;
      if (canvas.width !== width) canvas.width = width;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(0,255,200,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < width; x += 1) {
        const angle = (x + frame * 2) * 0.03;
        const y = height / 2 + Math.sin(angle) * 10;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      rafId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafId);
  }, []);

  return <canvas ref={canvasRef} className="scope-canvas w-full" height={50} />;
}
```

`StrudelCodePanel` reemplaza el bloque de canvas + `useEffect` por `<Oscilloscope />`.

---

## FIX-2 — Tabs data-driven en `page.tsx`

**Archivo:** `src/app/page.tsx`

Los tres botones de tab son casi idénticos (~70 líneas de HTML repetido). Extraer a
un array + `.map()` para eliminar la duplicación y reducir el riesgo de
desincronización:

```typescript
const TABS = [
  { id: 'sequencer' as const, labelKey: 'tabs.sequencer' as const },
  { id: 'code'      as const, labelKey: 'tabs.strudel'   as const },
  { id: 'config'    as const, labelKey: 'tabs.config'    as const },
];

// En el JSX:
{TABS.map(({ id, labelKey }) => (
  <button
    key={id}
    type="button"
    onClick={() => setActiveTab(id)}
    className={[
      'rounded-t-[8px] border border-b-0 px-4 py-2 text-[11px] uppercase tracking-[0.12em] transition-all',
      activeTab === id
        ? 'border-[var(--border-active)] bg-[rgba(0,255,200,0.08)] text-[var(--cyan)]'
        : 'border-transparent bg-transparent text-[var(--text-dim)] hover:text-[var(--text)]',
    ].join(' ')}
  >
    {t(labelKey)}
  </button>
))}
```

---

## FIX-3 — Consistencia Tailwind en `TransportBar`

**Archivo:** `src/features/transport/components/TransportBar.tsx`

Reemplazar inline styles con clases Tailwind equivalentes:

| Inline style actual | Clase Tailwind equivalente |
|--------------------|---------------------------|
| `style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60 }}` | `className="fixed top-0 left-0 right-0 z-[60]"` |
| `style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }}` | `className="absolute left-4 top-1/2 -translate-y-1/2"` |
| `style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}` | `className="absolute right-4 top-1/2 -translate-y-1/2"` |
| `style={{ maxWidth: 1100, margin: '0 auto', ... }}` | `className="max-w-[1100px] mx-auto ..."` |

Verificar que el layout visual no cambia con un snapshot o inspeccionando en el
navegador antes y después.

---

## FIX-4 — Eliminar `'use client'` de archivos no-componente

**Archivos:**
- `src/store/sessionStore.ts`
- `src/features/audio/hooks/useStrudel.ts`
- `src/features/audio/hooks/useHapEvents.ts`
- `src/features/audio/hooks/useBeatClock.ts`
- `src/features/prompt/hooks/usePatternGen.ts`

La directiva `'use client'` solo es necesaria en componentes React y en archivos
que los importan directamente (para que Next.js sepa que no deben enviarse al
servidor). En hooks y stores es semánticamente incorrecta aunque funcione.

Eliminar la línea `'use client';` de los archivos listados.

**Verificación:** `npm run build` no debe generar nuevos warnings de serialización.
Si Next.js se queja de que algún hook usa APIs del navegador sin la directiva,
añadirla solo donde sea estrictamente necesario.

---

## FIX-5 — Reposicionar tipo `HapLike` en `useHapEvents.ts`

**Archivo:** `src/features/audio/hooks/useHapEvents.ts`

El tipo `HapLike` está declarado en la línea 260 pero se usa por primera vez en la
línea 193. Moverlo al inicio del archivo, antes de la declaración de la función
`useHapEvents`, siguiendo la convención de TypeScript de declarar tipos antes de
su primer uso.

---

## Archivos a modificar

| Archivo | Fix |
|---------|-----|
| `src/features/code-view/components/StrudelCodePanel.tsx` | FIX-1 (eliminar canvas logic) |
| `src/features/code-view/components/Oscilloscope.tsx` | FIX-1 (crear) |
| `src/features/code-view/index.ts` | FIX-1 (exportar Oscilloscope si necesario) |
| `src/app/page.tsx` | FIX-2 |
| `src/features/transport/components/TransportBar.tsx` | FIX-3 |
| `src/store/sessionStore.ts` | FIX-4 |
| `src/features/audio/hooks/useStrudel.ts` | FIX-4 |
| `src/features/audio/hooks/useHapEvents.ts` | FIX-4, FIX-5 |
| `src/features/audio/hooks/useBeatClock.ts` | FIX-4 |
| `src/features/prompt/hooks/usePatternGen.ts` | FIX-4 |

---

## Tests

- `npm test` — sin modificaciones en ningún test.
- `npm run build` — TypeScript limpio.
- Visual: verificar que el osciloscopio sigue renderizando en el panel de código.
- Verificar que las tabs funcionan correctamente con el nuevo map.
- Inspeccionar `TransportBar` visualmente antes/después del FIX-3.
