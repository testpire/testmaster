import React from 'react';
import MathText, { hasMarkdownTable } from './MathText';
import MarkdownText from './MarkdownText';

// Drop-in replacement for <MathText> used to render question stems, options and
// explanations. It accepts the same props (text, textFormat, as, className).
//
// The only thing it adds: when the content contains a GitHub-flavoured-markdown
// table (e.g. a "Match List-I with List-II" two-column list), it routes through
// MarkdownText, which renders a real <table> *and* still handles $…$ math via
// KaTeX. Everything else falls through to MathText unchanged — so for every
// question authored before this existed, rendering is byte-for-byte identical.
const QuestionContent = ({ text, textFormat, as = 'span', className }) => {
  const value = text == null ? '' : String(text);

  if (hasMarkdownTable(value)) {
    // MarkdownText renders a block <div>; `as` (inline span vs div) only matters
    // for the no-table path, so it's intentionally not forwarded here.
    return (
      <MarkdownText className={className} textFormat={textFormat}>
        {value}
      </MarkdownText>
    );
  }

  return <MathText text={value} textFormat={textFormat} as={as} className={className} />;
};

export default QuestionContent;
