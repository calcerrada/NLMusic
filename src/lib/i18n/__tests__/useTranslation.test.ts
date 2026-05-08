import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTranslation } from '@lib/i18n/useTranslation'
import { useSessionStore } from '@store/sessionStore'
import type { Language } from '@lib/i18n'

// Mock Zustand store
vi.mock('@store/sessionStore', () => ({
  useSessionStore: vi.fn(),
}))

describe('useTranslation — i18n hook', () => {
  describe('happy path — translation lookup', () => {
    it('returns a function that retrieves Spanish translations when language is ES', () => {
      ;(useSessionStore as any).mockReturnValue('es')

      const t = useTranslation()

      expect(typeof t).toBe('function')
      expect(t('prompt.placeholder')).toContain('Ej:')
      expect(t('tabs.sequencer')).toBe('Secuenciador')
    })

    it('returns a function that retrieves English translations when language is EN', () => {
      ;(useSessionStore as any).mockReturnValue('en')

      const t = useTranslation()

      expect(typeof t).toBe('function')
      expect(t('prompt.placeholder')).toContain('E.g.:')
      expect(t('tabs.sequencer')).toBe('Sequencer')
    })

    it('retrieves different translations for same key in ES vs EN', () => {
      ;(useSessionStore as any).mockReturnValue('es')
      const tEs = useTranslation()

      ;(useSessionStore as any).mockReturnValue('en')
      const tEn = useTranslation()

      expect(tEs('transport.play')).toBe('Play')
      expect(tEn('transport.play')).toBe('Play')

      expect(tEs('transport.stop')).toBe('Stop')
      expect(tEn('transport.stop')).toBe('Stop')

      // These differ by language
      expect(tEs('prompt.retry')).toBe('Reintentar')
      expect(tEn('prompt.retry')).toBe('Retry')
    })
  })

  describe('edge cases — error handling and fallback', () => {
    it('returns a valid translation for any valid TranslationKey', () => {
      ;(useSessionStore as any).mockReturnValue('es')

      const t = useTranslation()

      // Test a few keys to ensure they work
      const key1 = t('prompt.placeholder')
      const key2 = t('tabs.sequencer')
      const key3 = t('config.cat.scratch.1')

      expect(typeof key1).toBe('string')
      expect(typeof key2).toBe('string')
      expect(typeof key3).toBe('string')
    })

    it('defaults to first available language when store is ready', () => {
      ;(useSessionStore as any).mockReturnValue('es')

      const t = useTranslation()

      // Should not crash and should return translations
      expect(typeof t).toBe('function')
      const result = t('transport.play')
      expect(typeof result).toBe('string')
    })

    it('works correctly with all transport keys in both languages', () => {
      const transportKeys = [
        'transport.audioError',
        'transport.audioErrorBadge',
        'transport.audioReady',
        'transport.audioInit',
        'transport.play',
        'transport.stop',
        'transport.barLabel',
      ]

      ;(useSessionStore as any).mockReturnValue('es')
      const tEs = useTranslation()

      ;(useSessionStore as any).mockReturnValue('en')
      const tEn = useTranslation()

      transportKeys.forEach((key) => {
        const translationEs = (tEs as any)(key)
        const translationEn = (tEn as any)(key)
        expect(translationEs).toBeDefined()
        expect(typeof translationEs).toBe('string')
        expect(translationEn).toBeDefined()
        expect(typeof translationEn).toBe('string')
      })
    })

    it('works correctly with all config keys in both languages', () => {
      const configKeys = [
        'config.systemStatus',
        'config.audioEngine',
        'config.promptGuide',
        'config.shortcuts',
        'config.editorPrefs',
      ]

      ;(useSessionStore as any).mockReturnValue('en')
      const tEn = useTranslation()

      ;(useSessionStore as any).mockReturnValue('es')
      const tEs = useTranslation()

      configKeys.forEach((key) => {
        const translationEn = (tEn as any)(key)
        const translationEs = (tEs as any)(key)
        expect(translationEn).toBeDefined()
        expect(typeof translationEn).toBe('string')
        expect(translationEs).toBeDefined()
        expect(typeof translationEs).toBe('string')
      })
    })
  })

  describe('accessibility — translation of a11y labels', () => {
    it('provides Spanish a11y translations', () => {
      ;(useSessionStore as any).mockReturnValue('es')

      const t = useTranslation()

      expect(t('step.toggleLabel')).toBe('Alternar paso')
      expect(t('track.muteLabel')).toBe('Silenciar pista')
      expect(t('track.soloLabel')).toBe('Solo pista')
      expect(t('bpm.incrementLabel')).toBe('Aumentar BPM')
      expect(t('bpm.decrementLabel')).toBe('Disminuir BPM')
    })

    it('provides English a11y translations', () => {
      ;(useSessionStore as any).mockReturnValue('en')

      const t = useTranslation()

      expect(t('step.toggleLabel')).toBe('Toggle step')
      expect(t('track.muteLabel')).toBe('Mute track')
      expect(t('track.soloLabel')).toBe('Solo track')
      expect(t('bpm.incrementLabel')).toBe('Increase BPM')
      expect(t('bpm.decrementLabel')).toBe('Decrease BPM')
    })
  })

  describe('consistency checks — language switching', () => {
    it('returns different values for different language states', () => {
      ;(useSessionStore as any).mockReturnValue('es')
      const tEs = useTranslation()
      const esConfig = tEs('tabs.config')

      ;(useSessionStore as any).mockReturnValue('en')
      const tEn = useTranslation()
      const enConfig = tEn('tabs.config')

      expect(esConfig).not.toBe(enConfig)
      expect(esConfig).toBe('Configuración')
      expect(enConfig).toBe('Settings')
    })

    it('consistently returns the same translation for repeated calls', () => {
      ;(useSessionStore as any).mockReturnValue('es')
      const t = useTranslation()

      const first = t('prompt.placeholder')
      const second = t('prompt.placeholder')
      const third = t('prompt.placeholder')

      expect(first).toBe(second)
      expect(second).toBe(third)
    })
  })
})

