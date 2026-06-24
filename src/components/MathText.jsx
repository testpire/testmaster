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

// True when a line is a GitHub-flavoured-markdown table delimiter row, e.g.
// `|---|---|` or `| :--- | ---: |`. The delimiter row is what makes remark-gfm
// recognise a table, so it's the reliable signal: it's made up only of pipes,
// dashes, colons and spaces, must contain a dash, and carries at least two pipes
// (so a stray `a|b` prose line or a lone `-----` rule never qualifies).
export const isMarkdownTableDelimiter = (line) => {
  const t = (line == null ? '' : String(line)).trim();
  if (!t.includes('|') || !t.includes('-')) return false;
  if (!/^\|?[\s:|-]+\|?$/.test(t)) return false;
  return (t.match(/\|/g) || []).length >= 2;
};

// True when the text contains a GFM table: a header line with a pipe immediately
// followed by a delimiter row. Lets question content fall through to the
// markdown+math pipeline (which renders real tables) instead of MathText, which
// would print the pipes verbatim. No existing question contains such a row, so
// turning this on can't change how already-authored questions render.
export const hasMarkdownTable = (text) => {
  if (!text || typeof text !== 'string') return false;
  const lines = text.split('\n');
  for (let i = 1; i < lines.length; i++) {
    if (lines[i - 1].includes('|') && isMarkdownTableDelimiter(lines[i])) return true;
  }
  return false;
};

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

  // `textFormat` is an override, not a requirement: an explicit "PLAIN" is always
  // honored as verbatim text, but an absent/unknown flag (e.g. the student
  // attempt payload omits textFormat) falls back to auto-detection so LaTeX still
  // renders. An explicit "LATEX" with no actual delimiters/commands also stays
  // plain. In every case React escapes the text and preserves whitespace/newlines.
  const fmt = textFormat == null ? '' : String(textFormat).toUpperCase();
  if (fmt === 'PLAIN' || !hasLatex(value)) {
    return <Tag className={className}>{value}</Tag>;
  }

  // Bare LaTeX with no $...$ delimiters (e.g. an option stored as "\frac{i}{psq}"):
  // hasLatex() is true via the backslash-command branch, but MATH_PATTERN below
  // only extracts $-delimited spans and would find nothing, leaving the source to
  // render verbatim. Treat the whole string as a single inline expression so it
  // still renders (falling back to raw text if katex can't parse it).
  MATH_PATTERN.lastIndex = 0;
  if (!MATH_PATTERN.test(value)) {
    const html = renderMath(value, false);
    return (
      <Tag className={className}>
        {html ? <span dangerouslySetInnerHTML={{ __html: html }} /> : value}
      </Tag>
    );
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
          // Block (display) math doesn't wrap; on narrow screens a wide equation
          // would stretch/clip the page, so let it scroll horizontally on its own.
          className={isBlock ? 'inline-block max-w-full overflow-x-auto align-middle' : undefined}
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
