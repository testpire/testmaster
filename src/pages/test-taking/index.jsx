import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import TestSecurityWrapper from '../../components/ui/TestSecurityWrapper';
import { newTestService } from '../../services/newTestService';
import { resolveImagePath } from '../test-management/testConstants';
import MathText from '../../components/MathText';

// Student exam runner — a standard online-test experience: a live countdown that
// warns as time runs low and auto-submits on expiry, subject/section switching,
// an NTA-style question palette (Not Visited / Not Answered / Answered / Marked /
// Answered & Marked), Save & Next / Mark for Review / Clear Response controls, a
// status summary, and per-answer autosave so a closed tab doesn't lose progress.
//
// The attempt payload isn't strongly typed in the API spec, so its shape is read
// defensively (questions[], answers[], timing and subject fields all have aliases).
// Subject grouping degrades gracefully: if questions carry no subject data the whole
// test renders as one section, exactly as before.
const TestTaking = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // answers: Map<questionId, number[]> (selected option ids)
  const [answers, setAnswers] = useState(new Map());
  const [flagged, setFlagged] = useState(new Set()); // "marked for review"
  const [visited, setVisited] = useState(new Set()); // questions the student has opened
  // For Daily Practice: how many of each question's hints have been revealed.
  const [hintsShown, setHintsShown] = useState({}); // Map<questionId, count>
  const [current, setCurrent] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null); // seconds

  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const deadlineRef = useRef(null); // epoch ms when the attempt must end
  const submittedRef = useRef(false); // guard against double auto/manual submit

  // ---- load attempt -----------------------------------------------------------
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await newTestService.getAttempt(attemptId);
      if (!active) return;
      if (err || !data) {
        setError(err?.message || 'Failed to load the test attempt');
        setLoading(false);
        return;
      }
      setAttempt(data);

      // Seed previously-saved answers.
      const seed = new Map();
      (data.answers || []).forEach((a) => {
        const qid = a.questionId ?? a.question?.id;
        const opts = a.selectedOptionIds || a.optionIds || (a.selectedOptionId ? [a.selectedOptionId] : []);
        if (qid != null) seed.set(qid, Array.isArray(opts) ? opts : []);
      });
      setAnswers(seed);

      // If already submitted, jump straight to the result view.
      const status = (data.status || data.attemptStatus || '').toUpperCase();
      if (status === 'SUBMITTED' || status === 'COMPLETED' || status === 'GRADED') {
        setResult(data);
        setLoading(false);
        return;
      }

      // Establish the countdown deadline. The attempt payload isn't strongly typed,
      // so try every plausible field for an explicit remaining time, then an explicit
      // end timestamp, then derive from start + duration. durationMinutes can also be
      // handed in via router state from the test list as a last-resort fallback.
      const durationMin =
        data.durationMinutes ??
        data.duration ??
        data.test?.durationMinutes ??
        data.test?.duration ??
        data.testDurationMinutes ??
        location.state?.durationMinutes ??
        null;
      let remaining =
        data.remainingSeconds ??
        data.timeRemaining ??
        data.secondsRemaining ??
        data.timeLeftSeconds ??
        data.remainingTimeSeconds ??
        null;
      if (remaining == null) {
        const endAt = data.expiresAt || data.endTime || data.endsAt || data.deadline || data.attemptEndTime;
        const startedAt = data.startedAt || data.startTime || data.startedAtTime || data.createdAt;
        if (endAt) {
          remaining = Math.round((new Date(endAt).getTime() - Date.now()) / 1000);
        } else if (startedAt && durationMin != null) {
          const endMs = new Date(startedAt).getTime() + durationMin * 60000;
          remaining = Math.round((endMs - Date.now()) / 1000);
        } else if (durationMin != null) {
          remaining = durationMin * 60;
        }
      }
      if (remaining != null && !Number.isNaN(remaining)) {
        remaining = Math.max(0, remaining);
        deadlineRef.current = Date.now() + remaining * 1000;
        setTimeRemaining(remaining);
      } else {
        // No timing info anywhere — surface what the payload *did* contain so the
        // real field name can be wired in. The exam still runs, just untimed.
        console.warn(
          '[TestTaking] No duration/remaining-time field found on attempt payload; clock hidden. Payload keys:',
          Object.keys(data || {})
        );
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const questions = useMemo(() => {
    if (!attempt) return [];
    const list = attempt.questions || attempt.test?.questions || [];
    return Array.isArray(list) ? list : [];
  }, [attempt]);

  const getQId = (q) => q.questionId ?? q.id;

  // Daily Practice (DPP) mode — passed in via router state from My Tests, and read
  // from the attempt payload as a fallback for the day the backend echoes `type`.
  // In practice mode the student can reveal per-question hints for self-study.
  const isPractice =
    String(location.state?.testType || attempt?.type || attempt?.test?.type || '').toUpperCase() ===
    'PRACTICE';

  // Hints aren't yet part of AttemptQuestionResponseDto, so read defensively: this
  // lights up automatically once the backend includes `hints` on attempt questions,
  // and renders nothing (no dead control) until then.
  const hintsOf = (q) =>
    Array.isArray(q?.hints) ? q.hints.filter((h) => h && String(h).trim()) : [];

  const revealNextHint = (id, total) =>
    setHintsShown((prev) => ({ ...prev, [id]: Math.min(total, (prev[id] || 0) + 1) }));

  const isMulti = (q) =>
    (q.questionType || '').toLowerCase().includes('multi') ||
    !!q.multipleCorrect ||
    !!q.multiSelect;

  // Best-effort subject label for a question. Falls back through the denormalized
  // names the API may attach; null means "uncategorised".
  const subjectOf = (q) =>
    q.subjectName || q.subject || q.sectionName || q.section ||
    (q.subjectId != null ? `Subject ${q.subjectId}` : null);

  // ---- subject/section grouping ----------------------------------------------
  // Ordered, de-duplicated subjects with the global question indices they contain.
  const subjects = useMemo(() => {
    const map = new Map();
    questions.forEach((q, idx) => {
      const label = subjectOf(q) || 'All Questions';
      if (!map.has(label)) map.set(label, { label, indices: [] });
      map.get(label).indices.push(idx);
    });
    return Array.from(map.values());
  }, [questions]);
  const hasSubjects = subjects.length > 1;

  const activeSubject = useMemo(
    () => subjects.find((s) => s.indices.includes(current)) || subjects[0] || { label: '', indices: [] },
    [subjects, current]
  );

  // ---- question status model (NTA-style) -------------------------------------
  const statusOf = useCallback(
    (idx) => {
      const q = questions[idx];
      if (!q) return 'notVisited';
      const id = getQId(q);
      const answered = (answers.get(id) || []).length > 0;
      const marked = flagged.has(id);
      if (answered && marked) return 'answeredMarked';
      if (marked) return 'marked';
      if (answered) return 'answered';
      if (visited.has(id)) return 'notAnswered';
      return 'notVisited';
    },
    [questions, answers, flagged, visited]
  );

  const summary = useMemo(() => {
    const counts = { answered: 0, marked: 0, answeredMarked: 0, notAnswered: 0, notVisited: 0 };
    questions.forEach((_, idx) => {
      counts[statusOf(idx)] += 1;
    });
    return counts;
  }, [questions, statusOf]);

  // Mark the current question as visited whenever it is shown.
  useEffect(() => {
    const q = questions[current];
    if (!q) return;
    const id = getQId(q);
    setVisited((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, [current, questions]);

  // ---- submit + countdown -----------------------------------------------------
  const doSubmit = useCallback(
    async (auto = false) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      setShowConfirm(false);
      const payload = Array.from(answers.entries()).map(([questionId, selectedOptionIds]) => ({
        questionId,
        selectedOptionIds
      }));
      const { data, error: err } = await newTestService.submitAttempt(attemptId, payload);
      setSubmitting(false);
      if (err) {
        submittedRef.current = false; // allow retry
        setError(err.message || 'Failed to submit. Please try again.');
        return;
      }
      setTimeRemaining(0);
      setResult(data || { submitted: true });
    },
    [answers, attemptId]
  );

  useEffect(() => {
    if (result || timeRemaining == null || deadlineRef.current == null) return;
    const tick = () => {
      const rem = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setTimeRemaining(rem);
      if (rem <= 0) doSubmit(true);
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [result, timeRemaining == null, doSubmit]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- answering --------------------------------------------------------------
  const selectOption = (q, optionId) => {
    const qid = getQId(q);
    setAnswers((prev) => {
      const next = new Map(prev);
      const cur = next.get(qid) || [];
      let updated;
      if (isMulti(q)) {
        updated = cur.includes(optionId) ? cur.filter((o) => o !== optionId) : [...cur, optionId];
      } else {
        // Single-choice: clicking the already-selected option deselects it, so a
        // student can leave a question unattempted (avoiding negative marking).
        updated = cur.includes(optionId) ? [] : [optionId];
      }
      // Drop empty entries so the answered tally and status palette stay accurate
      // (a deselected single-choice question is "not answered", not answered-blank).
      if (updated.length === 0) next.delete(qid);
      else next.set(qid, updated);
      // Fire-and-forget autosave so a dropped connection at submit doesn't lose work.
      newTestService.saveAnswer(attemptId, { questionId: qid, selectedOptionIds: updated });
      return next;
    });
  };

  const clearResponse = (q) => {
    const qid = getQId(q);
    setAnswers((prev) => {
      if (!prev.has(qid)) return prev;
      const next = new Map(prev);
      next.delete(qid);
      newTestService.saveAnswer(attemptId, { questionId: qid, selectedOptionIds: [] });
      return next;
    });
  };

  const toggleFlag = (qid) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      next.has(qid) ? next.delete(qid) : next.add(qid);
      return next;
    });
  };

  const goTo = (idx) => setCurrent(Math.min(questions.length - 1, Math.max(0, idx)));
  const goNext = () => setCurrent((c) => Math.min(questions.length - 1, c + 1));
  const isLast = current === questions.length - 1;

  const saveAndNext = () => {
    if (isLast) setShowConfirm(true);
    else goNext();
  };

  const markAndNext = (q) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      next.add(getQId(q));
      return next;
    });
    if (isLast) setShowConfirm(true);
    else goNext();
  };

  // ---- render -----------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <Icon name="AlertCircle" size={40} className="text-destructive mb-3" />
        <p className="text-foreground font-medium mb-4">{error}</p>
        <Button variant="outline" onClick={() => navigate('/my-tests')} iconName="ArrowLeft" iconPosition="left">
          Back to My Tests
        </Button>
      </div>
    );
  }

  // ---- result screen ----------------------------------------------------------
  if (result) {
    const score = result.score ?? result.marksObtained ?? result.totalScore ?? null;
    const totalMarks = result.totalMarks ?? attempt?.totalMarks ?? attempt?.test?.totalMarks ?? null;
    const passed = typeof result.passed === 'boolean' ? result.passed : null;
    const showAnswers = attempt?.showAnswers ?? attempt?.test?.showAnswers ?? false;
    const reviewQuestions = result.questions || (showAnswers ? questions : []);

    return (
      <div className="min-h-screen bg-background p-4 lg:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-8 text-center mb-6 shadow-sm">
            <div className={`mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center ${passed === false ? 'bg-destructive/10' : 'bg-success/10'}`}>
              <Icon
                name={passed === false ? 'XCircle' : 'CheckCircle2'}
                size={32}
                className={passed === false ? 'text-destructive' : 'text-success'}
              />
            </div>
            <h1 className="font-display text-3xl font-semibold text-foreground mb-1">Test submitted</h1>
            <p className="text-muted-foreground mb-4">Your responses have been recorded.</p>
            {score != null && (
              <div className="font-display text-4xl font-semibold text-foreground nums-tabular">
                {score}
                {totalMarks != null && <span className="text-lg text-muted-foreground font-sans"> / {totalMarks}</span>}
              </div>
            )}
            {passed != null && (
              <span
                className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium ${
                  passed ? 'bg-success/15 text-success' : 'bg-destructive/10 text-destructive'
                }`}
              >
                {passed ? 'Passed' : 'Did not pass'}
              </span>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button variant="default" onClick={() => navigate('/my-tests')} iconName="ArrowLeft" iconPosition="left">
                Back to My Tests
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/test-result/${attemptId}`)}
                iconName="Eye"
                iconPosition="left"
              >
                View detailed result
              </Button>
            </div>
          </div>

          {/* Optional answer review when the test allows it and correct flags are present */}
          {showAnswers && reviewQuestions.length > 0 && reviewQuestions.some((q) => (q.options || []).some((o) => 'correct' in o)) && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Review</h2>
              {reviewQuestions.map((q, i) => {
                const qid = getQId(q);
                const chosen = answers.get(qid) || [];
                return (
                  <div key={qid} className="bg-card border border-border rounded-xl p-4">
                    <p className="text-sm font-medium text-foreground mb-2">
                      {i + 1}. <MathText text={q.text} textFormat={q.textFormat} />
                    </p>
                    <div className="space-y-1">
                      {(q.options || []).map((o) => {
                        const isChosen = chosen.includes(o.id);
                        const isCorrect = o.correct === true;
                        return (
                          <div
                            key={o.id}
                            className={`text-sm px-3 py-1.5 rounded-lg border ${
                              isCorrect
                                ? 'border-success/40 bg-success/10 text-success'
                                : isChosen
                                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                                : 'border-border text-muted-foreground'
                            }`}
                          >
                            {isCorrect && <Icon name="Check" size={13} className="inline mr-1" />}
                            {isChosen && !isCorrect && <Icon name="X" size={13} className="inline mr-1" />}
                            <MathText text={o.text} textFormat={q.textFormat} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- active attempt ---------------------------------------------------------
  const q = questions[current];
  const qid = q ? getQId(q) : null;
  const chosen = qid != null ? answers.get(qid) || [] : [];
  const title = attempt?.testTitle || attempt?.title || attempt?.test?.title || 'Test';
  const answeredCount = answers.size;
  // 1-based position of the current question within its subject (for display).
  const posInSubject = activeSubject.indices.indexOf(current) + 1;

  const paletteCls = {
    current: 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1 ring-offset-card',
    answered: 'bg-success text-success-foreground',
    answeredMarked: 'bg-success text-success-foreground relative',
    marked: 'bg-warning text-warning-foreground relative',
    notAnswered: 'bg-destructive/10 text-destructive border border-destructive/30',
    notVisited: 'bg-muted text-muted-foreground border border-border'
  };

  return (
    <TestSecurityWrapper
      isTestActive
      testTitle={title}
      timeRemaining={timeRemaining}
      onTestSubmit={() => setShowConfirm(true)}
    >
      <div className="max-w-6xl mx-auto px-4 lg:px-6">
        {/* Subject / section tabs */}
        {hasSubjects && (
          <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-3">
            {subjects.map((s) => {
              const isActive = s.label === activeSubject.label;
              const ansInSub = s.indices.filter((i) => statusOf(i) === 'answered' || statusOf(i) === 'answeredMarked').length;
              return (
                <button
                  key={s.label}
                  onClick={() => goTo(s.indices[0])}
                  className={`px-4 py-2 rounded-t-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {s.label}
                  <span className={`ml-2 text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {ansInSub}/{s.indices.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Question area */}
          <div className="flex-1 min-w-0">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            {!q ? (
              <div className="text-center py-16 text-muted-foreground">This test has no questions.</div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    {hasSubjects && <span className="text-foreground">{activeSubject.label} · </span>}
                    Question {hasSubjects ? posInSubject : current + 1} of{' '}
                    {hasSubjects ? activeSubject.indices.length : questions.length}
                    {q.marks != null && <span className="ml-2 text-foreground">· {q.marks} marks</span>}
                    {isMulti(q) && (
                      <span className="ml-2 inline-block px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">
                        Multiple correct
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => toggleFlag(qid)}
                    className={`inline-flex items-center gap-1 text-sm ${
                      flagged.has(qid) ? 'text-warning font-medium' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon name="Bookmark" size={15} />
                    {flagged.has(qid) ? 'Marked for review' : 'Mark for review'}
                  </button>
                </div>

                <MathText as="p" className="text-foreground mb-3" text={q.text} textFormat={q.textFormat} />
                {q.questionImagePath && (
                  <img
                    src={resolveImagePath(q.questionImagePath)}
                    alt=""
                    className="mb-4 max-h-72 rounded border border-border"
                    onError={(e) => (e.target.style.display = 'none')}
                  />
                )}

                <div className="space-y-2">
                  {(q.options || []).map((o) => {
                    const selected = chosen.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => selectOption(q, o.id)}
                        className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg border transition-colors ${
                          selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'
                        }`}
                      >
                        <Icon
                          name={
                            isMulti(q)
                              ? selected
                                ? 'CheckSquare'
                                : 'Square'
                              : selected
                              ? 'CheckCircle2'
                              : 'Circle'
                          }
                          size={18}
                          className={selected ? 'text-primary mt-0.5' : 'text-muted-foreground mt-0.5'}
                        />
                        <span className="text-sm text-foreground">
                          <MathText text={o.text} textFormat={q.textFormat} />
                          {o.optionImagePath && (
                            <img
                              src={resolveImagePath(o.optionImagePath)}
                              alt=""
                              className="mt-2 max-h-40 rounded border border-border"
                              onError={(e) => (e.target.style.display = 'none')}
                            />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Progressive hints (Daily Practice only). Gated on hints being
                    present in the payload, so nothing renders for graded tests or
                    until the backend serves hints on the attempt. */}
                {isPractice && (() => {
                  const qHints = hintsOf(q);
                  if (qHints.length === 0) return null;
                  const shown = hintsShown[qid] || 0;
                  return (
                    <div className="mt-5 rounded-xl border border-warning/30 bg-warning/5 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-warning inline-flex items-center gap-1.5">
                          <Icon name="Lightbulb" size={15} /> Hints
                          <span className="text-xs font-normal text-muted-foreground">
                            ({shown}/{qHints.length})
                          </span>
                        </span>
                        {shown < qHints.length && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => revealNextHint(qid, qHints.length)}
                            iconName="Eye"
                            iconPosition="left"
                          >
                            {shown === 0 ? 'Show a hint' : 'Next hint'}
                          </Button>
                        )}
                      </div>
                      {shown > 0 && (
                        <ol className="mt-3 space-y-2">
                          {qHints.slice(0, shown).map((h, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                              <span className="mt-0.5 inline-flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning text-[11px] font-semibold px-1">
                                {i + 1}
                              </span>
                              <MathText text={h} textFormat={q.textFormat} />
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  );
                })()}

                {/* Action controls */}
                <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    disabled={current === 0}
                    onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                    iconName="ChevronLeft"
                    iconPosition="left"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => clearResponse(q)}
                    disabled={chosen.length === 0}
                    iconName="Eraser"
                    iconPosition="left"
                  >
                    Clear response
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    onClick={() => markAndNext(q)}
                    iconName="Bookmark"
                    iconPosition="left"
                  >
                    Mark &amp; next
                  </Button>
                  <Button
                    variant={isLast ? 'success' : 'default'}
                    onClick={saveAndNext}
                    iconName={isLast ? 'Send' : 'ChevronRight'}
                    iconPosition="right"
                  >
                    {isLast ? 'Submit' : 'Save & next'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Palette */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-3">
                <span className="font-display text-base font-semibold text-foreground">
                  {hasSubjects ? activeSubject.label : 'Questions'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {answeredCount}/{questions.length} answered
                </span>
              </div>

              {/* Status summary */}
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                <SummaryStat color="bg-success" label="Answered" count={summary.answered + summary.answeredMarked} />
                <SummaryStat color="bg-destructive/10 border border-destructive/30" label="Not answered" count={summary.notAnswered} dark />
                <SummaryStat color="bg-warning" label="Marked" count={summary.marked + summary.answeredMarked} dark />
                <SummaryStat color="bg-muted border border-border" label="Not visited" count={summary.notVisited} dark />
              </div>

              <div className="grid grid-cols-6 lg:grid-cols-5 gap-2">
                {activeSubject.indices.map((idx) => {
                  const st = idx === current ? 'current' : statusOf(idx);
                  const label = hasSubjects ? activeSubject.indices.indexOf(idx) + 1 : idx + 1;
                  return (
                    <button
                      key={getQId(questions[idx])}
                      onClick={() => goTo(idx)}
                      className={`h-9 rounded-md text-sm font-medium ${paletteCls[st]}`}
                      title={statusLabel(statusOf(idx))}
                    >
                      {label}
                      {(st === 'marked' || st === 'answeredMarked') && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-warning border-2 border-card" />
                      )}
                    </button>
                  );
                })}
              </div>

              <Button
                variant="success"
                fullWidth
                className="mt-4"
                onClick={() => setShowConfirm(true)}
                iconName="Send"
                iconPosition="left"
              >
                Submit Test
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Submit confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[1050] p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-6">
            <h3 className="font-display text-xl font-semibold text-foreground mb-3">Submit test?</h3>
            <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
              <SubmitRow label="Answered" value={summary.answered + summary.answeredMarked} />
              <SubmitRow label="Not answered" value={summary.notAnswered} />
              <SubmitRow label="Marked for review" value={summary.marked + summary.answeredMarked} />
              <SubmitRow label="Not visited" value={summary.notVisited} />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions
              {answeredCount < questions.length && ' — unanswered questions will be marked as skipped'}. You
              can&apos;t change your answers after submitting.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={submitting}>
                Keep working
              </Button>
              <Button
                variant="success"
                onClick={() => doSubmit(false)}
                disabled={submitting}
                iconName={submitting ? 'Loader2' : 'Send'}
                iconPosition="left"
                className={submitting ? 'animate-pulse' : ''}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </TestSecurityWrapper>
  );
};

const statusLabel = (st) =>
  ({
    answered: 'Answered',
    answeredMarked: 'Answered & marked for review',
    marked: 'Marked for review',
    notAnswered: 'Not answered',
    notVisited: 'Not visited'
  }[st] || '');

const SummaryStat = ({ color, label, count, dark }) => (
  <div className="flex items-center gap-2">
    <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1 rounded text-[11px] font-semibold ${color} ${dark ? 'text-foreground' : 'text-white'}`}>
      {count}
    </span>
    <span className="text-muted-foreground">{label}</span>
  </div>
);

const SubmitRow = ({ label, value }) => (
  <div className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold text-foreground">{value}</span>
  </div>
);

export default TestTaking;
