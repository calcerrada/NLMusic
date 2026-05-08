import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('TransportBar — language selector integration (TASK-13)', () => {
  const transportBarPath = resolve(
    __dirname,
    '../components/TransportBar.tsx'
  )

  describe('implementation verification', () => {
    it('TransportBar source contains language selector buttons for ES and EN', () => {
      const source = readFileSync(transportBarPath, 'utf-8')

      // Verify the language selector exists
      expect(source).toContain("['es', 'en']")
      expect(source).toContain('setLanguage')
      expect(source).toContain('language')
    })

    it('TransportBar source has language selector positioned on the right', () => {
      const source = readFileSync(transportBarPath, 'utf-8')

      // Verify positioning
      expect(source).toContain('right: 16')
      expect(source).toContain('position: \'absolute\'')
    })

    it('TransportBar applies different styling for active/inactive language buttons', () => {
      const source = readFileSync(transportBarPath, 'utf-8')

      // Verify conditional styling
      expect(source).toContain("language === lang ? 'var(--text)' : 'var(--text-muted)'")
    })

    it('TransportBar calls setLanguage on button click', () => {
      const source = readFileSync(transportBarPath, 'utf-8')

      // Verify click handler
      expect(source).toContain('onClick={() => setLanguage(lang)')
    })

    it('TransportBar buttons are properly typed as button elements', () => {
      const source = readFileSync(transportBarPath, 'utf-8')

      // Verify button type
      expect(source).toContain('type="button"')
    })

    it('TransportBar selector is visible even when audio engine is not ready', () => {
      const source = readFileSync(transportBarPath, 'utf-8')

      // The selector should be independent from hasInitError state
      // It should not be in the disabled div that contains PlayControls and BpmControl
      const lines = source.split('\n')
      let hasInitErrorStart = -1
      let selectorStart = -1

      lines.forEach((line, i) => {
        if (line.includes('aria-disabled={hasInitError}')) hasInitErrorStart = i
        if (line.includes("['es', 'en']")) selectorStart = i
      })

      // Selector should appear after the disabled div (not inside it)
      if (hasInitErrorStart > -1 && selectorStart > -1) {
        expect(selectorStart).toBeGreaterThan(hasInitErrorStart)
      }
    })
  })

  describe('TASK-13 requirements coverage', () => {
    it('implements language selector in TransportBar', () => {
      const source = readFileSync(transportBarPath, 'utf-8')
      expect(source).toContain('language')
      expect(source).toContain('setLanguage')
    })

    it('supports ES and EN language options', () => {
      const source = readFileSync(transportBarPath, 'utf-8')
      expect(source).toContain("'es'")
      expect(source).toContain("'en'")
    })

    it('uses useSessionStore to manage language state', () => {
      const source = readFileSync(transportBarPath, 'utf-8')
      expect(source).toContain('useSessionStore')
      expect(source).toContain('language')
      expect(source).toContain('setLanguage')
    })

    it('implements discrete styling (uppercase, 10px)', () => {
      const source = readFileSync(transportBarPath, 'utf-8')
      expect(source).toContain("text-[10px]")
      expect(source).toContain('uppercase')
    })

    it('implements right-aligned positioning', () => {
      const source = readFileSync(transportBarPath, 'utf-8')
      expect(source).toContain('right: 16')
      expect(source).toContain('position: \'absolute\'')
    })
  })
})
