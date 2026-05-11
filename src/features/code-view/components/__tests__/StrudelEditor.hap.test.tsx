// @vitest-environment jsdom
/**
 * Focused tests for the enableHapHighlighting hot-toggle (TASK-11 finding 4).
 *
 * Renders StrudelEditor directly (not via next/dynamic) so the real CodeMirror
 * Compartment reconfiguration is exercised. Heavy transitive deps are mocked so
 * the test suite stays fast.
 */
import { createRef } from 'react';
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { StrudelEditorRef } from '../StrudelEditor';
import { StrudelEditor } from '../StrudelEditor';

// Avoid pulling the full @strudel/codemirror bundle into the test environment.
vi.mock('@strudel/codemirror', () => ({
  extensions: {
    isBracketMatchingEnabled: () => [],
    isBracketClosingEnabled: () => [],
  },
}));

// Avoid pulling highlight.mjs which drags in @kabelsalat/web.
vi.mock('@lib/strudelHighlight', () => ({
  highlightExtension: [],
  updateMiniLocations: vi.fn(),
  highlightMiniLocations: vi.fn(),
}));

describe('StrudelEditor — enableHapHighlighting hot toggle (TASK-11)', () => {
  it('mounts with enableHapHighlighting=true and exposes a live EditorView', async () => {
    const ref = createRef<StrudelEditorRef>();

    await act(async () => {
      render(
        <StrudelEditor
          ref={ref}
          value="note('c')"
          onChange={vi.fn()}
          enableHapHighlighting={true}
        />,
      );
    });

    expect(ref.current?.view).not.toBeNull();
  });

  it('preserves the editor selection when hap highlighting is reconfigured during editing', async () => {
    const ref = createRef<StrudelEditorRef>();

    const { rerender } = render(
      <StrudelEditor
        ref={ref}
        value="note('c d e')"
        onChange={vi.fn()}
        enableHapHighlighting={true}
      />,
    );

    await act(async () => {});

    const viewAfterMount = ref.current?.view;
    expect(viewAfterMount).not.toBeNull();

    await act(async () => {
      viewAfterMount!.dispatch({
        selection: { anchor: 5, head: 9 },
      });
    });

    expect(viewAfterMount!.state.selection.main.from).toBe(5);
    expect(viewAfterMount!.state.selection.main.to).toBe(9);

    await act(async () => {
      rerender(
        <StrudelEditor
          ref={ref}
          value="note('c d e')"
          onChange={vi.fn()}
          enableHapHighlighting={false}
        />,
      );
    });

    expect(ref.current?.view).toBe(viewAfterMount);
    expect(viewAfterMount!.state.selection.main.from).toBe(5);
    expect(viewAfterMount!.state.selection.main.to).toBe(9);
  });

  it('reconfigures hap compartment without remounting when toggled false → true', async () => {
    const ref = createRef<StrudelEditorRef>();

    const { rerender } = render(
      <StrudelEditor
        ref={ref}
        value="note('c')"
        onChange={vi.fn()}
        enableHapHighlighting={false}
      />,
    );

    // Flush mount effects so the EditorView is created
    await act(async () => {});

    const viewAfterMount = ref.current?.view;
    expect(viewAfterMount).not.toBeNull();

    const dispatchSpy = vi.spyOn(viewAfterMount!, 'dispatch');

    // Toggle highlighting on after mount
    await act(async () => {
      rerender(
        <StrudelEditor
          ref={ref}
          value="note('c')"
          onChange={vi.fn()}
          enableHapHighlighting={true}
        />,
      );
    });

    // The same EditorView instance must still be alive (no remount)
    expect(ref.current?.view).toBe(viewAfterMount);
    // dispatch must have been called for the hapHighlightCompartment reconfiguration
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('reconfigures hap compartment without remounting when toggled true → false', async () => {
    const ref = createRef<StrudelEditorRef>();

    const { rerender } = render(
      <StrudelEditor
        ref={ref}
        value="note('c')"
        onChange={vi.fn()}
        enableHapHighlighting={true}
      />,
    );

    await act(async () => {});

    const viewAfterMount = ref.current?.view;
    expect(viewAfterMount).not.toBeNull();

    const dispatchSpy = vi.spyOn(viewAfterMount!, 'dispatch');

    await act(async () => {
      rerender(
        <StrudelEditor
          ref={ref}
          value="note('c')"
          onChange={vi.fn()}
          enableHapHighlighting={false}
        />,
      );
    });

    expect(ref.current?.view).toBe(viewAfterMount);
    expect(dispatchSpy).toHaveBeenCalled();
  });
});
