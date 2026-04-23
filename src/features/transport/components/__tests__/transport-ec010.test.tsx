// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlayControls } from '../PlayControls'
import { BpmControl } from '../BpmControl'
import { TransportBar } from '../TransportBar'
import type { UseStrudelResult } from '@features/audio'
import { useSessionStore } from '@store/sessionStore'

// Mock Zustand store
vi.mock('@store/sessionStore', () => ({
  useSessionStore: vi.fn(),
}))

const DISABLED_REASON = 'Motor de audio no disponible. Recarga la pagina o prueba otro navegador.'

// Default store state for component tests
const defaultStoreState = {
  isPlaying: false,
  setPlaying: vi.fn(),
  currentCode: 's("bd").gain(0.85).slow(4).cpm(138.00)',
  bpm: 138,
  setBpm: vi.fn(),
}

function mockStore(overrides: Partial<typeof defaultStoreState> = {}) {
  vi.mocked(useSessionStore).mockImplementation((selector: any) =>
    selector({ ...defaultStoreState, ...overrides })
  )
}

// Strudel stub factories
function makeStrudel(overrides: Partial<UseStrudelResult> = {}): UseStrudelResult {
  return {
    play: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    isReady: true,
    initError: null,
    ...overrides,
  }
}

function makeErrorStrudel(errorMsg = 'AudioContext not available'): UseStrudelResult {
  return makeStrudel({
    isReady: false,
    initError: `No se pudo inicializar Strudel: ${errorMsg}`,
  })
}

describe('PlayControls — EC-010: disabled when initError', () => {
  beforeEach(() => {
    mockStore()
    vi.clearAllMocks()
  })

  describe('normal state', () => {
    it('renders Play and Stop buttons', () => {
      render(<PlayControls strudel={makeStrudel()} />)

      expect(screen.getByLabelText('Play')).toBeInTheDocument()
      expect(screen.getByLabelText('Stop')).toBeInTheDocument()
    })

    it('Play and Stop are enabled when motor is ready', () => {
      render(<PlayControls strudel={makeStrudel()} />)

      expect(screen.getByLabelText('Play')).not.toBeDisabled()
      expect(screen.getByLabelText('Stop')).not.toBeDisabled()
    })

    it('Play and Stop have no title tooltip when enabled', () => {
      render(<PlayControls strudel={makeStrudel()} />)

      expect(screen.getByLabelText('Play').getAttribute('title')).toBeFalsy()
      expect(screen.getByLabelText('Stop').getAttribute('title')).toBeFalsy()
    })
  })

  describe('EC-010: disabled={true}', () => {
    it('Play button is disabled when disabled prop is true', () => {
      render(
        <PlayControls strudel={makeErrorStrudel()} disabled disabledReason={DISABLED_REASON} />
      )

      expect(screen.getByLabelText('Play')).toBeDisabled()
    })

    it('Stop button is disabled when disabled prop is true', () => {
      render(
        <PlayControls strudel={makeErrorStrudel()} disabled disabledReason={DISABLED_REASON} />
      )

      expect(screen.getByLabelText('Stop')).toBeDisabled()
    })

    it('Play button has tooltip explaining why it is disabled', () => {
      render(
        <PlayControls strudel={makeErrorStrudel()} disabled disabledReason={DISABLED_REASON} />
      )

      expect(screen.getByLabelText('Play').getAttribute('title')).toBe(DISABLED_REASON)
    })

    it('Stop button has tooltip explaining why it is disabled', () => {
      render(
        <PlayControls strudel={makeErrorStrudel()} disabled disabledReason={DISABLED_REASON} />
      )

      expect(screen.getByLabelText('Stop').getAttribute('title')).toBe(DISABLED_REASON)
    })

    it('clicking Play does not call play() when disabled', () => {
      const strudelMock = makeErrorStrudel()
      render(
        <PlayControls strudel={strudelMock} disabled disabledReason={DISABLED_REASON} />
      )

      fireEvent.click(screen.getByLabelText('Play'))

      expect(strudelMock.play).not.toHaveBeenCalled()
    })

    it('clicking Stop does not call stop() when disabled', () => {
      const strudelMock = makeErrorStrudel()
      render(
        <PlayControls strudel={strudelMock} disabled disabledReason={DISABLED_REASON} />
      )

      fireEvent.click(screen.getByLabelText('Stop'))

      expect(strudelMock.stop).not.toHaveBeenCalled()
    })
  })
})

