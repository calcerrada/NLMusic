import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'

// Node 22+ has an experimental localStorage that conflicts with jsdom — it is defined
// on the global object but unusable without --localstorage-file, so localStorage.setItem
// throws. Stub it with a reliable in-memory mock before any module (Zustand persist, etc.)
// has a chance to call it.
let _ls: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => _ls[key] ?? null,
  setItem: (key: string, value: string) => { _ls[key] = String(value) },
  removeItem: (key: string) => { delete _ls[key] },
  clear: () => { _ls = {} },
  get length() { return Object.keys(_ls).length },
  key: (n: number) => Object.keys(_ls)[n] ?? null,
})

// Mock @strudel/web globally — prevents WebAudio initialization in the test environment.
// useStrudel.ts does a dynamic import and accesses initStrudel, hush, and evaluate.
vi.mock('@strudel/web', () => ({
  initStrudel: vi.fn(),
  hush: vi.fn(),
  evaluate: vi.fn().mockResolvedValue(undefined),
}))

// Reset in-memory localStorage and mocks between tests to prevent state leakage.
beforeEach(() => {
  _ls = {}
  vi.clearAllMocks()
})
