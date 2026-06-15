// Builds a printable, LaTeX-aware "question paper" for a test and drives the
// browser's print dialog (→ "Save as PDF") to produce an offline test sheet.
//
// Why print-to-PDF instead of a bundled PDF library: math is rendered with the
// app's existing KaTeX (vector, crisp), and by rendering INTO the current
// document we reuse the already-loaded KaTeX CSS + fonts. A separate popup or a
// rasterizing library (jsPDF/html2canvas) would either lose those fonts or turn
// the math into a blurry bitmap. The trade-off is the user goes through the
// browser's print dialog rather than getting an instant file download.
//
// The paper deliberately contains NO answers — it's the sheet a student writes
// on for an offline test.

import katex from 'katex';
import 'katex/dist/katex.min.css';
import { hasLatex } from '../components/MathText';
import { resolveImagePath } from '../pages/test-management/testConstants';

// Same delimiters MathText uses: $$...$$ (block) matched before $...$ (inline).
const MATH_PATTERN = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

const PRINT_CONTAINER_ID = '__test_paper_print';
const PRINT_STYLE_ID = '__test_paper_print_style';

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderMath = (expr, displayMode) => {
  try {
    return katex.renderToString(expr, { displayMode, throwOnError: false, output: 'html' });
  } catch {
    return null; // fall back to the raw source below
  }
};

// Turn a (possibly LaTeX-bearing) string into an HTML fragment. Mirrors the logic
// in MathText: prose is HTML-escaped, math chunks are rendered with KaTeX. An
// explicit PLAIN format (or text with no LaTeX at all) is treated verbatim.
const renderRichText = (text, textFormat) => {
  const value = text == null ? '' : String(text);
  const fmt = textFormat == null ? '' : String(textFormat).toUpperCase();
  if (fmt === 'PLAIN' || !hasLatex(value)) return escapeHtml(value);

  // Bare LaTeX with no $...$ delimiters (e.g. an option stored as "\frac{i}{psq}"):
  // hasLatex() is true via the backslash-command branch, but MATH_PATTERN below
  // only extracts $-delimited spans. Mirrors MathText: render the whole string as
  // one inline expression, falling back to the escaped source if katex can't parse it.
  MATH_PATTERN.lastIndex = 0;
  if (!MATH_PATTERN.test(value)) {
    const html = renderMath(value, false);
    return html || escapeHtml(value);
  }

  let out = '';
  let lastIndex = 0;
  let match;
  MATH_PATTERN.lastIndex = 0;
  while ((match = MATH_PATTERN.exec(value)) !== null) {
    if (match.index > lastIndex) out += escapeHtml(value.slice(lastIndex, match.index));
    const isBlock = match[1] != null;
    const expr = isBlock ? match[1] : match[2];
    const html = renderMath(expr, isBlock);
    if (html) {
      out += isBlock
        ? `<span class="tp-block-math">${html}</span>`
        : html;
    } else {
      out += escapeHtml(match[0]); // render failed — show the source, don't vanish it
    }
    lastIndex = MATH_PATTERN.lastIndex;
  }
  if (lastIndex < value.length) out += escapeHtml(value.slice(lastIndex));
  return out;
};

const optionLabel = (i) => String.fromCharCode(65 + i); // 0 -> A

const buildQuestionHtml = (q, number) => {
  const fmt = q.textFormat || (String(q.questionType || '').toUpperCase() === 'LATEX' ? 'LATEX' : undefined);
  const marks = Number(q.marks);
  const marksLabel = Number.isFinite(marks) && marks > 0
    ? `<span class="tp-marks">[${marks} mark${marks === 1 ? '' : 's'}]</span>`
    : '';

  const imgSrc = q.questionImagePath ? resolveImagePath(q.questionImagePath) : '';
  const imgHtml = imgSrc
    ? `<div class="tp-img-wrap"><img src="${escapeHtml(imgSrc)}" alt="" class="tp-img" /></div>`
    : '';

  const options = Array.isArray(q.options) ? q.options : [];
  let bodyHtml;
  if (options.length > 0) {
    const items = options
      .map((opt, i) => {
        const optImg = opt?.optionImagePath ? resolveImagePath(opt.optionImagePath) : '';
        const optImgHtml = optImg
          ? `<div class="tp-img-wrap"><img src="${escapeHtml(optImg)}" alt="" class="tp-opt-img" /></div>`
          : '';
        return `<li class="tp-option"><span class="tp-opt-label">(${optionLabel(i)})</span>` +
          `<span class="tp-opt-text">${renderRichText(opt?.text, opt?.textFormat ?? q.textFormat)}${optImgHtml}</span></li>`;
      })
      .join('');
    bodyHtml = `<ol class="tp-options">${items}</ol>`;
  } else {
    // Non-MCQ (numerical / subjective): give blank space to write the answer.
    bodyHtml = '<div class="tp-answer-space"></div>';
  }

  return (
    `<li class="tp-question">` +
      `<div class="tp-q-head">` +
        // marks floats right, so it must precede the text in source order for the
        // text to wrap to its left rather than drop below it.
        marksLabel +
        `<span class="tp-q-num">${number}.</span>` +
        `<span class="tp-q-text">${renderRichText(q.text, fmt)}</span>` +
      `</div>` +
      imgHtml +
      bodyHtml +
    `</li>`
  );
};

