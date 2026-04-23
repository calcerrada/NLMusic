// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PromptBox } from '../PromptBox'

// Mock usePatternGen so PromptBox tests don't depend on fetch
vi.mock('@features/prompt/hooks/usePatternGen', () => ({
  usePatternGen: vi.fn(() => ({
    generate: vi.fn().mockResolvedValue(true),
    retry: vi.fn(),
    isLoading: false,
    error: null,
    info: null,
  })),
}))

// Mock useSessionStore — PromptBox reads uiState for error banner
vi.mock('@store/sessionStore', () => ({
  useSessionStore: vi.fn((selector: (s: { uiState: string }) => unknown) =>
    selector({ uiState: 'idle' })
  ),
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
        retry: vi.fn(),
        isLoading: false,
        error: null,
        info: null,
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
    it('shows error banner and retry button when uiState=error', async () => {
      const { usePatternGen } = await import('@features/prompt/hooks/usePatternGen')
      const { useSessionStore } = await import('@store/sessionStore')
      vi.mocked(usePatternGen).mockReturnValue({
        generate: vi.fn().mockResolvedValue(false),
        retry: vi.fn(),
        isLoading: false,
        error: 'Error de red',
        info: null,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useSessionStore).mockImplementation((selector: any) => selector({ uiState: 'error' }))

      render(<PromptBox motorAvailable />)

      expect(screen.getByText('Error de red')).toBeInTheDocument()
      expect(screen.getByText('Reintentar')).toBeInTheDocument()
    })

    it('shows truncation info message from usePatternGen', async () => {
      const { usePatternGen } = await import('@features/prompt/hooks/usePatternGen')
      const { useSessionStore } = await import('@store/sessionStore')
      vi.mocked(usePatternGen).mockReturnValue({
        generate: vi.fn().mockResolvedValue(true),
        retry: vi.fn(),
        isLoading: false,
        error: null,
        info: 'El LLM propuso 7 pistas; se mantuvieron 5 (límite BR-006).',
      })
      // PromptBox solo muestra info cuando no está en estado global de error.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useSessionStore).mockImplementation((selector: any) => selector({ uiState: 'idle' }))

      render(<PromptBox motorAvailable />)

      expect(
        screen.getByText('El LLM propuso 7 pistas; se mantuvieron 5 (límite BR-006).')
      ).toBeInTheDocument()
    })
  })
})
