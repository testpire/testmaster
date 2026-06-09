import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Renders text that may contain LaTeX math written with $...$ (inline) or
// $$...$$ (block) delimiters. The backend flags each question with
// `textFormat: "PLAIN" | "LATEX"`; that single flag governs the question text,
// its explanation, and all of its option texts.
//
// We deliberately use plain `katex` (not react-katex) because question/option
// strings are mixed prose + math ("Find $x^2 + 3x + 2 = 0$"), which the
// component wrappers don't handle — they expect a bare expression. So we split
// on the delimiters ourselves and render each math chunk with katex, leaving
// prose chunks as React-escaped text.

// Inline: $...$ (no newline, non-greedy). Block: $$...$$ (may span lines).
// Block is matched first via the alternation so $$ isn't mistaken for empty $$.
const MATH_PATTERN = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

// True when the string contains something that looks like LaTeX — a $...$ /
// $$...$$ span or a backslash command (\frac, \sqrt, ...). Mirrors the
// backend's CSV auto-detection (which keys off the presence of a backslash).
export const hasLatex = (text) => {
  if (!text || typeof text !== 'string') return false;
  return /\$\$?[\s\S]+?\$\$?/.test(text) || /\\[a-zA-Z]+/.test(text);
};

// Returns 'LATEX' if any of the provided strings looks like LaTeX, else 'PLAIN'.
export const detectTextFormat = (...texts) =>
  texts.some((t) => hasLatex(t)) ? 'LATEX' : 'PLAIN';

const renderMath = (expr, displayMode) => {
  try {
    return katex.renderToString(expr, {
      displayMode,
      throwOnError: false,
      output: 'html',
    });
  } catch {
    return null; // fall back to raw text below
  }
};

const MathText = ({ text, textFormat, as: Tag = 'span', className }) => {
  const value = text == null ? '' : String(text);

  // Plain text (or LATEX-flagged but no actual delimiters/commands): let React
  // escape and render it verbatim. This also keeps whitespace/newlines intact.
  if (String(textFormat).toUpperCase() !== 'LATEX' || !hasLatex(value)) {
    return <Tag className={className}>{value}</Tag>;
  }

  const nodes = [];
  let lastIndex = 0;
  let match;
  MATH_PATTERN.lastIndex = 0;
  let key = 0;

  while ((match = MATH_PATTERN.exec(value)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(value.slice(lastIndex, match.index));
    }
    const isBlock = match[1] != null;
    const expr = isBlock ? match[1] : match[2];
    const html = renderMath(expr, isBlock);
    if (html) {
      nodes.push(
        <span
          key={`m${key++}`}
          // katex output is trusted, generated HTML (not user markup)
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } else {
      // Render failed — show the original source so nothing silently vanishes.
      nodes.push(match[0]);
    }
    lastIndex = MATH_PATTERN.lastIndex;
  }
  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex));
  }

  return <Tag className={className}>{nodes}</Tag>;
};

export default MathText;