const buildPaperHtml = (test, questions) => {
  const title = escapeHtml(test?.title || 'Test Paper');
  const description = test?.description ? escapeHtml(test.description) : '';
  const totalMarks = test?.totalMarks != null ? test.totalMarks : null;
  const duration = test?.durationMinutes != null ? test.durationMinutes : null;
  const count = questions.length;

  const metaBits = [];
  metaBits.push(`<span><strong>Questions:</strong> ${count}</span>`);
  if (totalMarks != null) metaBits.push(`<span><strong>Maximum Marks:</strong> ${escapeHtml(totalMarks)}</span>`);
  if (duration != null) metaBits.push(`<span><strong>Time Allowed:</strong> ${escapeHtml(duration)} min</span>`);

  const questionsHtml = questions.map((q, i) => buildQuestionHtml(q, i + 1)).join('');

  return (
    `<div class="tp-header">` +
      `<h1 class="tp-title">${title}</h1>` +
      (description ? `<p class="tp-desc">${description}</p>` : '') +
      `<div class="tp-meta">${metaBits.join('')}</div>` +
      `<hr class="tp-rule" />` +
    `</div>` +
    `<ol class="tp-questions">${questionsHtml}</ol>`
  );
};

// Stylesheet scoped to the print container; @media print also hides the rest of
// the app so only the paper appears on the page.
const PRINT_CSS = `
#${PRINT_CONTAINER_ID} { display: none; }
@media screen { #${PRINT_CONTAINER_ID} { display: none !important; } }
@media print {
  html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
  body > *:not(#${PRINT_CONTAINER_ID}) { display: none !important; }
  #${PRINT_CONTAINER_ID} { display: block !important; }
  @page { size: A4; margin: 18mm 16mm; }
}
#${PRINT_CONTAINER_ID} {
  color: #000; background: #fff;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 12pt; line-height: 1.5;
}
#${PRINT_CONTAINER_ID} .tp-header { text-align: center; margin-bottom: 10pt; }
#${PRINT_CONTAINER_ID} .tp-title { font-size: 18pt; font-weight: 700; margin: 0 0 4pt; }
#${PRINT_CONTAINER_ID} .tp-desc { font-size: 11pt; font-style: italic; margin: 0 0 6pt; }
#${PRINT_CONTAINER_ID} .tp-meta { display: flex; justify-content: center; gap: 18pt; flex-wrap: wrap; font-size: 11pt; }
#${PRINT_CONTAINER_ID} .tp-rule { border: 0; border-top: 1.5pt solid #000; margin: 8pt 0 0; }
#${PRINT_CONTAINER_ID} .tp-questions { list-style: none; counter-reset: none; margin: 0; padding: 0; }
#${PRINT_CONTAINER_ID} .tp-question { margin: 0 0 14pt; padding: 0; page-break-inside: avoid; break-inside: avoid; }
#${PRINT_CONTAINER_ID} .tp-q-head { display: block; }
#${PRINT_CONTAINER_ID} .tp-q-num { font-weight: 700; margin-right: 6pt; }
#${PRINT_CONTAINER_ID} .tp-q-text { }
#${PRINT_CONTAINER_ID} .tp-marks { float: right; font-weight: 700; white-space: nowrap; margin-left: 8pt; }
#${PRINT_CONTAINER_ID} .tp-block-math { display: block; text-align: center; margin: 6pt 0; }
#${PRINT_CONTAINER_ID} .tp-options { list-style: none; margin: 6pt 0 0; padding: 0 0 0 18pt; }
#${PRINT_CONTAINER_ID} .tp-option { display: flex; align-items: baseline; gap: 6pt; margin: 0 0 3pt; page-break-inside: avoid; }
#${PRINT_CONTAINER_ID} .tp-opt-label { font-weight: 700; }
#${PRINT_CONTAINER_ID} .tp-opt-text { flex: 1; }
#${PRINT_CONTAINER_ID} .tp-answer-space { height: 60pt; border-bottom: 1pt dotted #999; margin: 6pt 18pt 0; }
#${PRINT_CONTAINER_ID} .tp-img-wrap { margin: 6pt 0; }
#${PRINT_CONTAINER_ID} .tp-img { max-width: 100%; max-height: 70mm; }
#${PRINT_CONTAINER_ID} .tp-opt-img { max-width: 100%; max-height: 40mm; }
`;

// Wait for the paper's images to load (so they aren't blank in the PDF), with a
// hard cap so a slow/broken image can't block printing forever.
const waitForImages = (root, timeoutMs = 4000) => {
  const imgs = Array.from(root.querySelectorAll('img'));
  if (imgs.length === 0) return Promise.resolve();
  const pending = imgs
    .filter((img) => !img.complete)
    .map(
      (img) =>
        new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        })
    );
  if (pending.length === 0) return Promise.resolve();
  return Promise.race([
    Promise.all(pending),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
};

/**
 * Render `test` + its `questions` into a hidden print region and open the
 * browser's print dialog so the user can "Save as PDF". Cleans up afterwards.
 *
 * @param {object} test       Test metadata (title, description, totalMarks, durationMinutes).
 * @param {Array}  questions  Ordered questions, each with { text, textFormat, questionType,
 *                            marks, questionImagePath, options:[{ text, textFormat, optionImagePath }] }.
 */
export const printTestPaper = async (test, questions) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Clear any leftover region from a previous run.
  document.getElementById(PRINT_CONTAINER_ID)?.remove();
  document.getElementById(PRINT_STYLE_ID)?.remove();

  const style = document.createElement('style');
  style.id = PRINT_STYLE_ID;
  style.textContent = PRINT_CSS;
  document.head.appendChild(style);

  const container = document.createElement('div');
  container.id = PRINT_CONTAINER_ID;
  container.innerHTML = buildPaperHtml(test, Array.isArray(questions) ? questions : []);
  document.body.appendChild(container);

  const cleanup = () => {
    container.remove();
    style.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);

  try {
    await waitForImages(container);
    window.print();
  } finally {
    // afterprint is unreliable across browsers / when the dialog is cancelled;
    // remove on a delay as a backstop so the hidden region never lingers.
    setTimeout(cleanup, 1000);
  }
};
