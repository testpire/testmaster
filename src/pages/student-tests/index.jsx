import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { newTestService } from '../../services/newTestService';
import { formatDateTime, isWithinWindow } from '../test-management/testConstants';

// Student's view of the tests assigned to them (via their course/batch/direct
// assignment — resolved server-side). They can start a new attempt or resume an
// in-progress one, and see the score of completed attempts.
const StudentTests = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startingId, setStartingId] = useState(null);
  // Test the student has clicked "Start" on but not yet confirmed.
  const [confirmTest, setConfirmTest] = useState(null);

  useEffect(() => {
    document.title = 'My Tests - TestMaster';
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await newTestService.getAvailableTests();
    if (err) {
      setError(err.message || 'Failed to load your tests');
      setTests([]);
    } else {
      setTests(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // The available-test payload isn't strongly typed; read fields defensively.
  const getTestId = (t) => t.testId ?? t.id;
  const getAttemptId = (t) => t.attemptId ?? t.currentAttemptId ?? t.attempt?.id ?? null;
  const getAttemptStatus = (t) =>
    (t.attemptStatus || t.status || t.attempt?.status || '').toUpperCase();
  const getScore = (t) => t.score ?? t.marksObtained ?? t.lastScore ?? t.attempt?.score ?? null;

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
    // Hand the known duration to the runner as a fallback for the countdown clock,
    // in case the attempt payload doesn't echo it back.
    navigate(`/test-taking/${attemptId}`, { state: { durationMinutes: t.durationMinutes } });
  };

  const renderState = (t) => {
    const status = getAttemptStatus(t);
    const score = getScore(t);
    const totalMarks = t.totalMarks ?? t.maxMarks;
    const open = isWithinWindow(t.availableFrom, t.availableUntil);

    if (status === 'SUBMITTED' || status === 'COMPLETED' || status === 'GRADED') {
      const attemptId = getAttemptId(t);
      return (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
            <Icon name="CheckCircle2" size={16} /> Completed
          </span>
          {score != null && (
            <span className="text-sm font-semibold text-foreground">
              {score}{totalMarks != null ? ` / ${totalMarks}` : ''}
            </span>
          )}
          {attemptId != null && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/test-result/${attemptId}`)}
              iconName="Eye"
              iconPosition="left"
            >
              View Result
            </Button>
          )}
        </div>
      );
    }

    if (status === 'IN_PROGRESS' || status === 'STARTED') {
      return (
        <Button
          variant="default"
          size="sm"
          onClick={() => {
            const attemptId = getAttemptId(t);
            if (attemptId) navigate(`/test-taking/${attemptId}`, { state: { durationMinutes: t.durationMinutes } });
            else handleStart(t);
          }}
          iconName="Play"
          iconPosition="left"
        >
          Resume
        </Button>
      );
    }

    return (
      <Button
        variant="default"
        size="sm"
        disabled={!open || startingId === getTestId(t)}
        onClick={() => setConfirmTest(t)}
        iconName={startingId === getTestId(t) ? 'Loader2' : 'Play'}
        iconPosition="left"
        className={startingId === getTestId(t) ? 'animate-pulse' : ''}
      >
        {open ? 'Start' : 'Not Available'}
      </Button>
    );
  };

  return (
    <PageLayout title="My Tests" activeRoute="/my-tests">
      <div className="p-4 lg:p-6 max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground tracking-tight">My tests</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Tests assigned to you. Make sure you have a stable connection before starting.
          </p>
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
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">No tests assigned</h3>
            <p className="text-muted-foreground text-sm">
              When your teacher assigns a test, it will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tests.map((t) => {
              const testId = getTestId(t);
              return (
                <div
                  key={testId}
                  className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-primary/30 transition-colors"
                >
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground">{t.title || `Test #${testId}`}</h3>
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
