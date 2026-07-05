import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { newTestService } from '../../services/newTestService';
import {
  formatDateTime,
  isWithinWindow,
  normalizeTestType,
  TEST_TYPE_BADGE,
  TEST_TYPE_LABEL,
  TEST_TYPE_ICON
} from '../test-management/testConstants';

// Student's view of the tests assigned to them (via their course/batch/direct
// assignment — resolved server-side). Two flavours share this page via tabs:
//   • TEST     — a graded test/exam with a limited number of attempts.
//   • PRACTICE — a Daily Practice Problem (DPP) set: unlimited attempts within the
//                window, answers revealed for self-study.
//
// State comes from AvailableTestResponseDto: { testId, type, title, description,
// totalMarks, durationMinutes, maxAttempts (null = unlimited), attemptsUsed,
// availableFrom, availableUntil, inProgressAttemptId }. The button state is derived
// purely from those canonical fields (resume an in-progress attempt, start/restart
// within the attempt budget, or block when the window/budget is exhausted).

const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'TEST', label: 'Tests' },
  { key: 'PRACTICE', label: 'Practice' },
  { key: 'SELF_TEST', label: 'Self-Test' }
];

// PRACTICE (DPP) and SELF_TEST are both self-paced: untimed, unlimited attempts, and
// started without the timed-exam "are you ready?" warning. Only graded TESTs get that.
const isSelfPaced = (type) => type === 'PRACTICE' || type === 'SELF_TEST';

