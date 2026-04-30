/**
 * Ambient type declarations for @strudel packages that ship .mjs without .d.ts.
 * These declarations shadow any JS-inferred types TypeScript may derive from allowJs.
 */

declare module '@strudel/transpiler' {
  export interface TranspilerOutput {
    output?: string;
    miniLocations?: [number, number][];
    widgets?: unknown[];
  }

  export function transpiler(
    code: string,
    options?: {
      wrapAsync?: boolean;
      addReturn?: boolean;
      emitMiniLocations?: boolean;
      emitWidgets?: boolean;
      id?: string;
    },
  ): TranspilerOutput | null | undefined;
}

declare module '@strudel/codemirror' {
  // ---- extension builders (codemirror.mjs) ----
  export const extensions: {
    isLineWrappingEnabled: (on: boolean) => import('@codemirror/state').Extension;
    isBracketMatchingEnabled: (on: boolean) => import('@codemirror/state').Extension;
    isBracketClosingEnabled: (on: boolean) => import('@codemirror/state').Extension;
    isLineNumbersDisplayed: (on: boolean) => import('@codemirror/state').Extension;
    isAutoCompletionEnabled: (on: boolean) => import('@codemirror/state').Extension;
    isTooltipEnabled: (on: boolean) => import('@codemirror/state').Extension;
    isPatternHighlightingEnabled: (on: boolean, config?: unknown) => import('@codemirror/state').Extension;
    isActiveLineHighlighted: (on: boolean) => import('@codemirror/state').Extension;
    isFlashEnabled: (on: boolean) => import('@codemirror/state').Extension;
    keybindings: (type: string) => import('@codemirror/state').Extension;
    isTabIndentationEnabled: (on: boolean) => import('@codemirror/state').Extension;
    isMultiCursorEnabled: (on: boolean) => import('@codemirror/state').Extension;
    theme: (name: string) => import('@codemirror/state').Extension;
  };

  // ---- hap highlighting (highlight.mjs) — TASK-11 ----
  /** StateFields that enable per-token hap decorations. Add at editor creation time. */
  export const highlightExtension: import('@codemirror/state').Extension[];
  /** Sets the static mark positions (char-offset pairs) extracted by the transpiler. */
  export function updateMiniLocations(
    view: import('@codemirror/view').EditorView,
    locations: [number, number][],
  ): void;
  /** Dispatches currently-active haps to the visible-locations StateField each frame. */
  export function highlightMiniLocations(
    view: import('@codemirror/view').EditorView,
    atTime: number,
    haps: unknown[],
  ): void;

  // ---- flash (flash.mjs) ----
  export function flash(view: import('@codemirror/view').EditorView, ms?: number): void;
}

