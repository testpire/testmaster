import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { newTestService } from '../../services/newTestService';
import { formatDateTime } from '../test-management/testConstants';

// "My practice tests" — the student's own SELF_TESTs (the tests they build via the
// blueprint builder). Source is GET /student/tests/available?type=SELF_TEST. Self-tests
// are untimed with unlimited attempts, so the card actions are simple: resume an
// in-progress attempt, (re)start, or open the last result. Creating a new one goes to
// the blueprint builder at /self-test/new.
const SelfTestHub = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startingId, setStartingId] = useState(null);

  useEffect(() => {
    document.title = 'My Practice Tests - TestMaster';
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await newTestService.getAvailableTests('SELF_TEST');
      if (!active) return;
      if (err) {
        setError(err.message || 'Failed to load your practice tests');
        setTests([]);
      } else {
        setTests(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Defensive readers — the available-test payload isn't strongly typed.
  const getTestId = (t) => t.testId ?? t.id;
  const getInProgressAttemptId = (t) =>
    t.inProgressAttemptId ?? t.currentAttemptId ?? t.attempt?.id ?? null;
  const getAttemptsUsed = (t) => Number(t.attemptsUsed ?? 0) || 0;

  const handleStart = async (t) => {
    const testId = getTestId(t);
    setStartingId(testId);
    setError(null);
    const { data, error: err } = await newTestService.startAttempt(testId);
    setStartingId(null);
    if (err) {
      setError(err.message || 'Could not start the practice test');
      return;
    }
    const attemptId = data?.attemptId ?? data?.id ?? data?.attempt?.id;
    if (!attemptId) {
      setError('Attempt started but no attempt id was returned.');
      return;
    }
    navigate(`/test-taking/${attemptId}`, { state: { testType: 'SELF_TEST' } });
  };

  const renderState = (t) => {
    const testId = getTestId(t);
    const inProgressId = getInProgressAttemptId(t);
    const attemptsUsed = getAttemptsUsed(t);
    const starting = startingId === testId;

    if (inProgressId != null) {
      return (
        <Button
          variant="default"
          size="sm"
          onClick={() => navigate(`/test-taking/${inProgressId}`, { state: { testType: 'SELF_TEST' } })}
          iconName="Play"
          iconPosition="left"
        >
          Resume
        </Button>
      );
    }

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
          disabled={starting}
          onClick={() => handleStart(t)}
          iconName={starting ? 'Loader2' : 'Play'}
          iconPosition="left"
          className={starting ? 'animate-pulse' : ''}
        >
          {attemptsUsed > 0 ? 'Practice again' : 'Start'}
        </Button>
      </div>
    );
  };

  return (
    <PageLayout title="My Practice Tests" activeRoute="/self-test">
      <div className="p-4 lg:p-6 max-w-4xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground tracking-tight">
              My practice tests
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
              Practice tests you’ve built for yourself. Untimed, unlimited attempts, with feedback on
              every answer as you go.
            </p>
          </div>
          <Button
            variant="default"
            onClick={() => navigate('/self-test/new')}
            iconName="Plus"
            iconPosition="left"
            className="flex-shrink-0"
          >
            Build a test
          </Button>
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
            <div className="mx-auto w-16 h-16 rounded-2xl bg-secondary/15 flex items-center justify-center mb-4">
              <Icon name="Sparkles" size={30} className="text-secondary" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">
              No practice tests yet
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-5">
              Build a test from any mix of your subjects, chapters and topics — pick a difficulty and
              how many questions, and start practising.
            </p>
            <Button
              variant="default"
              onClick={() => navigate('/self-test/new')}
              iconName="Sparkles"
              iconPosition="left"
            >
              Build your first practice test
            </Button>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">
                        {t.title || `Practice test #${testId}`}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary/15 text-secondary">
                        <Icon name="Sparkles" size={11} />
                        Self-Test
                      </span>
                    </div>
                    {t.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{t.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
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
                      <span className="inline-flex items-center gap-1">
                        <Icon name="Infinity" size={13} /> Untimed · unlimited attempts
                      </span>
                      {getAttemptsUsed(t) > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="Repeat" size={13} /> {getAttemptsUsed(t)} attempt
                          {getAttemptsUsed(t) === 1 ? '' : 's'}
                        </span>
                      )}
                      {t.availableFrom && (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="CalendarClock" size={13} /> {formatDateTime(t.availableFrom)}
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
    </PageLayout>
  );
};

export default SelfTestHub;
