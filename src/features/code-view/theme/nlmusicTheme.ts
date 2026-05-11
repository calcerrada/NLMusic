import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// Replica la paleta del design system para que el editor avanzado conserve la identidad visual.
// Keywords: --cyan · strings: --amber · números: --violet · comentarios: texto atenuado.

const editorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'transparent',
      color: 'var(--text)',
      fontSize: '12px',
      fontFamily: "'JetBrains Mono', monospace",
      // TASK-11: highlight.mjs usa --foreground como color por defecto cuando un hap no trae estilo propio.
      // Mantener este alias aquí evita que el flash dependa del tema de sintaxis o del contenido del token.
      '--foreground': 'var(--cyan)',
    },
    '.cm-scroller': {
      fontFamily: "'JetBrains Mono', monospace",
      lineHeight: '1.5',
      overflow: 'auto',
    },
    '.cm-content': {
      caretColor: 'var(--cyan)',
      padding: '12px 0',
      minHeight: '60px',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--cyan)',
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      color: 'var(--text-muted)',
      borderRight: '1px solid var(--border)',
      fontSize: '12px',
      minWidth: '32px',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      paddingRight: '8px',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(0,255,200,0.03)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(0,255,200,0.03)',
      color: 'var(--text-dim)',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'rgba(0,255,200,0.15) !important',
    },
    '.cm-line': {
      paddingLeft: '8px',
      paddingRight: '12px',
    },
    '&.cm-focused': {
      outline: 'none',
    },
  },
  { dark: true },
);

const highlightStyle = HighlightStyle.define([
  // Keywords (function, const, let, var, return, etc.)
  { tag: t.keyword, color: 'var(--cyan)' },
  // Function names called like stack(), s(), gain()
  { tag: t.function(t.variableName), color: 'var(--cyan)' },
  { tag: t.function(t.propertyName), color: 'var(--cyan)' },
  // Property names (chained .gain, .slow, .fast, etc.)
  { tag: t.propertyName, color: 'var(--cyan)' },
  // Variable names (stack, s, silence when used as identifiers)
  { tag: t.variableName, color: 'var(--text)' },
  // Strings: "bd hh sd", "kick", mini-notation patterns
  { tag: t.string, color: 'var(--amber)' },
  { tag: t.special(t.string), color: 'var(--amber)' },
  // Numbers: 0.8, 138, 16, etc.
  { tag: t.number, color: 'var(--violet)' },
  // Comments: // and /* */
  { tag: t.comment, color: 'rgba(98,114,164,0.6)', fontStyle: 'italic' },
  // Operators and punctuation
  { tag: t.operator, color: 'var(--text-dim)' },
  { tag: t.punctuation, color: 'var(--text-dim)' },
  { tag: t.bracket, color: 'var(--text-dim)' },
  // Boolean and null literals
  { tag: [t.bool, t.null], color: 'var(--violet)' },
]);

/** Syntax highlighting based on the NLMusic design system palette. */
export const nlmusicSyntaxHighlighting = syntaxHighlighting(highlightStyle);

/**
 * Base editor visual theme (gutters, cursor, background, fonts).
 * Does NOT include syntax token colors — use `nlmusicSyntaxHighlighting` for those.
 */
export const nlmusicBaseTheme = editorTheme;

/**
 * Full NLMusic theme: base + syntax highlighting combined.
 * @see BR-009 El cambio de editor no altera la sincronización funcional con el grid.
 */
export const nlmusicTheme = [editorTheme, syntaxHighlighting(highlightStyle)];
