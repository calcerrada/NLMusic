// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PromptBox } from '../PromptBox'

// Mock usePatternGen so PromptBox tests don't depend on fetch
vi.mock('@features/prompt/hooks/usePatternGen', () => ({
  usePatternGen: vi.fn(() => ({
    generate: vi.fn().mockResolvedValue(true),
    isLoading: false,
    error: null,
  })),
}))

const DISABLED_REASON =
  'Motor de audio no disponible. Recarga la pagina o prueba otro navegador.'

describe('PromptBox — EC-010: disabled when motorAvailable=false', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('normal state — motorAvailable=true', () => {
    it('textarea is enabled', () => {
      render(<PromptBox motorAvailable />)

      expect(screen.getByRole('textbox')).not.toBeDisabled()
    })

    it('send button is enabled when prompt has content', () => {
      render(<PromptBox motorAvailable />)

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'bombo 808' } })

      expect(screen.getByLabelText('Enviar prompt')).not.toBeDisabled()
    })

    it('shows musical placeholder when motor is available', () => {
      render(<PromptBox motorAvailable />)

      const textarea = screen.getByRole('textbox')
      expect(textarea.getAttribute('placeholder')).toContain('kick 909')
    })

    it('textarea has no title attribute when enabled', () => {
      render(<PromptBox motorAvailable />)

      const textarea = screen.getByRole('textbox')
      expect(textarea.getAttribute('title')).toBeFalsy()
    })
  })

  describe('EC-010: motorAvailable=false', () => {
    it('textarea is disabled', () => {
      render(<PromptBox motorAvailable={false} />)

      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('send button is disabled', () => {
      render(<PromptBox motorAvailable={false} />)

      expect(screen.getByLabelText('Enviar prompt')).toBeDisabled()
    })

    it('textarea shows placeholder indicating motor is unavailable', () => {
      render(<PromptBox motorAvailable={false} />)

      const textarea = screen.getByRole('textbox')
      expect(textarea.getAttribute('placeholder')).toContain('Motor de audio no disponible')
    })

    it('textarea has tooltip explaining why it is disabled', () => {
      render(<PromptBox motorAvailable={false} />)

      expect(screen.getByRole('textbox').getAttribute('title')).toBe(DISABLED_REASON)
    })

    it('send button has tooltip explaining why it is disabled', () => {
      render(<PromptBox motorAvailable={false} />)

      expect(screen.getByLabelText('Enviar prompt').getAttribute('title')).toBe(DISABLED_REASON)
    })

    it('pressing Enter does not call generate when motor unavailable', async () => {
      const { usePatternGen } = await import('@features/prompt/hooks/usePatternGen')
      const generateMock = vi.fn().mockResolvedValue(true)
      vi.mocked(usePatternGen).mockReturnValue({
        generate: generateMock,
        isLoading: false,
        error: null,
      })

      render(<PromptBox motorAvailable={false} />)

      const textarea = screen.getByRole('textbox')
      // textarea is disabled — keydown should not propagate
      fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: false })

      expect(generateMock).not.toHaveBeenCalled()
    })
  })

  describe('BR-010: empty prompt', () => {
    it('send button is disabled when prompt is empty', () => {
      render(<PromptBox motorAvailable />)

      expect(screen.getByLabelText('Enviar prompt')).toBeDisabled()
    })

    it('send button enables when prompt has content', () => {
      render(<PromptBox motorAvailable />)

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'kick' } })

      expect(screen.getByLabelText('Enviar prompt')).not.toBeDisabled()
    })
  })

  describe('error display', () => {
    it('shows error message from usePatternGen', async () => {
      const { usePatternGen } = await import('@features/prompt/hooks/usePatternGen')
      vi.mocked(usePatternGen).mockReturnValue({
        generate: vi.fn().mockResolvedValue(false),
        isLoading: false,
        error: 'Error de red',
      })

      render(<PromptBox motorAvailable />)

      expect(screen.getByText('Error de red')).toBeInTheDocument()
    })
  })
})
