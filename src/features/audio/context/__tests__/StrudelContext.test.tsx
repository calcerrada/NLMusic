// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StrudelProvider, useStrudelContext } from '../StrudelContext'
import { useStrudel } from '../../hooks/useStrudel'

vi.mock('../../hooks/useStrudel', () => ({
  useStrudel: vi.fn(),
}))

function makeStrudelResult() {
  return {
    play: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    isReady: true,
    initError: null,
    getHapState: () => ({ pattern: null, miniLocations: [], getTime: () => 0 }),
  }
}

describe('StrudelContext (TASK-16)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when useStrudelContext is used outside StrudelProvider', () => {
    function ConsumerWithoutProvider() {
      useStrudelContext()
      return null
    }

    expect(() => render(<ConsumerWithoutProvider />)).toThrow(
      'useStrudelContext must be inside StrudelProvider'
    )
  })

  it('provides useStrudel() result to descendants through StrudelProvider', () => {
    const strudelResult = makeStrudelResult()
    vi.mocked(useStrudel).mockReturnValue(strudelResult)

    function ConsumerWithProvider() {
      const strudel = useStrudelContext()
      return <span>{strudel.isReady ? 'ready' : 'loading'}</span>
    }

    render(
      <StrudelProvider>
        <ConsumerWithProvider />
      </StrudelProvider>
    )

    expect(screen.getByText('ready')).toBeInTheDocument()
    expect(useStrudel).toHaveBeenCalledTimes(1)
  })
})
