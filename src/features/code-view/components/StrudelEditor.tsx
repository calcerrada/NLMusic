'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { lineNumbers, keymap } from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { extensions as strudelExtensions } from '@strudel/codemirror';
import { nlmusicTheme } from '../theme/nlmusicTheme';

/**
 * Referencia imperativa al EditorView de CodeMirror.
 * TASK-11 la reutilizará para decorar rangos sin mover la lógica al store.
 */
export interface StrudelEditorRef {
  readonly view: EditorView | null;
}

interface StrudelEditorProps {
  value: string;
  onChange: (code: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * Editor CodeMirror 6 reutilizable para Strudel con la paleta visual de NLMusic.
 * Mantiene la sincronización externa sin reemitir cambios al padre cuando el valor llega desde grid o LLM.
 * No contiene lógica de negocio ni acceso al store.
 *
 * @param value - Código Strudel que debe reflejar el editor como fuente externa de verdad.
 * @param onChange - Callback invocado sólo en edición del usuario; el debounce vive fuera.
 * @param onFocus - Notifica al contenedor cuándo debe pausar la sincronización Grid → Editor.
 * @param onBlur - Reactiva la sincronización externa cuando el usuario sale del editor.
 * @param disabled - Deshabilita escritura sin desmontar la instancia de CodeMirror.
 * @param ariaLabel - Etiqueta accesible aplicada al contenido editable interno.
 * @see BR-009 La sincronización bidireccional depende de distinguir edición local de updates externos.
 */
export const StrudelEditor = forwardRef<StrudelEditorRef, StrudelEditorProps>(
  ({ value, onChange, onFocus, onBlur, disabled = false, ariaLabel }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const viewRef = useRef<EditorView | null>(null);
    // BR-009: evita bucles cuando el padre reinyecta código desde grid o LLM.
    const isExternalUpdate = useRef(false);
    const editableCompartment = useRef(new Compartment());

    // TASK-11: expone el EditorView para decoraciones temporales sobre el código.
    useImperativeHandle(ref, () => ({
      get view() {
        return viewRef.current;
      },
    }));

    // El editor se monta una sola vez; las refs mantienen callbacks frescos sin recrearlo.
    const onChangeRef = useRef(onChange);
    const onFocusRef = useRef(onFocus);
    const onBlurRef = useRef(onBlur);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
    useEffect(() => { onFocusRef.current = onFocus; }, [onFocus]);
    useEffect(() => { onBlurRef.current = onBlur; }, [onBlur]);

    useEffect(() => {
      if (!containerRef.current) return;

      const view = new EditorView({
        state: EditorState.create({
          doc: value,
          extensions: [
            lineNumbers(),
            javascript(),
            ...nlmusicTheme,
            strudelExtensions.isBracketMatchingEnabled(true),
            strudelExtensions.isBracketClosingEnabled(true),
            editableCompartment.current.of(EditorView.editable.of(!disabled)),
            ...(ariaLabel
              ? [EditorView.contentAttributes.of({ 'aria-label': ariaLabel })]
              : []),
            keymap.of([indentWithTab, ...defaultKeymap]),
            EditorView.updateListener.of((update) => {
              // BR-009: sólo propagamos cambios originados en la edición local.
              if (update.docChanged && !isExternalUpdate.current) {
                onChangeRef.current(update.state.doc.toString());
              }
            }),
            EditorView.domEventHandlers({
              focus: () => { onFocusRef.current?.(); return false; },
              blur: () => { onBlurRef.current?.(); return false; },
            }),
            EditorView.lineWrapping,
          ],
        }),
        parent: containerRef.current,
      });

      viewRef.current = view;
      return () => {
        view.destroy();
        viewRef.current = null;
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // BR-009: sync external value → editor without triggering onChange (loop guard)
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      const currentDoc = view.state.doc.toString();
      if (currentDoc === value) return;

      isExternalUpdate.current = true;
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
      isExternalUpdate.current = false;
    }, [value]);

    // Reconfigura modo editable sin destruir el editor ni perder selección.
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: editableCompartment.current.reconfigure(EditorView.editable.of(!disabled)),
      });
    }, [disabled]);

    return <div ref={containerRef} style={{ width: '100%' }} />;
  },
);

StrudelEditor.displayName = 'StrudelEditor';
