/**
 * Ambient type declarations for @strudel packages that ship .mjs without .d.ts.
 * These declarations shadow any JS-inferred types TypeScript may derive from allowJs.
 */

import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

declare module '@strudel/codemirror' {
  // ---- extension builders (codemirror.mjs) ----
  export const extensions: {
    isLineWrappingEnabled: (on: boolean) => Extension;
    isBracketMatchingEnabled: (on: boolean) => Extension;
    isBracketClosingEnabled: (on: boolean) => Extension;
    isLineNumbersDisplayed: (on: boolean) => Extension;
    isAutoCompletionEnabled: (on: boolean) => Extension;
    isTooltipEnabled: (on: boolean) => Extension;
    isPatternHighlightingEnabled: (on: boolean, config?: unknown) => Extension;
    isActiveLineHighlighted: (on: boolean) => Extension;
    isFlashEnabled: (on: boolean) => Extension;
    keybindings: (type: string) => Extension;
    isTabIndentationEnabled: (on: boolean) => Extension;
    isMultiCursorEnabled: (on: boolean) => Extension;
    theme: (name: string) => Extension;
  };

  // ---- hap highlighting (highlight.mjs) — TASK-11 ----
  /** StateFields that enable per-token hap decorations. Add at editor creation time. */
  export const highlightExtension: Extension[];
  /** Sets the static mark positions (char-offset pairs) extracted by the transpiler. */
  export function updateMiniLocations(
    view: EditorView,
    locations: [number, number][],
  ): void;
  /** Dispatches currently-active haps to the visible-locations StateField each frame. */
  export function highlightMiniLocations(
    view: EditorView,
    atTime: number,
    haps: unknown[],
  ): void;

  // ---- flash (flash.mjs) ----
  export function flash(view: EditorView, ms?: number): void;
}
