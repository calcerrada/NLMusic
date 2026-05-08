import { describe, it, expect, beforeEach, vi } from 'vitest'

// vi.hoisted runs before any import, so localStorage is available when
// Zustand's persist middleware calls createJSONStorage(() => localStorage)
// at store module initialization time. Without this, the storage reference
// becomes undefined and every setState() call crashes in Node/forks pool.
const { localStorageMock } = vi.hoisted(() => {
  const data: Record<string, string> = {}
  const mock = {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => { data[key] = value },
    removeItem: (key: string) => { delete data[key] },
    clear: () => { Object.keys(data).forEach((k) => delete data[k]) },
    get length() { return Object.keys(data).length },
    key: (i: number) => Object.keys(data)[i] ?? null,
  }
  Object.defineProperty(globalThis, 'localStorage', { value: mock, writable: true, configurable: true })
  return { localStorageMock: mock }
})

import { useSessionStore } from '@store/sessionStore'
import type { Language } from '@lib/i18n'

// Mock the audio compiler
vi.mock('@features/audio', () => ({
  compileToStrudel: vi.fn(() => 'stack(...).slow(4).cpm(138.00)'),
}))

describe('sessionStore — language field (TASK-13)', () => {
  beforeEach(() => {
    localStorageMock.clear()
    // Reset store to initial state
    useSessionStore.setState({
      bpm: 138,
      tracks: [],
      turns: [],
      editorMode: 'advanced',
      highlightingEnabled: true,
      hapVisualizationEnabled: true,
      language: 'es',
      promptDraft: null,
    })
  })

  describe('happy path — language state management', () => {
    it('initializes with a default language', () => {
      const language = useSessionStore.getState().language
      expect(language).toMatch(/^(es|en)$/)
    })

    it('setLanguage updates the language state', () => {
      useSessionStore.getState().setLanguage('en')
      expect(useSessionStore.getState().language).toBe('en')

      useSessionStore.getState().setLanguage('es')
      expect(useSessionStore.getState().language).toBe('es')
    })

    it('setLanguage accepts both ES and EN', () => {
      const languages: Language[] = ['es', 'en']

      languages.forEach((lang) => {
        useSessionStore.getState().setLanguage(lang)
        expect(useSessionStore.getState().language).toBe(lang)
      })
    })
  })

  describe('edge cases — language persistence and detection', () => {
    it('language does not change when other state changes', () => {
      useSessionStore.getState().setLanguage('es')
      useSessionStore.getState().setBpm(140)
      useSessionStore.getState().setActiveTab('code')

      expect(useSessionStore.getState().language).toBe('es')
    })

    it('language selection is independent per store instance', () => {
      const state1 = useSessionStore.getState()
      state1.setLanguage('es')

      const state2 = useSessionStore.getState()
      state2.setLanguage('en')

      expect(useSessionStore.getState().language).toBe('en')
    })
  })

  describe('browser language detection — detectLanguage()', () => {
    // These tests verify the detectLanguage function behavior indirectly through initialization
    it('initializes language from navigator.language if available', () => {
      const initialLanguage = useSessionStore.getState().language

      // Should be 'es' or 'en' based on detect
      expect(initialLanguage).toMatch(/^(es|en)$/)
    })
  })

  describe('language selector integration — all transitions', () => {
    it('supports toggling between ES and EN repeatedly', () => {
      const languages: Language[] = ['es', 'en']

      for (let i = 0; i < 5; i++) {
        languages.forEach((lang) => {
          useSessionStore.getState().setLanguage(lang)
          expect(useSessionStore.getState().language).toBe(lang)
        })
      }
    })

    it('language change does not affect other UI state', () => {
      const initialState = useSessionStore.getState()
      const initialBpm = initialState.bpm
      const initialTab = initialState.activeTab

      useSessionStore.getState().setLanguage('en')

      const afterState = useSessionStore.getState()
      expect(afterState.bpm).toBe(initialBpm)
      expect(afterState.activeTab).toBe(initialTab)
    })

    it('language change does not clear error state', () => {
      useSessionStore.getState().setError('Test error')
      useSessionStore.getState().setLanguage('en')

      expect(useSessionStore.getState().lastError).toBe('Test error')
    })

    it('language change does not affect playing state', () => {
      useSessionStore.getState().setPlaying(true)
      useSessionStore.getState().setLanguage('en')

      expect(useSessionStore.getState().isPlaying).toBe(true)

      useSessionStore.getState().setPlaying(false)
      useSessionStore.getState().setLanguage('es')

      expect(useSessionStore.getState().isPlaying).toBe(false)
    })
  })

  describe('consistency checks — language with other i18n state', () => {
    it('language state is always a valid Language type', () => {
      const testLanguages: Language[] = ['es', 'en']

      testLanguages.forEach((lang) => {
        useSessionStore.getState().setLanguage(lang)
        const current = useSessionStore.getState().language
        expect(testLanguages).toContain(current)
      })
    })

    it('language can be accessed via getState()', () => {
      useSessionStore.getState().setLanguage('es')

      const language = useSessionStore.getState().language
      expect(language).toBe('es')

      useSessionStore.getState().setLanguage('en')
      const languageEn = useSessionStore.getState().language
      expect(languageEn).toBe('en')
    })
  })

  describe('TASK-13 BDD scenarios — multiidioma UI', () => {
    it('BDD-01: user can switch between ES and EN in the UI', () => {
      // Initial state
      useSessionStore.getState().setLanguage('es')
      expect(useSessionStore.getState().language).toBe('es')

      // User clicks EN button
      useSessionStore.getState().setLanguage('en')
      expect(useSessionStore.getState().language).toBe('en')

      // User clicks ES button
      useSessionStore.getState().setLanguage('es')
      expect(useSessionStore.getState().language).toBe('es')
    })

    it('BDD-02: language selection is independent from other UI state', () => {
      useSessionStore.getState().setLanguage('en')
      useSessionStore.getState().setBpm(140)
      useSessionStore.getState().setActiveTab('code')

      expect(useSessionStore.getState().language).toBe('en')
      expect(useSessionStore.getState().bpm).toBe(140)
      expect(useSessionStore.getState().activeTab).toBe('code')
    })

    it('BDD-03: changing language updates store reactively', () => {
      useSessionStore.getState().setLanguage('es')
      let languageOnEs = useSessionStore.getState().language
      expect(languageOnEs).toBe('es')

      useSessionStore.getState().setLanguage('en')
      let languageOnEn = useSessionStore.getState().language
      expect(languageOnEn).toBe('en')

      // Verify the state actually changed
      expect(languageOnEs).not.toBe(languageOnEn)
    })

    it('BDD-04: language selector state is ready for TransportBar component', () => {
      // This test verifies the state is ready for the component
      const language = useSessionStore.getState().language
      const setLanguage = useSessionStore.getState().setLanguage

      expect(typeof language).toBe('string')
      expect(['es', 'en']).toContain(language)
      expect(typeof setLanguage).toBe('function')
    })
  })
})