describe('BpmControl — EC-010: disabled when initError', () => {
  beforeEach(() => {
    mockStore()
    vi.clearAllMocks()
  })

  describe('normal state', () => {
    it('renders BPM value and +/- buttons', () => {
      render(<BpmControl />)

      expect(screen.getByText('138')).toBeInTheDocument()
    })

    it('BPM buttons are enabled by default', () => {
      render(<BpmControl />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((btn) => expect(btn).not.toBeDisabled())
    })
  })

  describe('EC-010: disabled={true}', () => {
    it('BPM buttons are disabled', () => {
      render(<BpmControl disabled disabledReason={DISABLED_REASON} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((btn) => expect(btn).toBeDisabled())
    })

    it('BPM buttons have tooltip when disabled', () => {
      render(<BpmControl disabled disabledReason={DISABLED_REASON} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((btn) => {
        expect(btn.getAttribute('title')).toBe(DISABLED_REASON)
      })
    })

    it('clicking + does not call setBpm when disabled', async () => {
      const setBpmMock = vi.fn()
      mockStore({ setBpm: setBpmMock })

      render(<BpmControl disabled disabledReason={DISABLED_REASON} />)

      // buttons are disabled — userEvent won't fire click on disabled buttons
      const buttons = screen.getAllByRole('button')
      buttons.forEach((btn) => expect(btn).toBeDisabled())
      expect(setBpmMock).not.toHaveBeenCalled()
    })
  })
})

describe('TransportBar — EC-010: engine status indicator', () => {
  beforeEach(() => {
    mockStore()
    vi.clearAllMocks()
  })

  it('shows "● Listo" when isReady=true and no error', () => {
    render(<TransportBar strudel={makeStrudel({ isReady: true })} />)

    expect(screen.getByText('● Listo')).toBeInTheDocument()
  })

  it('shows "○ Iniciando…" when isReady=false and no error', () => {
    render(<TransportBar strudel={makeStrudel({ isReady: false, initError: null })} />)

    expect(screen.getByText('○ Iniciando…')).toBeInTheDocument()
  })

  it('shows "✕ Error" when initError is set', () => {
    render(<TransportBar strudel={makeErrorStrudel()} />)

    expect(screen.getByText('✕ Error')).toBeInTheDocument()
  })

  it('passes disabled=true to PlayControls when initError is set', () => {
    render(<TransportBar strudel={makeErrorStrudel()} />)

    // Both Play and Stop buttons should be disabled
    expect(screen.getByLabelText('Play')).toBeDisabled()
    expect(screen.getByLabelText('Stop')).toBeDisabled()
  })

  it('passes disabled=true to BpmControl when initError is set', () => {
    render(<TransportBar strudel={makeErrorStrudel()} />)

    const bpmButtons = screen.getAllByRole('button').filter(
      (btn) => btn.getAttribute('title') === DISABLED_REASON
    )
    expect(bpmButtons.length).toBeGreaterThan(0)
    bpmButtons.forEach((btn) => expect(btn).toBeDisabled())
  })

  it('does not disable controls when motor is ready', () => {
    render(<TransportBar strudel={makeStrudel({ isReady: true })} />)

    expect(screen.getByLabelText('Play')).not.toBeDisabled()
    expect(screen.getByLabelText('Stop')).not.toBeDisabled()
  })
})
