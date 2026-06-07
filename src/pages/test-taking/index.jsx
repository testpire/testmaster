import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import TestSecurityWrapper from '../../components/ui/TestSecurityWrapper';
import { newTestService } from '../../services/newTestService';
import { resolveImagePath } from '../test-management/testConstants';

// Student exam runner — one question at a time with a navigator palette,
// flag-for-review, a countdown that auto-submits on expiry, and per-answer
// autosave so a closed tab doesn't lose progress.
//
// The attempt payload isn't strongly typed in the API spec, so its shape is read
// defensively (questions[], answers[], timing fields all have a few aliases).
const TestTaking = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // answers: Map<questionId, number[]> (selected option ids)
  const [answers, setAnswers] = useState(new Map());
  const [flagged, setFlagged] = useState(new Set());
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

      // Establish the countdown deadline.
      const durationMin = data.durationMinutes ?? data.test?.durationMinutes ?? null;
      let remaining = data.remainingSeconds ?? data.timeRemaining ?? null;
      if (remaining == null) {
        const startedAt = data.startedAt || data.startTime || data.createdAt;
        if (startedAt && durationMin != null) {
          const endMs = new Date(startedAt).getTime() + durationMin * 60000;
          remaining = Math.round((endMs - Date.now()) / 1000);
        } else if (durationMin != null) {
          remaining = durationMin * 60;
        }
      }
      if (remaining != null) {
        remaining = Math.max(0, remaining);
        deadlineRef.current = Date.now() + remaining * 1000;
        setTimeRemaining(remaining);
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
  const isMulti = (q) =>
    (q.questionType || '').toLowerCase().includes('multi') ||
    !!q.multipleCorrect ||
    !!q.multiSelect;

  // ---- countdown --------------------------------------------------------------
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
        updated = [optionId];
      }
      next.set(qid, updated);
      // Fire-and-forget autosave so a dropped connection at submit doesn't lose work.
      newTestService.saveAnswer(attemptId, { questionId: qid, selectedOptionIds: updated });
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
          <div className="bg-card border border-border rounded-lg p-6 text-center mb-6">
            <Icon
              name={passed === false ? 'XCircle' : 'CheckCircle2'}
              size={56}
              className={`mx-auto mb-3 ${passed === false ? 'text-destructive' : 'text-green-600'}`}
            />
            <h1 className="text-2xl font-bold text-foreground mb-1">Test Submitted</h1>
            <p className="text-muted-foreground mb-4">Your responses have been recorded.</p>
            {score != null && (
              <div className="text-3xl font-bold text-foreground">
                {score}
                {totalMarks != null && <span className="text-lg text-muted-foreground"> / {totalMarks}</span>}
              </div>
            )}
            {passed != null && (
              <span
                className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium ${
                  passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {passed ? 'Passed' : 'Did not pass'}
              </span>
            )}
            <div className="mt-6">
              <Button variant="default" onClick={() => navigate('/my-tests')} iconName="ArrowLeft" iconPosition="left">
                Back to My Tests
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
                  <div key={qid} className="bg-card border border-border rounded-lg p-4">
                    <p className="text-sm font-medium text-foreground mb-2">
                      {i + 1}. {q.text}
                    </p>
                    <div className="space-y-1">
                      {(q.options || []).map((o) => {
                        const isChosen = chosen.includes(o.id);
                        const isCorrect = o.correct === true;
                        return (
                          <div
                            key={o.id}
                            className={`text-sm px-3 py-1.5 rounded border ${
                              isCorrect
                                ? 'border-green-300 bg-green-50 text-green-800'
                                : isChosen
                                ? 'border-red-300 bg-red-50 text-red-800'
                                : 'border-border text-muted-foreground'
                            }`}
                          >
                            {isCorrect && <Icon name="Check" size={13} className="inline mr-1" />}
                            {isChosen && !isCorrect && <Icon name="X" size={13} className="inline mr-1" />}
                            {o.text}
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

  const paletteState = (question, idx) => {
    const id = getQId(question);
    if (idx === current) return 'current';
    if (flagged.has(id)) return 'flagged';
    if ((answers.get(id) || []).length > 0) return 'answered';
    return 'unseen';
  };
  const paletteCls = {
    current: 'bg-primary text-primary-foreground',
    answered: 'bg-green-100 text-green-700 border border-green-300',
    flagged: 'bg-amber-100 text-amber-700 border border-amber-300',
    unseen: 'bg-muted text-muted-foreground border border-border'
  };

  return (
    <TestSecurityWrapper
      isTestActive
      testTitle={title}
      timeRemaining={timeRemaining}
      onTestSubmit={() => setShowConfirm(true)}
    >
      <div className="max-w-5xl mx-auto px-4 lg:px-6 flex flex-col lg:flex-row gap-6">
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
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Question {current + 1} of {questions.length}
                  {q.marks != null && <span className="ml-2 text-foreground">· {q.marks} marks</span>}
                </span>
                <button
                  onClick={() => toggleFlag(qid)}
                  className={`inline-flex items-center gap-1 text-sm ${
                    flagged.has(qid) ? 'text-amber-600' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon name="Flag" size={15} />
                  {flagged.has(qid) ? 'Flagged' : 'Flag'}
                </button>
              </div>

              <p className="text-foreground mb-3">{q.text}</p>
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
                        {o.text}
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

              {/* Prev / Next */}
              <div className="flex items-center justify-between mt-6">
                <Button
                  variant="outline"
                  disabled={current === 0}
                  onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                  iconName="ChevronLeft"
                  iconPosition="left"
                >
                  Previous
                </Button>
                {current < questions.length - 1 ? (
                  <Button
                    variant="default"
                    onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                    iconName="ChevronRight"
                    iconPosition="right"
                  >
                    Next
                  </Button>
                ) : (
                  <Button variant="success" onClick={() => setShowConfirm(true)} iconName="Send" iconPosition="left">
                    Submit
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Palette */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-card border border-border rounded-lg p-4 lg:sticky lg:top-24">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">Questions</span>
              <span className="text-xs text-muted-foreground">
                {answeredCount}/{questions.length} answered
              </span>
            </div>
            <div className="grid grid-cols-6 lg:grid-cols-5 gap-2">
              {questions.map((question, idx) => (
                <button
                  key={getQId(question)}
                  onClick={() => setCurrent(idx)}
                  className={`h-9 rounded-md text-sm font-medium ${paletteCls[paletteState(question, idx)]}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <Legend cls="bg-green-100 border border-green-300" label="Answered" />
              <Legend cls="bg-amber-100 border border-amber-300" label="Flagged" />
              <Legend cls="bg-muted border border-border" label="Not answered" />
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

      {/* Submit confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[1050] p-4">
          <div className="bg-card rounded-lg border border-border shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">Submit test?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You have answered <strong>{answeredCount}</strong> of{' '}
              <strong>{questions.length}</strong> questions
              {answeredCount < questions.length && ' — unanswered questions will be marked as skipped'}. You
              can't change your answers after submitting.
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

const Legend = ({ cls, label }) => (
  <div className="flex items-center gap-2">
    <span className={`inline-block w-4 h-4 rounded ${cls}`} />
    {label}
  </div>
);

export default TestTaking;
