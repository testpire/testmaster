import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { newTestService } from '../../../services/newTestService';
import { formatDateTime, isWithinWindow } from '../../test-management/testConstants';

// Prominent "Assigned Tests" panel for the student dashboard. Surfaces the tests
// a student needs to take right after login (they no longer have to discover the
// "My Tests" nav link). Shows the next few tests with Start / Resume / Completed
// states; the full list lives at /my-tests.
//
// The available-test payload isn't strongly typed by the API, so every field is
// read defensively with a few aliases — mirrors src/pages/student-tests/index.jsx.
const MAX_VISIBLE = 4;

const getTestId = (t) => t.testId ?? t.id;
const getAttemptId = (t) => t.attemptId ?? t.currentAttemptId ?? t.attempt?.id ?? null;
const getAttemptStatus = (t) =>
  (t.attemptStatus || t.status || t.attempt?.status || '').toUpperCase();
const getScore = (t) => t.score ?? t.marksObtained ?? t.lastScore ?? t.attempt?.score ?? null;

const AssignedTestsWidget = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startingId, setStartingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error: err } = await newTestService.getAvailableTests();
      if (!mounted) return;
      if (err) {
        setError(err.message || 'Unable to load your tests right now.');
        setTests([]);
      } else {
        setTests(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleStart = async (t) => {
    const testId = getTestId(t);
    setStartingId(testId);
    setError(null);
    const { data, error: err } = await newTestService.startAttempt(testId);
    setStartingId(null);
    if (err) {
      setError(err.message || 'Could not start the test.');
      return;
    }
    const attemptId = data?.attemptId ?? data?.id ?? data?.attempt?.id;
    if (!attemptId) {
      setError('Attempt started but no attempt id was returned.');
      return;
    }
    navigate(`/test-taking/${attemptId}`);
  };

  const renderAction = (t) => {
    const status = getAttemptStatus(t);
    const score = getScore(t);
    const totalMarks = t.totalMarks ?? t.maxMarks;
    const open = isWithinWindow(t.availableFrom, t.availableUntil);
    const testId = getTestId(t);

    if (status === 'SUBMITTED' || status === 'COMPLETED' || status === 'GRADED') {
      return (
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="inline-flex items-center gap-1 text-sm text-green-700">
            <Icon name="CheckCircle2" size={16} /> Done
          </span>
          {score != null && (
            <span className="text-sm font-semibold text-foreground">
              {score}
              {totalMarks != null ? ` / ${totalMarks}` : ''}
            </span>
          )}
        </div>
      );
    }

    if (status === 'IN_PROGRESS' || status === 'STARTED') {
      return (
        <Button
          variant="default"
          size="sm"
          className="flex-shrink-0"
          onClick={() => {
            const attemptId = getAttemptId(t);
            if (attemptId) navigate(`/test-taking/${attemptId}`);
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
        className={`flex-shrink-0 ${startingId === testId ? 'animate-pulse' : ''}`}
        disabled={!open || startingId === testId}
        onClick={() => handleStart(t)}
        iconName={startingId === testId ? 'Loader2' : 'Play'}
        iconPosition="left"
      >
        {open ? 'Start' : 'Not Open'}
      </Button>
    );
  };

  const visible = tests.slice(0, MAX_VISIBLE);

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon name="ClipboardList" size={18} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Assigned Tests</h3>
          {!loading && !error && tests.length > 0 && (
            <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {tests.length}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/my-tests')}
          className="text-sm text-primary hover:underline"
        >
          View all
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Icon name="AlertCircle" size={16} className="text-amber-500" />
          <span>{error}</span>
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-8">
          <Icon name="ClipboardCheck" size={36} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-muted-foreground">
            No tests assigned yet. They'll appear here when your teacher assigns one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((t) => {
            const testId = getTestId(t);
            return (
              <div
                key={testId}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0">
                  <h4 className="font-medium text-foreground truncate">
                    {t.title || `Test #${testId}`}
                  </h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
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
              className="w-full text-center text-sm text-primary hover:underline pt-1"
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
