import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { newTestService } from '../../../services/newTestService';
import {
  formatDateTime,
  isWithinWindow,
  normalizeTestType,
  TEST_TYPE_BADGE,
  TEST_TYPE_LABEL,
  TEST_TYPE_ICON
} from '../../test-management/testConstants';

// Prominent "Assigned Tests" panel for the student dashboard. Surfaces the tests
// a student needs to take right after login (they no longer have to discover the
// "My Tests" nav link). Shows the next few tests with Start / Resume / Completed
// states; the full list lives at /my-tests.
//
// Data can be supplied by the parent (the dashboard fetches /student/tests/available
// once and shares it with the stat cards) via the `tests` / `loading` / `error`
// props; when `tests` is undefined the widget self-fetches so it still works
// standalone. The available-test payload isn't strongly typed by the API, so every
// field is read defensively with a few aliases — mirrors src/pages/student-tests.
const MAX_VISIBLE = 4;

const getTestId = (t) => t.testId ?? t.id;
const getType = (t) => normalizeTestType(t.type);
const getInProgressAttemptId = (t) =>
  t.inProgressAttemptId ?? t.currentAttemptId ?? t.attempt?.id ?? null;
const getAttemptsUsed = (t) => Number(t.attemptsUsed ?? 0) || 0;
const getMaxAttempts = (t) => (t.maxAttempts == null ? Infinity : Number(t.maxAttempts));
const getAttemptsLeft = (t) => Math.max(0, getMaxAttempts(t) - getAttemptsUsed(t));

const AssignedTestsWidget = ({ tests: testsProp, loading: loadingProp, error: errorProp }) => {
  const navigate = useNavigate();
  const controlled = testsProp !== undefined;

  const [testsState, setTestsState] = useState([]);
  const [loadingState, setLoadingState] = useState(true);
  const [errorState, setErrorState] = useState(null);
  const [startingId, setStartingId] = useState(null);

  const rawTests = controlled ? testsProp : testsState;
  // The dashboard shares its unfiltered /available feed. Self-tests aren't "assigned"
  // — they're student-built practice — so keep them out of this panel; they live on
  // the dedicated Self-Test page.
  const tests = (Array.isArray(rawTests) ? rawTests : []).filter((t) => getType(t) !== 'SELF_TEST');
  const loading = controlled ? !!loadingProp : loadingState;
  const error = controlled ? errorProp : errorState;

  useEffect(() => {
    if (controlled) return undefined;
    let mounted = true;
    (async () => {
      const { data, error: err } = await newTestService.getAvailableTests();
      if (!mounted) return;
      if (err) {
        setErrorState(err.message || 'Unable to load your tests right now.');
        setTestsState([]);
      } else {
        setTestsState(Array.isArray(data) ? data : []);
      }
      setLoadingState(false);
    })();
    return () => {
      mounted = false;
    };
  }, [controlled]);

  const handleStart = async (t) => {
    const testId = getTestId(t);
    setStartingId(testId);
    const { data, error: err } = await newTestService.startAttempt(testId);
    setStartingId(null);
    if (err) return;
    const attemptId = data?.attemptId ?? data?.id ?? data?.attempt?.id;
    if (!attemptId) return;
    navigate(`/test-taking/${attemptId}`, {
      state: { durationMinutes: t.durationMinutes, testType: getType(t) }
    });
  };

  const renderAction = (t) => {
    const testId = getTestId(t);
    const isPractice = getType(t) === 'PRACTICE';
    const open = isWithinWindow(t.availableFrom, t.availableUntil);
    const inProgressId = getInProgressAttemptId(t);
    const attemptsUsed = getAttemptsUsed(t);
    const attemptsLeft = getAttemptsLeft(t);

    // Resume an unfinished attempt.
    if (inProgressId != null) {
      return (
        <Button
          variant="default"
          size="sm"
          className="flex-shrink-0"
          onClick={() =>
            navigate(`/test-taking/${inProgressId}`, {
              state: { durationMinutes: t.durationMinutes, testType: getType(t) }
            })
          }
          iconName="Play"
          iconPosition="left"
        >
          Resume
        </Button>
      );
    }

    // Graded test with no attempts left — done.
    if (!isPractice && attemptsUsed > 0 && attemptsLeft <= 0) {
      return (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-success flex-shrink-0">
          <Icon name="CheckCircle2" size={16} /> Done
        </span>
      );
    }

    const label = isPractice
      ? attemptsUsed > 0
        ? 'Practice'
        : 'Start'
      : attemptsUsed > 0
      ? 'Reattempt'
      : 'Start';

    return (
      <Button
        variant="default"
        size="sm"
        className={`flex-shrink-0 ${startingId === testId ? 'animate-pulse' : ''}`}
        disabled={!open || startingId === testId}
        onClick={() => handleStart(t)}
        iconName={startingId === testId ? 'Loader2' : 'Play'}
        iconPosition="left"
      >
        {open ? label : 'Not Open'}
      </Button>
    );
  };

  const visible = tests.slice(0, MAX_VISIBLE);

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Icon name="ClipboardList" size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold text-foreground leading-tight">Assigned tests</h3>
            <p className="text-xs text-muted-foreground">Your next steps</p>
          </div>
          {!loading && !error && tests.length > 0 && (
            <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary nums-tabular">
              {tests.length}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/my-tests')}
          className="text-sm font-medium text-primary hover:underline underline-offset-4"
        >
          View all
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary/30 border-t-primary" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Icon name="AlertCircle" size={16} className="text-warning" />
          <span>{error}</span>
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-10">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
            <Icon name="ClipboardCheck" size={26} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            No tests assigned yet. They'll appear here the moment your teacher sets one.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((t) => {
            const testId = getTestId(t);
            return (
              <div
                key={testId}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-border bg-background/40 hover:bg-muted/40 hover:border-primary/30 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h4 className="font-semibold text-foreground truncate">
                      {t.title || `Test #${testId}`}
                    </h4>
                    {(() => {
                      const tt = getType(t);
                      return (
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${TEST_TYPE_BADGE[tt]}`}
                          title={TEST_TYPE_LABEL[tt]}
                        >
                          <Icon name={TEST_TYPE_ICON[tt]} size={10} />
                          {TEST_TYPE_LABEL[tt]}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                    {t.durationMinutes != null && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="Clock" size={12} /> {t.durationMinutes} min
                      </span>
                    )}
                    {(t.totalMarks ?? t.maxMarks) != null && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="Star" size={12} /> {t.totalMarks ?? t.maxMarks} marks
                      </span>
                    )}
                    {(t.questionCount ?? t.questions?.length) != null && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="ListChecks" size={12} />{' '}
                        {t.questionCount ?? t.questions.length} questions
                      </span>
                    )}
                    {t.availableUntil && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="CalendarClock" size={12} /> closes{' '}
                        {formatDateTime(t.availableUntil)}
                      </span>
                    )}
                  </div>
                </div>
                {renderAction(t)}
              </div>
            );
          })}
          {tests.length > MAX_VISIBLE && (
            <button
              onClick={() => navigate('/my-tests')}
              className="w-full text-center text-sm font-medium text-primary hover:underline underline-offset-4 pt-1"
            >
              + {tests.length - MAX_VISIBLE} more
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AssignedTestsWidget;
