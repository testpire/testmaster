import React, { useMemo } from 'react';
import Icon from '../AppIcon';
import MathText from '../MathText';
import { formatDateTime, resolveImagePath } from '../../pages/test-management/testConstants';

// Shared, presentational breakdown of a single GRADED test attempt. Used by both
// the student's result view (their own attempt) and staff drilling into a
// student's attempt — so it takes the already-fetched `attempt` object and renders
// no data of its own.
//
// Expected shape (GET /student/tests/attempts/{id}, and the staff equivalent):
//   { attemptId, testId, testTitle, status, attemptNumber, startedAt, submittedAt,
//     score, maxScore, passed,
//     questions: [{ questionId, text, questionImagePath, questionType, marks,
//       options: [{ id, text, optionImagePath }],
//       selectedOptionIds: [], correctOptionIds: [], correct, marksAwarded }] }
//
// Correctness here comes from the per-question `correctOptionIds` / `selectedOptionIds`
// arrays (the option objects themselves carry no `correct` flag), which is why this
// can't reuse the test-taking review block.

// Trim trailing zeros from the backend's fixed-decimal numbers (3.00 -> 3, 2.50 -> 2.5).
const fmtNum = (n) => {
  if (n == null || Number.isNaN(Number(n))) return null;
  return Number(n)
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1');
};

