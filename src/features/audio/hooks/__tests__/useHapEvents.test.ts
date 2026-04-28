// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EditorView } from '@codemirror/view';
import type { HapState } from '../useStrudel';
import { useHapEvents } from '../useHapEvents';

const updateMiniLocationsMock = vi.fn();
const highlightMiniLocationsMock = vi.fn();

vi.mock('@strudel/codemirror', () => ({
  updateMiniLocations: (...args: unknown[]) => updateMiniLocationsMock(...args),
  highlightMiniLocations: (...args: unknown[]) => highlightMiniLocationsMock(...args),
}));

let rafId = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();

function runNextFrame(time = 0) {
  const next = [...rafCallbacks.keys()].sort((a, b) => a - b)[0];
  if (next === undefined) {
    return;
  }
  const cb = rafCallbacks.get(next);
  rafCallbacks.delete(next);
  cb?.(time);
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
}

function makeHapState(overrides: Partial<HapState> = {}): HapState {
  return {
    pattern: null,
    miniLocations: [],
    getTime: () => 1,
    ...overrides,
  };
}

describe('useHapEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rafCallbacks.clear();
    rafId = 0;

    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
      rafId += 1;
      rafCallbacks.set(rafId, cb);
      return rafId;
    }));

    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => {
      rafCallbacks.delete(id);
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('highlights active haps and caps decorations to 64 per frame (BR-001)', async () => {
    const view = {} as EditorView;
    const queryArc = vi.fn(() =>
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        hasOnset: () => true,
        value: { color: 'cyan' },
        context: { locations: [{ start: i, end: i + 1 }] },
      })),
    );

    const hapState = makeHapState({
      pattern: { queryArc },
      miniLocations: [
        [0, 1],
        [2, 3],
      ],
      getTime: () => 4,
    });

    renderHook(() =>
      useHapEvents({
        isPlaying: true,
        fallbackStep: 0,
        getView: () => view,
        getHapState: () => hapState,
      }),
    );

    await flushMicrotasks();

    await act(async () => {
      runNextFrame(16);
    });

    expect(updateMiniLocationsMock).toHaveBeenCalledTimes(1);
    expect(updateMiniLocationsMock).toHaveBeenCalledWith(view, hapState.miniLocations);
    expect(queryArc).toHaveBeenCalled();

    const [highlightView, atTime, styledHaps] = highlightMiniLocationsMock.mock.calls[0] as [
      EditorView,
      number,
      Array<{ value?: { markcss?: string } }>,
    ];

    expect(highlightView).toBe(view);
    expect(atTime).toBe(4);
    expect(styledHaps).toHaveLength(64);
    expect(styledHaps[0].value?.markcss).toContain('background-color:rgba(0,255,200,0.18)');
  });

  it('does not re-run updateMiniLocations when miniLocations reference is unchanged', async () => {
    const view = {} as EditorView;
    const miniLocations: [number, number][] = [
      [0, 1],
      [2, 3],
    ];
    const hapState = makeHapState({
      pattern: { queryArc: vi.fn(() => []) },
      miniLocations,
      getTime: () => 2,
    });

    renderHook(() =>
      useHapEvents({
        isPlaying: true,
        fallbackStep: 0,
        getView: () => view,
        getHapState: () => hapState,
      }),
    );

    await flushMicrotasks();

    await act(async () => {
      runNextFrame(16);
      runNextFrame(32);
    });

    expect(updateMiniLocationsMock).toHaveBeenCalledTimes(1);
  });

  it('uses degraded fallback highlight when pattern has no queryArc', async () => {
    const view = {} as EditorView;
    const hapState = makeHapState({
      pattern: {},
      miniLocations: [
        [10, 20],
        [30, 40],
      ],
      getTime: () => 1,
    });

    renderHook(() =>
      useHapEvents({
        isPlaying: true,
        fallbackStep: 3,
        getView: () => view,
        getHapState: () => hapState,
      }),
    );

    await flushMicrotasks();

    await act(async () => {
      runNextFrame(16);
    });

    const [, atTime, haps] = highlightMiniLocationsMock.mock.calls[0] as [
      EditorView,
      number,
      Array<{ context?: { locations?: Array<{ start: number; end: number }> } }>,
    ];

    expect(atTime).toBe(0);
    expect(haps).toHaveLength(1);
    expect(haps[0].context?.locations?.[0]).toEqual({ start: 30, end: 40 });
  });

  it('EC-006: falls back safely when queryArc throws', async () => {
    const view = {} as EditorView;
    const hapState = makeHapState({
      pattern: {
        queryArc: () => {
          throw new Error('scheduler error');
        },
      },
      miniLocations: [
        [1, 2],
        [3, 4],
      ],
      getTime: () => 8,
    });

    renderHook(() =>
      useHapEvents({
        isPlaying: true,
        fallbackStep: 1,
        getView: () => view,
        getHapState: () => hapState,
      }),
    );

    await flushMicrotasks();

    await act(async () => {
      runNextFrame(16);
    });

    const [, atTime, haps] = highlightMiniLocationsMock.mock.calls[0] as [
      EditorView,
      number,
      Array<{ context?: { locations?: Array<{ start: number; end: number }> } }>,
    ];

    expect(atTime).toBe(0);
    expect(haps[0].context?.locations?.[0]).toEqual({ start: 3, end: 4 });
  });

  it('clears highlights when playback stops (PAUSED)', async () => {
    const view = {} as EditorView;
    const hapState = makeHapState({
      pattern: { queryArc: vi.fn(() => []) },
      miniLocations: [[0, 1]],
      getTime: () => 1,
    });

    const { rerender } = renderHook(
      ({ isPlaying }) =>
        useHapEvents({
          isPlaying,
          fallbackStep: 0,
          getView: () => view,
          getHapState: () => hapState,
        }),
      {
        initialProps: { isPlaying: true },
      },
    );

    await flushMicrotasks();

    await act(async () => {
      runNextFrame(16);
    });

    rerender({ isPlaying: false });

    const lastCall = highlightMiniLocationsMock.mock.calls.at(-1) as [EditorView, number, unknown[]];
    expect(lastCall[0]).toBe(view);
    expect(lastCall[1]).toBe(0);
    expect(lastCall[2]).toEqual([]);
  });
});
