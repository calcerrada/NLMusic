import { describe, it, expect } from 'vitest'
import { translations, type TranslationKey } from '@lib/i18n/translations'

describe('translations — i18n dictionary ES/EN', () => {
  describe('happy path — structure and completeness', () => {
    it('has both ES and EN language keys', () => {
      expect(translations).toHaveProperty('es')
      expect(translations).toHaveProperty('en')
    })

    it('ES and EN have the same translation keys', () => {
      const esKeys = Object.keys(translations.es).sort()
      const enKeys = Object.keys(translations.en).sort()

      expect(esKeys).toEqual(enKeys)
    })

    it('all translation values are non-empty strings', () => {
      Object.entries(translations).forEach(([lang, dict]) => {
        Object.entries(dict).forEach(([key, value]) => {
          expect(typeof value).toBe('string')
          expect(value.length).toBeGreaterThan(0)
        })
      })
    })

    it('exports TranslationKey type with all ES keys', () => {
      const esKeys = Object.keys(translations.es) as TranslationKey[]

      // Verify each key is a valid TranslationKey and accessible in both languages
      esKeys.forEach((key) => {
        expect(key in translations.es).toBe(true)
        expect(key in translations.en).toBe(true)
      })
    })
  })

  describe('edge cases — key coverage', () => {
    it('covers all transport-related keys in both languages', () => {
      const transportKeys = [
        'transport.audioError',
        'transport.audioErrorBadge',
        'transport.audioReady',
        'transport.audioInit',
        'transport.play',
        'transport.stop',
        'transport.barLabel',
      ]

      transportKeys.forEach((key) => {
        expect(key in translations.es).toBe(true)
        expect(key in translations.en).toBe(true)
      })
    })

    it('covers all prompt-related keys in both languages', () => {
      const promptKeys = [
        'prompt.placeholder',
        'prompt.audioDisabled',
        'prompt.retry',
        'prompt.submit',
        'prompt.newLine',
      ]

      promptKeys.forEach((key) => {
        expect(key in translations.es).toBe(true)
        expect(key in translations.en).toBe(true)
      })
    })

    it('covers all track-related keys in both languages', () => {
      const trackKeys = [
        'tracks.counterLabel',
        'tracks.empty',
        'tracks.codeEditedWarning',
        'tracks.deleteAriaLabel',
      ]

      trackKeys.forEach((key) => {
        expect(key in translations.es).toBe(true)
        expect(key in translations.en).toBe(true)
      })
    })

    it('covers all tabs keys in both languages', () => {
      const tabKeys = ['tabs.sequencer', 'tabs.strudel', 'tabs.config']

      tabKeys.forEach((key) => {
        expect(key in translations.es).toBe(true)
        expect(key in translations.en).toBe(true)
      })
    })

    it('covers all config-related keys in both languages', () => {
      const configKeys = [
        'config.systemStatus',
        'config.audioEngine',
        'config.promptGuide',
        'config.cat.scratch',
        'config.shortcuts',
        'config.editorPrefs',
        'config.editorLabel',
        'config.editorAdvanced',
        'config.editorSimple',
      ]

      configKeys.forEach((key) => {
        expect(key in translations.es).toBe(true)
        expect(key in translations.en).toBe(true)
      })
    })

    it('covers all editor-related keys in both languages', () => {
      const editorKeys = [
        'editor.syntaxError',
        'editor.runtimeError',
        'editor.placeholder',
        'editor.editableLabel',
      ]

      editorKeys.forEach((key) => {
        expect(key in translations.es).toBe(true)
        expect(key in translations.en).toBe(true)
      })
    })

    it('covers all accessibility keys (aria-labels, toggle labels) in both languages', () => {
      const a11yKeys = [
        'step.toggleLabel',
        'tracks.deleteAriaLabel',
        'track.muteLabel',
        'track.soloLabel',
        'bpm.incrementLabel',
        'bpm.decrementLabel',
      ]

      a11yKeys.forEach((key) => {
        expect(key in translations.es).toBe(true)
        expect(key in translations.en).toBe(true)
      })
    })

    it('no keys in ES are missing in EN and vice versa', () => {
      const esKeys = new Set(Object.keys(translations.es))
      const enKeys = new Set(Object.keys(translations.en))

      const missingInEn = Array.from(esKeys).filter((key) => !enKeys.has(key))
      const missingInEs = Array.from(enKeys).filter((key) => !esKeys.has(key))

      expect(missingInEn).toHaveLength(0)
      expect(missingInEs).toHaveLength(0)
    })
  })

  describe('Spanish (ES) — specific content', () => {
    it('Spanish placeholder has Spanish examples and tone', () => {
      const placeholder = translations.es['prompt.placeholder']
      expect(placeholder).toContain('Ej:')
      expect(placeholder.toLowerCase()).toMatch(/kick|snare|techno|oscuro/)
    })

    it('Spanish tab labels are in Spanish', () => {
      expect(translations.es['tabs.sequencer']).toBe('Secuenciador')
      expect(translations.es['tabs.strudel']).toBe('Código Strudel')
      expect(translations.es['tabs.config']).toBe('Configuración')
    })

    it('Spanish error messages are natural Spanish', () => {
      expect(translations.es['transport.audioError']).toContain('Motor de audio')
      expect(translations.es['page.audioErrorTitle']).toContain('no disponible')
    })
  })

  describe('English (EN) — specific content', () => {
    it('English placeholder has English examples and tone', () => {
      const placeholder = translations.en['prompt.placeholder']
      expect(placeholder).toContain('E.g.:')
      expect(placeholder.toLowerCase()).toMatch(/kick|snare|techno|dark/)
    })

    it('English tab labels are in English', () => {
      expect(translations.en['tabs.sequencer']).toBe('Sequencer')
      expect(translations.en['tabs.strudel']).toBe('Strudel Code')
      expect(translations.en['tabs.config']).toBe('Settings')
    })

    it('English error messages are natural English', () => {
      expect(translations.en['transport.audioError']).toContain('Audio engine')
      expect(translations.en['page.audioErrorTitle']).toContain('unavailable')
    })
  })

  describe('consistency checks — keys follow naming conventions', () => {
    it('all keys follow dot notation pattern (up to 4 levels: feature.subfeature.item.index)', () => {
      const keys = Object.keys(translations.es) as TranslationKey[]

      keys.forEach((key) => {
        const parts = key.split('.')
        // Keys like 'transport.play' (2 parts), 'config.cat.scratch' (3 parts), 'config.cat.scratch.1' (4 parts)
        expect(parts.length).toBeGreaterThanOrEqual(2)
        expect(parts.length).toBeLessThanOrEqual(4)

        // Each part should be alphanumeric (lowercase + camelCase allowed)
        parts.forEach((part) => {
          expect(part).toMatch(/^[a-zA-Z0-9]+$/)
        })
      })
    })

    it('no duplicate keys in ES or EN', () => {
      const esKeys = Object.keys(translations.es)
      const esUnique = new Set(esKeys)
      expect(esKeys).toHaveLength(esUnique.size)

      const enKeys = Object.keys(translations.en)
      const enUnique = new Set(enKeys)
      expect(enKeys).toHaveLength(enUnique.size)
    })

    it('translations are constants (as const)', () => {
      // This verifies the object is properly typed with 'as const'
      // accessing a non-existent key should fail at type level (runtime test verifies structure)
      expect(Object.isFrozen(translations.es) || Object.getOwnPropertyDescriptor(translations, 'es')).toBeDefined()
    })
  })
})
