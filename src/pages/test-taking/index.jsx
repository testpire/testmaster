import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import TestSecurityWrapper from '../../components/ui/TestSecurityWrapper';
import AttemptUnavailable from '../../components/test/AttemptUnavailable';
import { newTestService } from '../../services/newTestService';
import {
  getAttemptStatus,
  isAttemptTerminal,
  isUsableAttempt,
  isTransientAttemptError,
} from '../../utils/attemptStatus';
import { resolveImagePath, formatDateTime, isFutureIso, normalizeTestType } from '../test-management/testConstants';
import MathText from '../../components/MathText';
import QuestionContent from '../../components/QuestionContent';

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
  // The URL :attemptId isn't trusted — when it's invalid or not this student's,
  // we show a clean "not available" screen and bounce to /my-tests.
  const [unavailable, setUnavailable] = useState(false);

  // answers: Map<questionId, number[]> (selected option ids) — MCQ/multi questions.
  const [answers, setAnswers] = useState(new Map());
  // numericAnswers: Map<questionId, string> — the typed value for numeric-answer
  // (INTEGER/NUMERIC/NUMERICAL) questions, which have no options to click. Kept as a
  // separate map so the option logic stays untouched; a question is only ever in one.
  const [numericAnswers, setNumericAnswers] = useState(new Map());
  const [flagged, setFlagged] = useState(new Set()); // "marked for review"
  const [visited, setVisited] = useState(new Set()); // questions the student has opened
  // For Daily Practice: how many of each question's hints have been revealed.
  const [hintsShown, setHintsShown] = useState({}); // Map<questionId, count>
  // Per-question feedback (PRACTICE + solutionReveal=DURING_ATTEMPT). Keyed by
  // questionId from the saveAnswer response (AnswerFeedbackResponseDto). Stored as the
  // answer saves, but not shown until the student commits — see `revealed`.
  const [feedback, setFeedback] = useState(new Map());
  // Questions whose feedback the student has explicitly revealed via "Check answer".
  // Applies to both self-study modes: PRACTICE and SELF_TEST hold the result behind an
  // explicit click so it never pops up mid-answer (numeric typing in particular).
  const [revealed, setRevealed] = useState(new Set());
  const [checkingId, setCheckingId] = useState(null); // qid currently being checked
  const [current, setCurrent] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null); // seconds

  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const deadlineRef = useRef(null); // epoch ms when the attempt must end
  const submittedRef = useRef(false); // guard against double auto/manual submit
  // Debounced autosave: one pending timer per questionId so rapid option changes
  // only produce a single network write (the final selection), preventing the
  // out-of-order-response race that caused "wrong option shown on reload".
  const autosaveTimers = useRef({});
  // Mirror of answers state for the debounced save closure to read at fire time.
  const answersRef = useRef(new Map());
  const numericAnswersRef = useRef(new Map());

  // ---- load attempt -----------------------------------------------------------
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await newTestService.getAttempt(attemptId);
      if (!active) return;

      // Gate all rendering on a usable payload. The backend scopes attempts to
      // the JWT user and returns HTTP 400 for a missing/unowned id (no data
      // leak), so separate a transient failure (network / 5xx — worth retrying)
      // from "not yours / doesn't exist" (a clean redirect, never the raw
      // "Attempt not found with ID: …" message).
      if (err || !isUsableAttempt(data)) {
        if (isTransientAttemptError(err)) {
          setError(err?.message || 'Something went wrong loading this test. Please try again.');
        } else {
          setUnavailable(true);
        }
        setLoading(false);
        return;
      }

      // A valid attempt that's already finished isn't takeable — send it to the
      // result page. This only fires when *loading* a terminal attempt; an
      // in-session submit shows the inline result screen via doSubmit instead.
      if (isAttemptTerminal(getAttemptStatus(data))) {
        navigate(`/test-result/${attemptId}`, { replace: true });
        return; // keep the spinner up until the route changes
      }

      setAttempt(data);

      // Seed previously-saved answers so a reload restores the student's selections.
      // The attempt payload carries each saved answer *inside its question* as
      // `selectedOptionIds` (array of option ids; null/absent = unanswered) — the
      // documented and live-verified contract. An older/alternate shape exposed a
      // flat `answers[]` array, so fold that in as a fallback without clobbering the
      // question-embedded selections. Empty selections are left out of the map so the
      // answered tally and palette stay accurate (mirrors selectOption/clearResponse).
      const seed = new Map();
      const seedAnswer = (qid, opts) => {
        if (qid == null) return;
        const arr = Array.isArray(opts) ? opts.filter((o) => o != null) : [];
        if (arr.length > 0) seed.set(qid, arr);
      };
      // Numeric answers come back as `numericAnswer` (AttemptQuestionResponseDto),
      // restored into their own map so a reload keeps the typed value.
      const seedNumeric = new Map();
      const seedNumericAnswer = (qid, val) => {
        if (qid == null || seedNumeric.has(qid)) return;
        if (val != null && String(val).trim() !== '') seedNumeric.set(qid, String(val));
      };
      const seedQuestions = data.questions || data.test?.questions || [];
      (Array.isArray(seedQuestions) ? seedQuestions : []).forEach((sq) => {
        const qid = sq.questionId ?? sq.id;
        const opts =
          sq.selectedOptionIds || sq.optionIds || (sq.selectedOptionId != null ? [sq.selectedOptionId] : []);
        seedAnswer(qid, opts);
        seedNumericAnswer(qid, sq.numericAnswer);
      });
      (data.answers || []).forEach((a) => {
        const qid = a.questionId ?? a.question?.id;
        if (qid == null) return;
        if (!seed.has(qid)) {
          seedAnswer(qid, a.selectedOptionIds || a.optionIds || (a.selectedOptionId != null ? [a.selectedOptionId] : []));
        }
        seedNumericAnswer(qid, a.numericAnswer); // question-embedded value wins (guarded inside)
      });
      setAnswers(seed);
      setNumericAnswers(seedNumeric);

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

  // When the attempt isn't available to this student, show the explanation
  // briefly, then send them back to their tests list (also reachable by button).
  useEffect(() => {
    if (!unavailable) return;
    const t = setTimeout(() => navigate('/my-tests', { replace: true }), 3000);
    return () => clearTimeout(t);
  }, [unavailable, navigate]);

  const questions = useMemo(() => {
    if (!attempt) return [];
    const list = attempt.questions || attempt.test?.questions || [];
    return Array.isArray(list) ? list : [];
  }, [attempt]);

  const getQId = (q) => q.questionId ?? q.id;

  // Test type — passed in via router state from the tests list, with the attempt
  // payload as a fallback for the day the backend echoes `type`.
  //   • PRACTICE (DPP)  — instant per-answer feedback + progressive hints.
  //   • SELF_TEST       — student-built practice: feedback on demand via "Check
  //                       answer", plus hints and question tags shown by default.
  const resolvedTestType = normalizeTestType(
    location.state?.testType || attempt?.type || attempt?.test?.type
  );
  const isPractice = resolvedTestType === 'PRACTICE';
  const isSelfTest = resolvedTestType === 'SELF_TEST';
  // Self-study affordances (hints + tags) are available in both practice modes.
  const selfStudy = isPractice || isSelfTest;

  // Hints aren't yet part of AttemptQuestionResponseDto, so read defensively: this
  // lights up automatically once the backend includes `hints` on attempt questions,
  // and renders nothing (no dead control) until then.
  const hintsOf = (q) =>
    Array.isArray(q?.hints) ? q.hints.filter((h) => h && String(h).trim()) : [];

  // Question tags (e.g. "IIT-JEE 2022", "kinematics"). The API stores them
  // comma-separated but may also send an array; normalize both. Read defensively —
  // shown for self-tests, nothing rendered when the attempt payload omits them.
  const tagsOf = (q) => {
    const raw = q?.tags;
    if (Array.isArray(raw)) return raw.map((t) => String(t).trim()).filter(Boolean);
    if (typeof raw === 'string') return raw.split(',').map((t) => t.trim()).filter(Boolean);
    return [];
  };

  const revealNextHint = (id, total) =>
    setHintsShown((prev) => ({ ...prev, [id]: Math.min(total, (prev[id] || 0) + 1) }));

  // Multiple-correct (MSQ) → checkboxes + array submit. The backend flags these with
  // `multiSelect` on the attempt question; fall back to the type spelling (MULTIPLE_CORRECT
  // / MULTI_CORRECT / MSQ) so it still renders as multi-select if the flag is ever absent.
  const isMulti = (q) =>
    !!q.multiSelect ||
    !!q.multipleCorrect ||
    /multi|msq/.test((q.questionType || '').toLowerCase());

  // Numeric-answer questions (INTEGER / NUMERIC / NUMERICAL) — the student types a
  // number instead of picking an option. 'numerical'.includes('numeric') is true,
  // so both spellings are covered.
  const isNumericQ = (q) => {
    const t = (q?.questionType || '').toLowerCase();
    return t.includes('integer') || t.includes('numeric');
  };

  // Whether question id `id` currently has a non-empty numeric answer.
  const hasNumericAnswer = (id) => {
    const v = numericAnswers.get(id);
    return v != null && String(v).trim() !== '';
  };

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
      const numeric = numericAnswers.get(id);
      const answered =
        (answers.get(id) || []).length > 0 || (numeric != null && String(numeric).trim() !== '');
      const marked = flagged.has(id);
      if (answered && marked) return 'answeredMarked';
      if (marked) return 'marked';
      if (answered) return 'answered';
      if (visited.has(id)) return 'notAnswered';
      return 'notVisited';
    },
    [questions, answers, numericAnswers, flagged, visited]
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

  // Keep answersRef current so debounced save closures always read the latest state.
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { numericAnswersRef.current = numericAnswers; }, [numericAnswers]);

  // ---- submit + countdown -----------------------------------------------------
  const doSubmit = useCallback(
    async (auto = false) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      setShowConfirm(false);
      const optionPayload = Array.from(answers.entries()).map(([questionId, selectedOptionIds]) => ({
        questionId,
        selectedOptionIds
      }));
      // Numeric answers submit as { questionId, numericAnswer } (SubmitAnswerRequestDto).
      // Drop any that don't parse to a finite number so we never send garbage.
      const numericPayload = Array.from(numericAnswers.entries())
        .map(([questionId, raw]) => {
          const n = Number(String(raw).trim());
          return Number.isFinite(n) ? { questionId, numericAnswer: n } : null;
        })
        .filter(Boolean);
      const payload = [...optionPayload, ...numericPayload];
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
    [answers, numericAnswers, attemptId]
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
  // Schedule a debounced autosave for questionId qid. If called again for the same
  // qid before the timer fires, the old timer is cancelled and a new one starts —
  // so only the *final* selection within the debounce window is ever sent to the
  // backend. This eliminates the out-of-order network race: when a student rapidly
  // changes an answer, two concurrent PUT /answers requests can complete in reverse
  // order and the stale first answer overwrites the correct second one on the server.
  // Persist question q's current answer to the backend, returning the
  // AnswerFeedbackResponseDto and whether the question is answered. Reads from refs so
  // the latest value wins at fire time. Shared by the debounced autosave and the
  // on-demand "Check answer" action.
  const persistAnswer = async (q) => {
    const qid = getQId(q);
    let body;
    let answered;
    if (isNumericQ(q)) {
      const raw = numericAnswersRef.current.get(qid);
      const trimmed = raw == null ? '' : String(raw).trim();
      const parsed = trimmed === '' ? null : Number(trimmed);
      const value = Number.isFinite(parsed) ? parsed : null;
      body = { questionId: qid, numericAnswer: value };
      answered = value != null;
    } else {
      const opts = answersRef.current.get(qid) || [];
      body = { questionId: qid, selectedOptionIds: opts };
      answered = opts.length > 0;
    }
    const { data } = await newTestService.saveAnswer(attemptId, body);
    return { data, answered };
  };

  const applyFeedback = (qid, data, answered) =>
    setFeedback((prev) => {
      const n = new Map(prev);
      if (answered && data && data.feedbackAvailable) n.set(qid, data);
      else n.delete(qid);
      return n;
    });

  // Schedule a debounced autosave for questionId qid. If called again for the same
  // qid before the timer fires, the old timer is cancelled and a new one starts —
  // so only the *final* selection within the debounce window is ever sent to the
  // backend. This eliminates the out-of-order network race: when a student rapidly
  // changes an answer, two concurrent PUT /answers requests can complete in reverse
  // order and the stale first answer overwrites the correct second one on the server.
  const scheduleAutosave = (q) => {
    const qid = getQId(q);
    clearTimeout(autosaveTimers.current[qid]);
    autosaveTimers.current[qid] = setTimeout(async () => {
      delete autosaveTimers.current[qid];
      const { data, answered } = await persistAnswer(q);
      // Store any available feedback but keep it hidden — both self-study modes hold the
      // result behind an explicit "Check answer" click (fbVisible gates on `revealed`),
      // so nothing is revealed while the student is still answering. For PRACTICE this
      // also doubles as the "is a result available to check?" signal (see showCheckButton).
      // Self-test never stores it on autosave; it re-fetches on the click instead.
      if (!isSelfTest) applyFeedback(qid, data, answered);
    }, 300);
  };

  // "Check answer" (self-study: PRACTICE + self-test): commit the current answer now
  // and reveal its feedback.
  const checkAnswer = async (q) => {
    const qid = getQId(q);
    clearTimeout(autosaveTimers.current[qid]);
    delete autosaveTimers.current[qid];
    setCheckingId(qid);
    const { data, answered } = await persistAnswer(q);
    setCheckingId((cur) => (cur === qid ? null : cur));
    applyFeedback(qid, data, answered);
    setRevealed((prev) => {
      const next = new Set(prev);
      next.add(qid);
      return next;
    });
  };

  // Drop any revealed feedback for qid — used when the student changes their answer on
  // a self-test, so stale "Check answer" results don't linger over a new selection.
  const clearCheck = (qid) => {
    setRevealed((prev) => {
      if (!prev.has(qid)) return prev;
      const next = new Set(prev);
      next.delete(qid);
      return next;
    });
    setFeedback((prev) => {
      if (!prev.has(qid)) return prev;
      const next = new Map(prev);
      next.delete(qid);
      return next;
    });
  };

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
      return next;
    });
    // Changing the answer retracts any revealed result and its stale feedback so the
    // student must re-check — for both self-study modes (PRACTICE + SELF_TEST).
    if (selfStudy) clearCheck(qid);
    scheduleAutosave(q);
  };

  // Numeric-answer input handler. Stores the raw string (empty → unanswered) and
  // debounce-saves like option selection does.
  const setNumericAnswer = (q, value) => {
    const qid = getQId(q);
    setNumericAnswers((prev) => {
      const next = new Map(prev);
      if (value == null || String(value).trim() === '') next.delete(qid);
      else next.set(qid, String(value));
      return next;
    });
    // Retract any revealed result while the student is still typing, so the answer is
    // never shown before they finish and click "Check answer" (the reported bug).
    if (selfStudy) clearCheck(qid);
    scheduleAutosave(q);
  };

  const clearResponse = (q) => {
    const qid = getQId(q);
    setAnswers((prev) => {
      if (!prev.has(qid)) return prev;
      const next = new Map(prev);
      next.delete(qid);
      return next;
    });
    setNumericAnswers((prev) => {
      if (!prev.has(qid)) return prev;
      const next = new Map(prev);
      next.delete(qid);
      return next;
    });
    setFeedback((prev) => {
      if (!prev.has(qid)) return prev;
      const next = new Map(prev);
      next.delete(qid);
      return next;
    });
    setRevealed((prev) => {
      if (!prev.has(qid)) return prev;
      const next = new Set(prev);
      next.delete(qid);
      return next;
    });
    scheduleAutosave(q);
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
  // Jump to the first question of the subject/section at index subjIdx — powers the
  // sequential prev/next-subject controls that complement the section tab strip.
  const goToSubject = (subjIdx) => {
    const target = subjects[subjIdx];
    if (target && target.indices.length) goTo(target.indices[0]);
  };
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

  if (unavailable) {
    return (
      <AttemptUnavailable
        className="min-h-screen bg-background"
        backLabel="Back to My Tests"
        onBack={() => navigate('/my-tests', { replace: true })}
      />
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
    // Score visibility follows the test's scoreReveal: the submit/attempt payload
    // carries scoreRevealed (+ score, only when revealed). Default to revealed when
    // the flag is absent (older backend / IMMEDIATE) so existing tests still show.
    const scoreRevealed = result.scoreRevealed !== false;
    const score = result.score ?? result.marksObtained ?? result.totalScore ?? null;
    const totalMarks = result.maxScore ?? result.totalMarks ?? attempt?.totalMarks ?? attempt?.test?.totalMarks ?? null;
    const passed = typeof result.passed === 'boolean' ? result.passed : null;
    const showScore = scoreRevealed && score != null;
    const pendingMsg = scoreRevealed
      ? null
      : isFutureIso(result.scoreRevealAt)
      ? `Your score will be available on ${formatDateTime(result.scoreRevealAt)}.`
      : 'Your score will be available once your instructor publishes results.';
    const headerIcon = !scoreRevealed ? 'Clock' : passed === false ? 'XCircle' : 'CheckCircle2';
    const headerTone = !scoreRevealed
      ? { bg: 'bg-primary/10', fg: 'text-primary' }
      : passed === false
      ? { bg: 'bg-destructive/10', fg: 'text-destructive' }
      : { bg: 'bg-success/10', fg: 'text-success' };

    return (
      <div className="min-h-screen bg-background p-4 lg:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-8 text-center mb-6 shadow-sm">
            <div className={`mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center ${headerTone.bg}`}>
              <Icon name={headerIcon} size={32} className={headerTone.fg} />
            </div>
            <h1 className="font-display text-3xl font-semibold text-foreground mb-1">Test submitted</h1>
            <p className="text-muted-foreground mb-4">Your responses have been recorded.</p>

            {showScore ? (
              <>
                <div className="font-display text-4xl font-semibold text-foreground nums-tabular">
                  {score}
                  {totalMarks != null && <span className="text-lg text-muted-foreground font-sans"> / {totalMarks}</span>}
                </div>
                {passed != null && (
                  <span
                    className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium ${
                      passed ? 'bg-success/15 text-success' : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    {passed ? 'Passed' : 'Did not pass'}
                  </span>
                )}
              </>
            ) : (
              <div className="mx-auto max-w-sm rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground inline-flex items-center gap-2">
                <Icon name="Clock" size={16} className="flex-shrink-0 text-primary" />
                <span>{pendingMsg}</span>
              </div>
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
        </div>
      </div>
    );
  }

  // ---- active attempt ---------------------------------------------------------
  const q = questions[current];
  const qid = q ? getQId(q) : null;
  const chosen = qid != null ? answers.get(qid) || [] : [];
  // Feedback for the current question. In both self-study modes it stays hidden until
  // the student clicks "Check answer" (revealed set) — so it never appears mid-answer.
  // `fbVisible` gates both the result panel and the option tinting.
  const fb = qid != null ? feedback.get(qid) : null;
  const fbVisible = !!fb?.feedbackAvailable && (!selfStudy || (qid != null && revealed.has(qid)));
  const fbCorrectSet = fbVisible && Array.isArray(fb.correctOptionIds) ? new Set(fb.correctOptionIds) : null;
  // Whether the current question has an answer the student could check/submit, and
  // whether they've already revealed its feedback via "Check answer".
  const currentAnswered = chosen.length > 0 || (qid != null && hasNumericAnswer(qid));
  const currentRevealed = qid != null && revealed.has(qid);
  // A result exists for this question (autosave got feedback back). Used so PRACTICE
  // only offers "Check answer" when there's actually something to reveal.
  const currentHasFeedback = qid != null && feedback.has(qid);
  // "Check answer" gate — applies to every self-study question type (numeric + choice):
  // the student commits, then sees the result. Self-test always offers it (feedback is
  // fetched on the click); PRACTICE offers it once during-attempt feedback exists, so a
  // practice test set not to reveal during the attempt shows no dead button.
  const showCheckButton = selfStudy && !currentRevealed && (isSelfTest || currentHasFeedback);
  const title = attempt?.testTitle || attempt?.title || attempt?.test?.title || 'Test';
  // A question is in exactly one of the two maps, so summing sizes never double-counts.
  const answeredCount = answers.size + numericAnswers.size;
  // 1-based position of the current question within its subject (for display).
  const posInSubject = activeSubject.indices.indexOf(current) + 1;
  // Index of the active subject in the ordered list — drives the prev/next-subject
  // controls (disabled at the ends). Labels are unique (deduped), so this is stable.
  const activeSubjectIdx = subjects.findIndex((s) => s.label === activeSubject.label);

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
        {/* Subject / section navigator — tabs to jump to any section, plus prev/next
            controls to step through them in order (industry-standard multi-section UX). */}
        {hasSubjects && (
          <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToSubject(activeSubjectIdx - 1)}
              disabled={activeSubjectIdx <= 0}
              iconName="ChevronLeft"
              title="Previous subject"
              aria-label="Previous subject"
              className="flex-shrink-0"
            />
            <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto">
              {subjects.map((s) => {
                const isActive = s.label === activeSubject.label;
                const ansInSub = s.indices.filter((i) => statusOf(i) === 'answered' || statusOf(i) === 'answeredMarked').length;
                return (
                  <button
                    key={s.label}
                    onClick={() => goTo(s.indices[0])}
                    className={`flex-shrink-0 px-4 py-2 rounded-t-md text-sm font-medium transition-colors ${
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
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToSubject(activeSubjectIdx + 1)}
              disabled={activeSubjectIdx >= subjects.length - 1}
              iconName="ChevronRight"
              title="Next subject"
              aria-label="Next subject"
              className="flex-shrink-0"
            />
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

                <QuestionContent as="p" className="text-foreground mb-3" text={q.text} textFormat={q.textFormat} />
                {q.questionImagePath && (
                  <img
                    src={resolveImagePath(q.questionImagePath)}
                    alt=""
                    className="mb-4 max-h-72 rounded border border-border"
                    onError={(e) => (e.target.style.display = 'none')}
                  />
                )}

                {/* Question tags (e.g. the exams a question appeared in). Shown by
                    default for self-tests as a study aid; hidden otherwise. */}
                {isSelfTest && tagsOf(q).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    <Icon name="Tag" size={13} className="text-muted-foreground" />
                    {tagsOf(q).map((tag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {isNumericQ(q) ? (
                  <div className="max-w-sm">
                    <label htmlFor={`numeric-answer-${qid}`} className="block text-sm font-medium text-foreground mb-2">
                      Your answer
                    </label>
                    <input
                      id={`numeric-answer-${qid}`}
                      type="number"
                      inputMode="decimal"
                      step="any"
                      autoComplete="off"
                      value={numericAnswers.get(qid) ?? ''}
                      onChange={(e) => setNumericAnswer(q, e.target.value)}
                      placeholder="Enter your answer"
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground text-lg tabular-nums outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Type a number (decimals and negatives allowed).
                    </p>
                  </div>
                ) : (
                <div className="space-y-2">
                  {(q.options || []).map((o) => {
                    const selected = chosen.includes(o.id);
                    // With instant feedback shown, tint the correct option green and a
                    // wrong picked option red (Khan/DPP style); otherwise plain selection.
                    const fbCorrect = fbCorrectSet?.has(o.id);
                    const fbWrongChosen = fbCorrectSet && selected && !fbCorrect;
                    const optionCls = fbCorrect
                      ? 'border-success/50 bg-success/10'
                      : fbWrongChosen
                      ? 'border-destructive/50 bg-destructive/10'
                      : selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/30';
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => selectOption(q, o.id)}
                        className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg border transition-colors ${optionCls}`}
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
                )}

                {/* Check answer (all self-study: PRACTICE + self-test) — the student
                    commits, then sees feedback. Hidden once revealed (the feedback panel
                    replaces it) and reappears if they change their answer. */}
                {showCheckButton && (
                  <div className="mt-4">
                    <Button
                      variant="default"
                      onClick={() => checkAnswer(q)}
                      disabled={!currentAnswered || checkingId === qid}
                      iconName={checkingId === qid ? 'Loader2' : 'CheckCircle2'}
                      iconPosition="left"
                      className={`w-full sm:w-auto ${checkingId === qid ? 'animate-pulse' : ''}`}
                    >
                      {checkingId === qid ? 'Checking…' : 'Check answer'}
                    </Button>
                    {!currentAnswered && (
                      <p className="text-xs text-muted-foreground mt-1.5">Select an answer to check it.</p>
                    )}
                  </div>
                )}

                {/* Per-answer feedback. Both self-study modes (PRACTICE with
                    solutionReveal=DURING_ATTEMPT, and SELF_TEST) hold it back until the
                    student clicks "Check answer", and it refreshes if they change answers. */}
                {fbVisible && (
                  <div
                    className={`mt-4 rounded-xl border p-4 ${
                      fb.correct ? 'border-success/40 bg-success/10' : 'border-destructive/40 bg-destructive/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        name={fb.correct ? 'CheckCircle2' : 'XCircle'}
                        size={16}
                        className={fb.correct ? 'text-success' : 'text-destructive'}
                      />
                      <span className={`text-sm font-semibold ${fb.correct ? 'text-success' : 'text-destructive'}`}>
                        {fb.correct ? 'Correct' : 'Incorrect'}
                      </span>
                      {fb.marksAwarded != null && (
                        <span className="ml-auto text-xs font-medium text-muted-foreground tabular-nums">
                          {Number(fb.marksAwarded) > 0 ? '+' : ''}
                          {fb.marksAwarded} marks
                        </span>
                      )}
                    </div>
                    {/* Numeric questions have no option to tint green — surface the
                        correct value (with tolerance) directly so the feedback is useful. */}
                    {isNumericQ(q) && fb.correctAnswer != null && (
                      <p className="mt-2 text-sm text-foreground">
                        Correct answer:{' '}
                        <span className="font-semibold tabular-nums">{fb.correctAnswer}</span>
                        {fb.answerTolerance ? ` (± ${fb.answerTolerance})` : ''}
                      </p>
                    )}
                    {fb.explanation && String(fb.explanation).trim() && (
                      <QuestionContent
                        as="div"
                        className="mt-2 text-sm text-foreground leading-relaxed whitespace-pre-wrap"
                        text={fb.explanation}
                        textFormat={fb.textFormat}
                      />
                    )}
                  </div>
                )}

                {/* Progressive hints (self-study: Daily Practice + Self-Test). Gated on
                    hints being present in the payload, so nothing renders for graded
                    tests or until the backend serves hints on the attempt. */}
                {selfStudy && (() => {
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
                    disabled={chosen.length === 0 && !hasNumericAnswer(qid)}
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
