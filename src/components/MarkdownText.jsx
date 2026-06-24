import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from '../utils/cn';
import MathText, { hasLatex } from './MathText';

// Renders study-material NOTE content as GitHub-flavoured Markdown with inline /
// block math ($...$ and $$...$$ via KaTeX). react-markdown does NOT render raw
// HTML by default, so teacher-authored content can't inject markup — safe to
// show to students as-is.
//
// We deliberately do not rely on the `@tailwindcss/typography` `prose` classes
// (the plugin isn't installed, and its default grey palette clashes with the
// warm Scholar theme). Instead each element is mapped to design-token classes so
// notes read on-brand. `remark-breaks` keeps authors' single line breaks, which
// matches the old plain-text (`whitespace-pre-wrap`) behaviour.
const remarkPlugins = [remarkGfm, remarkBreaks, remarkMath];
const rehypePlugins = [rehypeKatex];

const components = {
  p: ({ node, ...props }) => <p className="mb-3 leading-relaxed text-foreground" {...props} />,
  h1: ({ node, ...props }) => <h1 className="mb-2 mt-5 text-xl font-semibold tracking-tight text-foreground" {...props} />,
  h2: ({ node, ...props }) => <h2 className="mb-2 mt-4 text-lg font-semibold tracking-tight text-foreground" {...props} />,
  h3: ({ node, ...props }) => <h3 className="mb-1.5 mt-4 text-base font-semibold text-foreground" {...props} />,
  ul: ({ node, ...props }) => <ul className="mb-3 list-disc space-y-1 pl-5 text-foreground marker:text-muted-foreground" {...props} />,
  ol: ({ node, ...props }) => <ol className="mb-3 list-decimal space-y-1 pl-5 text-foreground marker:text-muted-foreground" {...props} />,
  li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
  a: ({ node, ...props }) => (
    <a className="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank" rel="noopener noreferrer" {...props} />
  ),
  strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
  em: ({ node, ...props }) => <em className="italic" {...props} />,
  blockquote: ({ node, ...props }) => (
    <blockquote className="mb-3 border-l-4 border-primary/30 pl-3 italic text-muted-foreground" {...props} />
  ),
  hr: ({ node, ...props }) => <hr className="my-4 border-border" {...props} />,
  img: ({ node, ...props }) => <img className="my-3 max-w-full rounded-lg border border-border" {...props} />,
  // Inline code keeps a subtle chip; block code (rendered as <pre><code>) clears
  // the chip background via the arbitrary `[&_code]` variant on <pre>.
  code: ({ node, ...props }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground" {...props} />
  ),
  pre: ({ node, ...props }) => (
    <pre
      className="mb-3 overflow-x-auto rounded-lg bg-muted p-3 text-sm [&_code]:bg-transparent [&_code]:p-0"
      {...props}
    />
  ),
  table: ({ node, ...props }) => (
    <div className="mb-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: ({ node, ...props }) => <th className="border border-border bg-muted/50 px-2 py-1 text-left font-semibold" {...props} />,
  td: ({ node, ...props }) => <td className="border border-border px-2 py-1 align-top" {...props} />,
};

// Inline / block math here uses remark-math, which only recognises $…$ and $$…$$
// spans. Questions (via MathText) additionally render *bare* LaTeX written with no
// $-delimiters at all (e.g. a note authored as `\frac{a}{b}` because the author set
// the LaTeX format toggle, the way they do for questions). When a note is explicitly
// flagged LaTeX, contains backslash commands, and carries no $ delimiter, fall back
// to MathText so the whole note renders as math — giving notes parity with questions.
// $-delimited notes (the documented form) fall through to the markdown+math pipeline
// below, which also preserves headings/lists/tables.
const MarkdownText = ({ children, className, textFormat }) => {
  const value = children == null ? '' : String(children);
  const fmt = textFormat == null ? '' : String(textFormat).toUpperCase();

  if (fmt === 'LATEX' && hasLatex(value) && !value.includes('$')) {
    return (
      <MathText as="div" className={cn('text-base text-foreground', className)} text={value} textFormat="LATEX" />
    );
  }

  return (
    <div className={cn('text-base text-foreground', className)}>
      <Markdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {value}
      </Markdown>
    </div>
  );
};

export default MarkdownText;
