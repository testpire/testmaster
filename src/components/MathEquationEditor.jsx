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

const MathEquationEditor = ({ isOpen, onClose, onInsert, initialLatex = '' }) => {
  const mathfieldRef = useRef(null);
  const [latex, setLatex] = useState(initialLatex);

  // The <math-field> element exists only once the Modal renders its children
  // (Modal returns null while closed), so seed its value and subscribe to input
  // here rather than in a ref callback.
  useEffect(() => {
    if (!isOpen) return undefined;
    const el = mathfieldRef.current;
    if (!el) return undefined;

    el.value = initialLatex || '';
    setLatex(initialLatex || '');

    const handler = () => setLatex(el.value);
    el.addEventListener('input', handler);
    // Defer focus until after the dialog's own focus-on-open has run.
    const focusTimer = setTimeout(() => el.focus?.(), 0);

    return () => {
      el.removeEventListener('input', handler);
      clearTimeout(focusTimer);
    };
  }, [isOpen, initialLatex]);

  const handleInsert = () => {
    const value = (latex || '').trim();
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
        <math-field
          ref={mathfieldRef}
          // eslint-disable-next-line react/no-unknown-property
          class="block w-full min-h-[3.5rem] rounded-lg border border-border bg-background px-3 py-2 text-2xl"
          style={{ outline: 'none' }}
        />
        <p className="text-xs text-muted-foreground">
          Tip: type like a calculator — <code>x^2</code> for powers, <code>/</code> for a fraction,
          <code> sqrt</code> for a root — or use the on-screen keyboard (⌨) inside the field.
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
