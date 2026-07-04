import React, { useMemo } from 'react';
import Icon from '../AppIcon';
import MathText from '../MathText';
import QuestionContent from '../QuestionContent';
import { formatDateTime, resolveImagePath, isFutureIso } from '../../pages/test-management/testConstants';

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

  // Attempt-level reveal flags (new API: scoreRevealed / solutionRevealed). Prefer
  // them when present; otherwise fall back to inferring from the per-question payload
  // so older responses still render correctly.
  const scoreRevealed =
    typeof attempt.scoreRevealed === 'boolean'
      ? attempt.scoreRevealed
      : score != null || correctnessRevealed || questions.some((q) => q.marksAwarded != null);
  const solutionRevealed =
    typeof attempt.solutionRevealed === 'boolean'
      ? attempt.solutionRevealed
      : questions.some((q) => Array.isArray(q.correctOptionIds));

  // Student viewing their own attempt (staff drill-downs pass studentName). Only the
  // student sees the "pending" messaging — staff see the raw gated data as served.
  const isStudentView = !studentName;

  // Per-question outcome summary.
  const tally = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let answered = 0;
    let unanswered = 0;
    questions.forEach((q) => {
      const t = (q.questionType || '').toLowerCase();
      const numeric = t.includes('integer') || t.includes('numeric');
      const sel = q.selectedOptionIds || (q.selectedOptionId != null ? [q.selectedOptionId] : []);
      const isAnswered = numeric
        ? q.numericAnswer != null && String(q.numericAnswer).trim() !== ''
        : Array.isArray(sel) && sel.length > 0;
      if (!isAnswered) {
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
      {isStudentView && (
        <RevealNotice
          scoreRevealed={scoreRevealed}
          solutionRevealed={solutionRevealed}
          scoreRevealAt={attempt.scoreRevealAt}
          solutionRevealAt={attempt.solutionRevealAt}
        />
      )}

      {/* Summary header */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-foreground truncate">{title}</h2>
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
              <div className="font-display text-3xl font-semibold text-foreground leading-none nums-tabular">
                {fmtNum(score)}
                {maxScore != null && (
                  <span className="text-base font-medium text-muted-foreground font-sans"> / {fmtNum(maxScore)}</span>
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
                    passed ? 'bg-success/15 text-success' : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {passed ? 'Passed' : 'Did not pass'}
                </span>
              )}
              {passed == null && status && (
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  {status === 'GRADED' ? 'Graded' : status.charAt(0) + status.slice(1).toLowerCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Outcome counts — when answers are hidden, only answered/skipped are knowable. */}
        {correctnessRevealed ? (
          <div className="grid grid-cols-3 gap-2 mt-4">
            <Tally icon="CheckCircle2" className="text-success" label="Correct" value={tally.correct} />
            <Tally icon="XCircle" className="text-destructive" label="Incorrect" value={tally.incorrect} />
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

// Student-facing notice for results that aren't visible yet. A scheduled reveal has
// a future *RevealAt and shows the unlock time; an ON_PUBLISH reveal has no time and
// shows "your instructor will publish". For SOLUTIONS we only message a *scheduled*
// reveal — a null time can equally mean NEVER (the default for a graded test), so we
// stay silent rather than promise answers that may never come.
const RevealNotice = ({ scoreRevealed, solutionRevealed, scoreRevealAt, solutionRevealAt }) => {
  const notes = [];
  if (!scoreRevealed) {
    notes.push(
      isFutureIso(scoreRevealAt)
        ? `Your score will be available on ${formatDateTime(scoreRevealAt)}.`
        : 'Your score will be available once your instructor publishes results.'
    );
  }
  if (!solutionRevealed && isFutureIso(solutionRevealAt)) {
    notes.push(`The answer key will be available on ${formatDateTime(solutionRevealAt)}.`);
  }
  if (notes.length === 0) return null;
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-1.5">
      {notes.map((text, i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-foreground">
          <Icon name="Clock" size={16} className="flex-shrink-0 text-primary" />
          <span>{text}</span>
        </div>
      ))}
    </div>
  );
};

const Tally = ({ icon, className, label, value }) => (
  <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
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
  // Numeric-answer questions (INTEGER/NUMERIC/NUMERICAL) carry the student's value in
  // `numericAnswer` and the key in `correctAnswer`/`answerTolerance` — no options.
  const isNumeric = (() => {
    const t = (q.questionType || '').toLowerCase();
    return t.includes('integer') || t.includes('numeric');
  })();
  const numericGiven = q.numericAnswer;
  const numericAnswered = numericGiven != null && String(numericGiven).trim() !== '';
  const numericKeyRevealed = q.correctAnswer != null;
  const answered = isNumeric ? numericAnswered : selectedSet.size > 0;
  // Likewise, `correct: null` means correctness is withheld; only true/false are verdicts.
  const correctnessRevealed = q.correct === true || q.correct === false;
  const isCorrect = q.correct === true;
  const awarded = q.marksAwarded;
  const awardedNum = awarded == null ? null : Number(awarded);

  const statusBadge = !answered
    ? { cls: 'bg-muted text-muted-foreground', icon: 'MinusCircle', text: 'Not answered' }
    : !correctnessRevealed
    ? { cls: 'bg-muted text-muted-foreground', icon: 'CheckCircle2', text: 'Answered' }
    : isCorrect
    ? { cls: 'bg-success/15 text-success', icon: 'CheckCircle2', text: 'Correct' }
    : { cls: 'bg-destructive/10 text-destructive', icon: 'XCircle', text: 'Incorrect' };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-sm font-medium text-foreground">
          <span className="text-muted-foreground mr-1">{index + 1}.</span>
          <QuestionContent text={q.text} textFormat={q.textFormat} />
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {awardedNum != null && (
            <span
              className={`text-xs font-semibold tabular-nums ${
                awardedNum > 0 ? 'text-success' : awardedNum < 0 ? 'text-destructive' : 'text-muted-foreground'
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

      {isNumeric ? (
        <div className="space-y-1.5">
          <div
            className={`flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-lg border ${
              !numericAnswered
                ? 'border-border text-muted-foreground'
                : correctnessRevealed
                ? isCorrect
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'border-destructive/40 bg-destructive/10 text-destructive'
                : 'border-primary/40 bg-primary/5 text-foreground'
            }`}
          >
            <span className="text-[10px] uppercase tracking-wide font-semibold opacity-70">Your answer</span>
            <span className="tabular-nums font-medium">
              {numericAnswered ? fmtNum(Number(numericGiven)) : 'Not answered'}
            </span>
          </div>
          {numericKeyRevealed && (
            <div className="flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-lg border border-success/40 bg-success/10 text-success">
              <span className="text-[10px] uppercase tracking-wide font-semibold opacity-70">Correct answer</span>
              <span className="tabular-nums font-medium">
                {fmtNum(Number(q.correctAnswer))}
                {q.answerTolerance ? ` (± ${fmtNum(Number(q.answerTolerance))})` : ''}
              </span>
            </div>
          )}
        </div>
      ) : (
      <div className="space-y-1.5">
        {(q.options || []).map((o) => {
          const optCorrect = optionsRevealed && correctSet.has(o.id);
          const optSelected = selectedSet.has(o.id);
          // When the answer key is revealed: green = correct option, red = chosen but wrong.
          // When it's hidden: only highlight the student's choice neutrally, nothing as wrong.
          const cls = optCorrect
            ? 'border-success/40 bg-success/10 text-success'
            : optSelected && optionsRevealed
            ? 'border-destructive/40 bg-destructive/10 text-destructive'
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
      )}

      {/* Hints — for Daily Practice self-study. Read defensively (hints aren't yet
          part of AttemptQuestionResponseDto): renders only when the payload carries
          them and the attempt's answers are revealed, mirroring the explanation gate. */}
      {Array.isArray(q.hints) &&
        q.hints.filter((h) => h && String(h).trim()).length > 0 &&
        (optionsRevealed || correctnessRevealed) && (
          <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3.5">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Icon name="Lightbulb" size={14} className="text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Hints
              </span>
            </div>
            <ol className="space-y-1.5">
              {q.hints
                .filter((h) => h && String(h).trim())
                .map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-0.5 inline-flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-[11px] font-semibold px-1">
                      {i + 1}
                    </span>
                    <MathText text={h} textFormat={q.textFormat} />
                  </li>
                ))}
            </ol>
          </div>
        )}

      {/* Explanation — rendered from the attempt's per-question `explanation` (served
          by the backend on AttemptQuestionResponseDto). Only shown when this attempt
          reveals its answer key (mirrors the per-option reveal above), so it never
          leaks for a showAnswers=false test. Absent/empty → nothing renders. */}
      {q.explanation && String(q.explanation).trim() && (optionsRevealed || correctnessRevealed) && (
        <div className="mt-3 rounded-xl border border-warning/30 bg-warning/10 p-3.5">
          <div className="mb-1 flex items-center gap-1.5">
            <Icon name="Lightbulb" size={14} className="text-warning" />
            <span className="text-xs font-semibold uppercase tracking-wide text-warning">
              Explanation
            </span>
          </div>
          <QuestionContent
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
