import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import AttemptReview from '../../components/test/AttemptReview';
import AttemptUnavailable from '../../components/test/AttemptUnavailable';
import { newTestService } from '../../services/newTestService';
import {
  getAttemptStatus,
  isAttemptInProgress,
  isUsableAttempt,
  isTransientAttemptError,
} from '../../utils/attemptStatus';

// Student's detailed result for one of their own attempts. Renders the shared
// AttemptReview from GET /student/tests/attempts/{attemptId}.
const TestResult = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // The URL :attemptId isn't trusted — when it's invalid or not this student's,
  // we show a clean "not available" screen and bounce to /my-results.
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    document.title = 'Test Result - TopperLoop';
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      setUnavailable(false);
      const { data, error: err } = await newTestService.getAttempt(attemptId);
      if (!active) return;

      // The backend scopes attempts to the JWT user and returns HTTP 400 for a
      // missing/unowned id (no data leak). Separate a transient failure (network
      // / 5xx — retryable) from "not yours / doesn't exist" (a clean redirect,
      // never the raw "Attempt not found with ID: …" message).
      if (err || !isUsableAttempt(data)) {
        if (isTransientAttemptError(err)) {
          setError(err?.message || 'Something went wrong loading this result. Please try again.');
        } else {
          setUnavailable(true);
        }
        setLoading(false);
        return;
      }

      // A result doesn't exist yet for an attempt still in progress — send the
      // student back to the runner to finish it.
      if (isAttemptInProgress(getAttemptStatus(data))) {
        navigate(`/test-taking/${attemptId}`, { replace: true });
        return; // keep the spinner up until the route changes
      }

      setAttempt(data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [attemptId, navigate]);

  // When the result isn't available to this student, show the explanation
  // briefly, then send them back to their results list (also reachable by button).
  useEffect(() => {
    if (!unavailable) return;
    const t = setTimeout(() => navigate('/my-results', { replace: true }), 3000);
    return () => clearTimeout(t);
  }, [unavailable, navigate]);

  return (
    <PageLayout title="Test Result">
      <div className="p-4 lg:p-6 max-w-3xl mx-auto w-full">
        <button
          onClick={() => navigate('/my-results')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <Icon name="ArrowLeft" size={16} /> Back to Results
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : unavailable ? (
          <AttemptUnavailable
            backLabel="Back to Results"
            onBack={() => navigate('/my-results', { replace: true })}
          />
        ) : error ? (
          <div className="text-center py-16">
            <Icon name="AlertCircle" size={40} className="mx-auto mb-3 text-destructive" />
            <p className="text-foreground font-medium mb-4">{error}</p>
            <Button variant="outline" onClick={() => navigate('/my-results')} iconName="ArrowLeft" iconPosition="left">
              Back to Results
            </Button>
          </div>
        ) : (
          <AttemptReview attempt={attempt} />
        )}
      </div>
    </PageLayout>
  );
};

export default TestResult;
