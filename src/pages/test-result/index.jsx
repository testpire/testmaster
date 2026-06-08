import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import AttemptReview from '../../components/test/AttemptReview';
import { newTestService } from '../../services/newTestService';

// Student's detailed result for one of their own attempts. Renders the shared
// AttemptReview from GET /student/tests/attempts/{attemptId}.
const TestResult = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = 'Test Result - TestMaster';
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await newTestService.getAttempt(attemptId);
      if (!active) return;
      if (err || !data) {
        setError(err?.message || 'Failed to load this result');
        setAttempt(null);
      } else {
        setAttempt(data);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [attemptId]);

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