const AttemptReview = ({ attempt, studentName }) => {
  const questions = useMemo(
    () => (Array.isArray(attempt?.questions) ? attempt.questions : []),
    [attempt]
  );

  if (!attempt) return null;

  const score = attempt.score ?? attempt.marksObtained ?? null;
  const maxScore = attempt.maxScore ?? attempt.totalMarks ?? null;
  const passed = typeof attempt.passed === 'boolean' ? attempt.passed : null;
  const status = (attempt.status || attempt.attemptStatus || '').toUpperCase();
  const title = attempt.testTitle || attempt.title || 'Test';

  const pct =
    score != null && maxScore != null && Number(maxScore) > 0
      ? (Number(score) / Number(maxScore)) * 100
      : null;

  // Whether the backend revealed per-question correctness for this attempt. When a
  // test hides answers, it returns `correct`/`correctOptionIds`/`marksAwarded` as null,
  // so we must not infer "incorrect" from their absence.
  const correctnessRevealed = useMemo(
    () => questions.some((q) => q.correct === true || q.correct === false),
    [questions]
  );

  // Per-question outcome summary.
  const tally = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let answered = 0;
    let unanswered = 0;
    questions.forEach((q) => {
      const sel = q.selectedOptionIds || (q.selectedOptionId != null ? [q.selectedOptionId] : []);
      if (!Array.isArray(sel) || sel.length === 0) {
        unanswered += 1;
        return;
      }
      answered += 1;
      if (q.correct === true) correct += 1;
      else if (q.correct === false) incorrect += 1;
    });
    return { correct, incorrect, answered, unanswered };
  }, [questions]);

  return (
    <div className="space-y-5">
      {/* Summary header */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">{title}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
              {studentName && (
                <span className="inline-flex items-center gap-1">
                  <Icon name="User" size={13} /> {studentName}
                </span>
              )}
              {attempt.attemptNumber != null && (
                <span className="inline-flex items-center gap-1">
                  <Icon name="Hash" size={13} /> Attempt {attempt.attemptNumber}
                </span>
              )}
              {attempt.submittedAt && (
                <span className="inline-flex items-center gap-1">
                  <Icon name="CalendarCheck" size={13} /> Submitted {formatDateTime(attempt.submittedAt)}
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            {score != null && (
              <div className="text-2xl font-bold text-foreground leading-none">
                {fmtNum(score)}
                {maxScore != null && (
                  <span className="text-base font-medium text-muted-foreground"> / {fmtNum(maxScore)}</span>
                )}
              </div>
            )}
            <div className="mt-1.5 flex items-center justify-end gap-2">
              {pct != null && (
                <span className="text-xs font-medium text-muted-foreground">{pct.toFixed(0)}%</span>
              )}
              {passed != null && (
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {passed ? 'Passed' : 'Did not pass'}
                </span>
              )}
              {passed == null && status && (
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  {status === 'GRADED' ? 'Graded' : status.charAt(0) + status.slice(1).toLowerCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Outcome counts — when answers are hidden, only answered/skipped are knowable. */}
        {correctnessRevealed ? (
          <div className="grid grid-cols-3 gap-2 mt-4">
            <Tally icon="CheckCircle2" className="text-green-700" label="Correct" value={tally.correct} />
            <Tally icon="XCircle" className="text-red-600" label="Incorrect" value={tally.incorrect} />
            <Tally icon="MinusCircle" className="text-muted-foreground" label="Skipped" value={tally.unanswered} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Tally icon="CheckCircle2" className="text-foreground" label="Answered" value={tally.answered} />
            <Tally icon="MinusCircle" className="text-muted-foreground" label="Skipped" value={tally.unanswered} />
          </div>
        )}
      </div>

      {/* Per-question breakdown */}
      {questions.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
          No question-level detail is available for this attempt.
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <QuestionCard key={q.questionId ?? q.id ?? i} q={q} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

const Tally = ({ icon, className, label, value }) => (
  <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
    <Icon name={icon} size={18} className={className} />
    <div className="leading-tight">
      <div className="text-sm font-semibold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  </div>
);

const QuestionCard = ({ q, index }) => {
  const selectedSet = new Set(
    q.selectedOptionIds || (q.selectedOptionId != null ? [q.selectedOptionId] : [])
  );
  // `correctOptionIds: null` means the backend is hiding the answer key for this test —
  // don't reveal which options are correct, and don't mark the student's choice wrong.
  const optionsRevealed = Array.isArray(q.correctOptionIds);
  const correctSet = new Set(q.correctOptionIds || []);
  const answered = selectedSet.size > 0;
  // Likewise, `correct: null` means correctness is withheld; only true/false are verdicts.
  const correctnessRevealed = q.correct === true || q.correct === false;
  const isCorrect = q.correct === true;
  const awarded = q.marksAwarded;
  const awardedNum = awarded == null ? null : Number(awarded);

  const statusBadge = !answered
    ? { cls: 'bg-slate-100 text-slate-600', icon: 'MinusCircle', text: 'Not answered' }
    : !correctnessRevealed
    ? { cls: 'bg-slate-100 text-slate-600', icon: 'CheckCircle2', text: 'Answered' }
    : isCorrect
    ? { cls: 'bg-green-100 text-green-700', icon: 'CheckCircle2', text: 'Correct' }
    : { cls: 'bg-red-100 text-red-700', icon: 'XCircle', text: 'Incorrect' };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm font-medium text-foreground">
          <span className="text-muted-foreground mr-1">{index + 1}.</span>
          <MathText text={q.text} textFormat={q.textFormat} />
        </p>
        <div className="flex flex-shrink-0 items-center gap-2">
          {awardedNum != null && (
            <span
              className={`text-xs font-semibold tabular-nums ${
                awardedNum > 0 ? 'text-green-700' : awardedNum < 0 ? 'text-red-600' : 'text-muted-foreground'
              }`}
            >
              {awardedNum > 0 ? '+' : ''}
              {fmtNum(awardedNum)}
              {q.marks != null && <span className="text-muted-foreground"> / {fmtNum(q.marks)}</span>}
            </span>
          )}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.cls}`}>
            <Icon name={statusBadge.icon} size={12} />
            {statusBadge.text}
          </span>
        </div>
      </div>

      {q.questionImagePath && (
        <img
          src={resolveImagePath(q.questionImagePath)}
          alt=""
          className="mb-3 max-h-64 rounded border border-border"
          onError={(e) => (e.target.style.display = 'none')}
        />
      )}

      <div className="space-y-1.5">
        {(q.options || []).map((o) => {
          const optCorrect = optionsRevealed && correctSet.has(o.id);
          const optSelected = selectedSet.has(o.id);
          // When the answer key is revealed: green = correct option, red = chosen but wrong.
          // When it's hidden: only highlight the student's choice neutrally, nothing as wrong.
          const cls = optCorrect
            ? 'border-green-300 bg-green-50 text-green-800'
            : optSelected && optionsRevealed
            ? 'border-red-300 bg-red-50 text-red-800'
            : optSelected
            ? 'border-primary/40 bg-primary/5 text-foreground'
            : 'border-border text-muted-foreground';
          return (
            <div key={o.id} className={`flex items-start gap-2 text-sm px-3 py-2 rounded-lg border ${cls}`}>
              <Icon
                name={optCorrect ? 'Check' : optSelected && optionsRevealed ? 'X' : optSelected ? 'Dot' : 'Circle'}
                size={15}
                className="mt-0.5 flex-shrink-0"
              />
              <span className="flex-1">
                <MathText text={o.text} textFormat={q.textFormat} />
                {o.optionImagePath && (
                  <img
                    src={resolveImagePath(o.optionImagePath)}
                    alt=""
                    className="mt-2 max-h-36 rounded border border-border"
                    onError={(e) => (e.target.style.display = 'none')}
                  />
                )}
              </span>
              {optSelected && (
                <span className="flex-shrink-0 text-[10px] uppercase tracking-wide font-semibold opacity-70 mt-0.5">
                  Your answer
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Explanation — rendered from the attempt's per-question `explanation` (served
          by the backend on AttemptQuestionResponseDto). Only shown when this attempt
          reveals its answer key (mirrors the per-option reveal above), so it never
          leaks for a showAnswers=false test. Absent/empty → nothing renders. */}
      {q.explanation && String(q.explanation).trim() && (optionsRevealed || correctnessRevealed) && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <Icon name="Lightbulb" size={14} className="text-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Explanation
            </span>
          </div>
          <MathText
            as="div"
            className="text-sm text-foreground leading-relaxed whitespace-pre-wrap"
            text={q.explanation}
            textFormat={q.textFormat}
          />
        </div>
      )}
    </div>
  );
};

export default AttemptReview;
