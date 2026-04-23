import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'

// Mock @strudel/web globally — prevents WebAudio initialization in the test environment.
// useStrudel.ts does a dynamic import and accesses initStrudel, hush, and evaluate.
vi.mock('@strudel/web', () => ({
  initStrudel: vi.fn(),
  hush: vi.fn(),
  evaluate: vi.fn().mockResolvedValue(undefined),
}))

// jsdom provides a functional localStorage that Zustand persist writes to.
// Clear it before each test to prevent state leakage between tests.
beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear()
  vi.clearAllMocks()
})