const StudentTests = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startingId, setStartingId] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  // Test the student has clicked "Start" on but not yet confirmed (graded tests only).
  const [confirmTest, setConfirmTest] = useState(null);

  useEffect(() => {
    document.title = 'My Tests - TestMaster';
  }, []);

  const load = async (tab) => {
    setLoading(true);
    setError(null);
    // Use the documented ?type= filter when a specific tab is active.
    const typeParam = tab === 'ALL' ? undefined : tab;
    const { data, error: err } = await newTestService.getAvailableTests(typeParam);
    if (err) {
      setError(err.message || 'Failed to load your tests');
      setTests([]);
    } else {
      setTests(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // The available-test payload isn't strongly typed; read fields defensively.
  const getTestId = (t) => t.testId ?? t.id;
  const getType = (t) => normalizeTestType(t.type);
  const getInProgressAttemptId = (t) =>
    t.inProgressAttemptId ?? t.currentAttemptId ?? t.attempt?.id ?? null;
  const getAttemptsUsed = (t) => Number(t.attemptsUsed ?? 0) || 0;
  // maxAttempts null/undefined = unlimited (Infinity).
  const getMaxAttempts = (t) => (t.maxAttempts == null ? Infinity : Number(t.maxAttempts));
  const getAttemptsLeft = (t) => Math.max(0, getMaxAttempts(t) - getAttemptsUsed(t));

  // Begin (or restart) an attempt and jump into the runner.
  const handleStart = async (t) => {
    const testId = getTestId(t);
    setStartingId(testId);
    setError(null);
    const { data, error: err } = await newTestService.startAttempt(testId);
    setStartingId(null);
    if (err) {
      setConfirmTest(null); // close the dialog so the page-level error is visible
      setError(err.message || 'Could not start the test');
      return;
    }
    const attemptId = data?.attemptId ?? data?.id ?? data?.attempt?.id;
    if (!attemptId) {
      setConfirmTest(null);
      setError('Attempt started but no attempt id was returned.');
      return;
    }
    setConfirmTest(null);
    // Hand the runner the duration (countdown fallback) and the test type so it can
    // turn on practice affordances (progressive hints, self-study messaging).
    navigate(`/test-taking/${attemptId}`, {
      state: { durationMinutes: t.durationMinutes, testType: getType(t) }
    });
  };

  // Self-paced sets (Practice/Self-Test) start immediately — no timed-exam warning.
  // Graded tests get the "are you ready?" confirmation first.
  const beginTest = (t) => {
    if (isSelfPaced(getType(t))) handleStart(t);
    else setConfirmTest(t);
  };

  const resumeAttempt = (t, attemptId) =>
    navigate(`/test-taking/${attemptId}`, {
      state: { durationMinutes: t.durationMinutes, testType: getType(t) }
    });

  const renderState = (t) => {
    const testId = getTestId(t);
    const selfPaced = isSelfPaced(getType(t));
    const open = isWithinWindow(t.availableFrom, t.availableUntil);
    const inProgressId = getInProgressAttemptId(t);
    const attemptsUsed = getAttemptsUsed(t);
    const attemptsLeft = getAttemptsLeft(t);
    const starting = startingId === testId;

    // An unfinished attempt always takes priority — resume it.
    if (inProgressId != null) {
      return (
        <Button
          variant="default"
          size="sm"
          onClick={() => resumeAttempt(t, inProgressId)}
          iconName="Play"
          iconPosition="left"
        >
          Resume
        </Button>
      );
    }

    // Graded test with the attempt budget exhausted — nothing left to start.
    if (!selfPaced && attemptsLeft <= 0 && attemptsUsed > 0) {
      return (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
            <Icon name="CheckCircle2" size={16} /> Completed
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/my-results')}
            iconName="Eye"
            iconPosition="left"
          >
            View result
          </Button>
        </div>
      );
    }

    const label = selfPaced
      ? attemptsUsed > 0
        ? 'Practice again'
        : 'Start practice'
      : attemptsUsed > 0
      ? 'Reattempt'
      : 'Start';

    return (
      <div className="flex items-center gap-2">
        {attemptsUsed > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/my-results')}
            className="text-muted-foreground"
          >
            Results
          </Button>
        )}
        <Button
          variant="default"
          size="sm"
          disabled={!open || starting}
          onClick={() => beginTest(t)}
          iconName={starting ? 'Loader2' : 'Play'}
          iconPosition="left"
          className={starting ? 'animate-pulse' : ''}
        >
          {open ? label : 'Not Available'}
        </Button>
      </div>
    );
  };

  // Short "attempts" descriptor for the card meta row.
  const attemptsLabel = (t) => {
    const used = getAttemptsUsed(t);
    if (isSelfPaced(getType(t))) {
      return used > 0 ? `${used} attempt${used === 1 ? '' : 's'} · unlimited` : 'Unlimited attempts';
    }
    const max = t.maxAttempts;
    if (max == null) return used > 0 ? `${used} attempts` : null;
    return `Attempt ${Math.min(used + (getAttemptsLeft(t) > 0 ? 1 : 0), max)} of ${max}`;
  };

  const tabEmptyCopy =
    activeTab === 'PRACTICE'
      ? {
          title: 'No practice sets yet',
          body: 'Daily Practice Problems your teacher assigns will appear here.'
        }
      : activeTab === 'SELF_TEST'
      ? {
          title: 'No self-tests yet',
          body: 'Build your own practice test from any mix of subjects, chapters and topics.',
          action: { label: 'Build a practice test', to: '/self-test/new' }
        }
      : activeTab === 'TEST'
      ? {
          title: 'No tests assigned',
          body: 'When your teacher assigns a test, it will show up here.'
        }
      : {
          title: 'Nothing assigned yet',
          body: 'Tests and practice sets your teacher assigns will show up here.'
        };

  return (
    <PageLayout title="My Tests" activeRoute="/my-tests">
      <div className="p-4 lg:p-6 max-w-4xl mx-auto w-full">
        <div className="mb-5">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground tracking-tight">
            My tests
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Tests and daily practice assigned to you. Make sure you have a stable connection
            before starting a timed test.
          </p>
        </div>

        {/* Type tabs */}
        <div className="inline-flex rounded-xl border border-border bg-card p-1 mb-5">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Icon name="ClipboardList" size={30} className="text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">
              {tabEmptyCopy.title}
            </h3>
            <p className="text-muted-foreground text-sm">{tabEmptyCopy.body}</p>
            {tabEmptyCopy.action && (
              <Button
                variant="default"
                className="mt-5"
                onClick={() => navigate(tabEmptyCopy.action.to)}
                iconName="Sparkles"
                iconPosition="left"
              >
                {tabEmptyCopy.action.label}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {tests.map((t) => {
              const testId = getTestId(t);
              const tt = getType(t);
              const attempts = attemptsLabel(t);
              return (
                <div
                  key={testId}
                  className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-primary/30 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{t.title || `Test #${testId}`}</h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${TEST_TYPE_BADGE[tt]}`}
                      >
                        <Icon name={TEST_TYPE_ICON[tt]} size={11} />
                        {TEST_TYPE_LABEL[tt]}
                      </span>
                    </div>
                    {t.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                        {t.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      {t.durationMinutes != null && (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="Clock" size={13} /> {t.durationMinutes} min
                        </span>
                      )}
                      {(t.totalMarks ?? t.maxMarks) != null && (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="Star" size={13} /> {t.totalMarks ?? t.maxMarks} marks
                        </span>
                      )}
                      {(t.questionCount ?? t.questions?.length) != null && (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="ListChecks" size={13} /> {t.questionCount ?? t.questions.length} questions
                        </span>
                      )}
                      {attempts && (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="Repeat" size={13} /> {attempts}
                        </span>
                      )}
                      {t.availableUntil && (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="CalendarClock" size={13} /> closes {formatDateTime(t.availableUntil)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">{renderState(t)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={confirmTest != null}
        onClose={() => {
          // Don't let a backdrop/esc dismiss interrupt an in-flight start.
          if (startingId == null) setConfirmTest(null);
        }}
        size="md"
        title="Start test?"
        description={confirmTest ? (confirmTest.title || `Test #${getTestId(confirmTest)}`) : ''}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={startingId != null}
              onClick={() => setConfirmTest(null)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={startingId != null}
              onClick={() => confirmTest && handleStart(confirmTest)}
              iconName={startingId != null ? 'Loader2' : 'Play'}
              iconPosition="left"
              className={startingId != null ? 'animate-pulse' : ''}
            >
              {startingId != null ? 'Starting…' : 'Start Test'}
            </Button>
          </>
        }
      >
        {confirmTest && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3.5">
              <Icon name="WifiOff" size={20} className="mt-0.5 flex-shrink-0 text-warning" />
              <p className="text-sm text-foreground">
                Make sure you have a <strong>stable internet connection</strong> before
                you begin. A drop in connectivity during the test may cost you time or answers.
              </p>
            </div>

            <p className="text-sm text-foreground">
              Once you start, please keep the following in mind:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Icon name="Clock" size={16} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
                <span>
                  The timer starts immediately
                  {confirmTest.durationMinutes != null
                    ? ` — you'll have ${confirmTest.durationMinutes} minutes`
                    : ''}{' '}
                  and will not pause.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="RefreshCw" size={16} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
                <span>Do not refresh or close the tab while the test is in progress.</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="Monitor" size={16} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
                <span>Stay on a single device and avoid switching apps or windows.</span>
              </li>
            </ul>
          </div>
        )}
      </Modal>
    </PageLayout>
  );
};

export default StudentTests;
