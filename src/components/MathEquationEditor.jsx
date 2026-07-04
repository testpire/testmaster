import React, { useEffect, useRef, useState } from 'react';
import { MathfieldElement } from 'mathlive';
import Button from './ui/Button';
import Modal from './ui/Modal';

// Visual (WYSIWYG) equation editor for authors who don't know LaTeX. Wraps the
// MathLive <math-field> web component and hands back a LaTeX string on insert.
//
// This module imports `mathlive` at the top level on purpose: callers load this
// component via React.lazy(), so MathLive's ~300 KB bundle ends up in that lazy
// chunk and is only fetched when an author actually opens the editor — never on
// app startup, the question list, or the student exam runner.

// MathLive's glyphs are KaTeX fonts shipped in the package. Point at the CDN for
// the installed version so we don't depend on bundler static-asset wiring; the
// editor is still functional without this, just rendered in a fallback font.
// Disable the click sounds entirely.
if (typeof window !== 'undefined' && MathfieldElement) {
  MathfieldElement.fontsDirectory = 'https://cdn.jsdelivr.net/npm/mathlive@0.110.0/fonts';
  MathfieldElement.soundsDirectory = null;
}

// Matrix bracket styles offered by the toolbar. Each button inserts a grid of
// the author-chosen rows × columns (see the size inputs) in the given delimiter,
// with a tab-navigable placeholder in every cell.
const MATRIX_STYLES = [
  { env: 'pmatrix', label: '( )', title: 'Parentheses  ( )' },
  { env: 'bmatrix', label: '[ ]', title: 'Square brackets  [ ]' },
  { env: 'vmatrix', label: '| |', title: 'Determinant  | |' },
  { env: 'Bmatrix', label: '{ }', title: 'Braces  { }' },
];

// Matrices are any dimension (2×2, 3×3, 2×3, a column vector, …). Rather than
// grow a matrix in place — MathLive's array commands wrap a non-matrix caret in
// \displaylines{…}, which KaTeX can't render — the author sets the size up front
// and we build the exact grid. Clamp to a sane range; default to 2 on bad input.
const MAX_MATRIX_DIM = 10;
const clampDim = (v) => {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return 2;
  return Math.min(Math.max(n, 1), MAX_MATRIX_DIM);
};

// Read the field's LaTeX with \placeholder{} stripped. \placeholder is a
// MathLive-only control sequence that KaTeX can't render, so any unfilled matrix
// or fraction cell would otherwise break the rendered question. The
// 'latex-without-placeholders' format replaces each \placeholder with its
// (usually empty) body, leaving valid LaTeX — e.g. an empty matrix cell.
const readLatex = (el) => (el ? el.getValue('latex-without-placeholders') : '');

const MathEquationEditor = ({ isOpen, onClose, onInsert, initialLatex = '' }) => {
  const mathfieldRef = useRef(null);
  const [latex, setLatex] = useState(initialLatex);
  // Desired matrix size (kept as strings so the inputs can be cleared mid-edit;
  // clampDim resolves them when a matrix is actually inserted).
  const [rows, setRows] = useState('2');
  const [cols, setCols] = useState('2');

  // The <math-field> element exists only once the Modal renders its children
  // (Modal returns null while closed), so seed its value and subscribe to input
  // here rather than in a ref callback.
  useEffect(() => {
    if (!isOpen) return undefined;
    const el = mathfieldRef.current;
    if (!el) return undefined;

    el.value = initialLatex || '';
    setLatex(initialLatex || '');

    const handler = () => setLatex(readLatex(el));
    el.addEventListener('input', handler);
    // Defer focus until after the dialog's own focus-on-open has run.
    const focusTimer = setTimeout(() => el.focus?.(), 0);

    return () => {
      el.removeEventListener('input', handler);
      clearTimeout(focusTimer);
    };
  }, [isOpen, initialLatex]);

  // Insert a rows×cols matrix of the chosen bracket style at the caret. Every
  // cell is a \placeholder; the first is auto-selected (selectionMode:
  // 'placeholder') so the author can start typing straight into it, and Tab moves
  // between cells. \\ separates rows, & separates columns.
  const insertMatrix = (env) => {
    const el = mathfieldRef.current;
    if (!el) return;
    const r = clampDim(rows);
    const c = clampDim(cols);
    const rowLatex = Array.from({ length: c }, () => '\\placeholder{}').join(' & ');
    const body = Array.from({ length: r }, () => rowLatex).join(' \\\\ ');
    el.insert(`\\begin{${env}}${body}\\end{${env}}`, {
      focus: true,
      selectionMode: 'placeholder',
    });
    // A programmatic insert doesn't always emit an 'input' event, so sync the
    // LaTeX state (and thus the preview) explicitly.
    setLatex(readLatex(el));
  };

  const handleInsert = () => {
    // Re-read straight from the field so the inserted value is always the current,
    // placeholder-free LaTeX (not a possibly-stale state snapshot).
    const value = (readLatex(mathfieldRef.current) || latex || '').trim();
    if (value) onInsert(value);
    onClose();
  };

  const footer = (
    <>
      <Button type="button" variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button type="button" variant="primary" onClick={handleInsert} disabled={!latex.trim()}>
        Insert Equation
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Insert Equation"
      description="Build your equation below — it's inserted into your text as LaTeX."
      size="lg"
      footer={footer}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground">Insert matrix:</span>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            rows
            <input
              type="number"
              min={1}
              max={MAX_MATRIX_DIM}
              value={rows}
              onChange={(e) => setRows(e.target.value)}
              aria-label="Matrix rows"
              className="w-12 rounded-md border border-border bg-background px-1.5 py-1 text-sm text-foreground text-center"
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            cols
            <input
              type="number"
              min={1}
              max={MAX_MATRIX_DIM}
              value={cols}
              onChange={(e) => setCols(e.target.value)}
              aria-label="Matrix columns"
              className="w-12 rounded-md border border-border bg-background px-1.5 py-1 text-sm text-foreground text-center"
            />
          </label>
          {MATRIX_STYLES.map((m) => (
            <button
              key={m.env}
              type="button"
              onClick={() => insertMatrix(m.env)}
              title={`Insert ${m.title} matrix`}
              aria-label={`Insert matrix with ${m.title}`}
              className="px-2.5 py-1 rounded-md border border-border bg-background text-sm font-mono text-foreground hover:bg-muted transition-colors"
            >
              {m.label}
            </button>
          ))}
        </div>
        <math-field
          ref={mathfieldRef}
          // eslint-disable-next-line react/no-unknown-property
          class="block w-full min-h-[3.5rem] rounded-lg border border-border bg-background px-3 py-2 text-2xl"
          style={{ outline: 'none' }}
        />
        <p className="text-xs text-muted-foreground">
          Tip: type like a calculator — <code>x^2</code> for powers, <code>/</code> for a fraction,
          <code> sqrt</code> for a root — or use the on-screen keyboard (⌨) inside the field. For a
          matrix, set the rows and columns, pick a bracket style, then <code>Tab</code> between cells
          to fill it in.
        </p>
        {latex.trim() && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">LaTeX</p>
            <code className="text-xs break-all text-foreground">{latex}</code>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MathEquationEditor;
