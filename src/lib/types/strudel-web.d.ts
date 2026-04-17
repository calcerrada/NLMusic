declare module '@strudel/web' {
  interface InitStrudelOptions {
    prebake?: () => void | Promise<void>;
  }
  export function initStrudel(options?: InitStrudelOptions): void;
}
