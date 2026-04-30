/**
 * Wrapper único para la API de hap-highlighting de @strudel/codemirror.
 *
 * Existe por dos razones:
 *
 * 1. Garantizar que tanto `StrudelEditor` como `useHapEvents` compartan EXACTAMENTE
 *    la misma instancia del módulo. Sin este wrapper, una ruta podría cargar
 *    `@strudel/codemirror` (index) y otra `@strudel/codemirror/highlight.mjs`
 *    (subpath); aunque deberían deduplicarse, los `StateEffect.define()` internos
 *    crean IDs únicos al ejecutarse — si por bundling hay dos instancias, los
 *    effects que dispatchamos no actualizan los StateField del editor y el span
 *    del código nunca se decora aunque el patrón suene.
 *
 * 2. Saltarnos el `index.mjs` de @strudel/codemirror, que arrastra el repl entero
 *    de Strudel (con `@kabelsalat/web` etc.) — pesado e incompatible con Node/SSR.
 *
 * El subpath es seguro porque @strudel/codemirror no declara `exports` en su
 * package.json — Node permite acceder a archivos internos directamente.
 */

import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

// El módulo .mjs no expone tipos; importamos sin ellos y los anotamos al re-exportar.
// @ts-expect-error -- No declaration file; types provided explicitly below.
import * as strudelHighlight from '@strudel/codemirror/highlight.mjs';

interface HighlightModule {
  highlightExtension: Extension[];
  updateMiniLocations: (view: EditorView, locations: [number, number][]) => void;
  highlightMiniLocations: (view: EditorView, atTime: number, haps: unknown[]) => void;
}

const mod = strudelHighlight as HighlightModule;

export const highlightExtension: Extension[] = mod.highlightExtension;
export const updateMiniLocations = mod.updateMiniLocations;
export const highlightMiniLocations = mod.highlightMiniLocations;
