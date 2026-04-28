declare module '@strudel/web' {
  interface InitStrudelOptions {
    prebake?: () => void | Promise<void>;
  }
  export function initStrudel(options?: InitStrudelOptions): void;
}

declare module '@strudel/codemirror' {
  import type { Extension } from '@codemirror/state';

  export const extensions: {
    isBracketMatchingEnabled: (on: boolean) => Extension | Extension[];
    isBracketClosingEnabled: (on: boolean) => Extension | Extension[];
  };
}
