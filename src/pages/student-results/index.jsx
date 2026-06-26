import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import { newTestService } from '../../services/newTestService';
import {
  formatDateTime,
  normalizeTestType,
  TEST_TYPE_BADGE,
  TEST_TYPE_LABEL,
  TEST_TYPE_ICON
} from '../test-management/testConstants';

// Student's completed-test results.
//
// Source of truth is GET /student/tests/attempts (the student's own attempt list).
// That endpoint isn't on the backend yet, so until it ships we fall back to the
// assigned-tests feed (GET /student/tests/available) and surface any assigned test
// that already has a graded/submitted attempt. Either way, rows link to the full
// per-question breakdown at /test-result/:attemptId.
//
// Heads-up: `available` only lists currently-open assignments, so a completed test
// drops off once its window closes — the dedicated attempts endpoint is what makes
// historical results reliably visible.
const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'TEST', label: 'Tests' },
  { key: 'PRACTICE', label: 'Practice' }
];

const StudentResults = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');

  useEffect(() => {
    document.title = 'Test Results - TestMaster';
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);

      // The attempts list is the authoritative result history but does NOT carry a
      // `type` field, so we can't tell a graded test from a practice (DPP) set from it
      // alone. The available-tests feed *does* carry `type` (keyed by testId), so we
      // fetch both in parallel and stamp each attempt with its test's type.
      //
      // Limitation: `available` only lists currently-open tests, so a *closed* practice
      // set won't be in the map and falls back to TEST. The real fix is for the backend
      // to include `type` on the attempts-list response — then the map is unnecessary.
      const [attemptsRes, availRes] = await Promise.all([
        newTestService.getMyAttempts(),
        newTestService.getAvailableTests()
      ]);
      if (!active) return;

      const typeById = {};
      if (Array.isArray(availRes.data)) {
        for (const a of availRes.data) {
          const id = a.testId ?? a.id;
          if (id != null && a.type) typeById[String(id)] = normalizeTestType(a.type);
        }
      }
      // Resolve each row's type: trust an explicit `type` if present, else the map.
      const annotate = (rows) =>
        rows.map((r) =>
          r.type ? r : { ...r, type: typeById[String(r.testId ?? r.id)] }
        );

      // Prefer the dedicated attempts list; fall back to the assigned-tests feed
      // (which is the same `available` payload we already fetched for the type map).
      if (!attemptsRes.error && Array.isArray(attemptsRes.data) && attemptsRes.data.length > 0) {
        setTests(annotate(attemptsRes.data));
        setLoading(false);
        return;
      }

      if (availRes.error) {
        setError(availRes.error.message || 'Failed to load your results');
        setTests([]);
      } else {
        setTests(Array.isArray(availRes.data) ? availRes.data : []);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Defensive field access — the available-test payload isn't strongly typed.
  const getTestId = (t) => t.testId ?? t.id;
  const getType = (t) => normalizeTestType(t.type);
  const getAttemptId = (t) => t.attemptId ?? t.currentAttemptId ?? t.attempt?.id ?? null;
  const getStatus = (t) => (t.attemptStatus || t.status || t.attempt?.status || '').toUpperCase();
  const getScore = (t) => t.score ?? t.marksObtained ?? t.lastScore ?? t.attempt?.score ?? null;
  const getMax = (t) => t.maxScore ?? t.totalMarks ?? t.maxMarks ?? null;
  const getSubmitted = (t) => t.submittedAt || t.attempt?.submittedAt || t.completedAt || null;

  const isDone = (t) => ['SUBMITTED', 'COMPLETED', 'GRADED'].includes(getStatus(t));

  // Only completed attempts with an addressable attempt id can show a result.
  const completed = tests.filter((t) => isDone(t) && getAttemptId(t) != null);

  // Tabs filter the completed list client-side by test type. (The attempts feed is
  // fetched once, so we narrow here rather than refetching per tab.)
  const visible =
    activeTab === 'ALL' ? completed : completed.filter((t) => getType(t) === activeTab);

  const tabEmptyCopy =
    activeTab === 'PRACTICE'
      ? {
          title: 'No practice results yet',
          body: 'Once you complete a Daily Practice set it will appear here.'
        }
      : activeTab === 'TEST'
      ? {
          title: 'No test results yet',
          body: 'Once you submit a test it will appear here so you can review your answers.'
        }
      : {
          title: 'No results yet',
          body: 'Once you submit a test it will appear here so you can review your answers.'
        };

  return (
    <PageLayout title="Test Results">
      <div className="p-4 lg:p-6 max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground tracking-tight">Test results</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Your completed tests. Open one to review every question, your answer, and the correct answer.
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
        ) : visible.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Icon name="Award" size={30} className="text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">
              {tabEmptyCopy.title}
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {tabEmptyCopy.body}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((t) => {
              const score = getScore(t);
              const max = getMax(t);
              const pct = score != null && max ? (Number(score) / Number(max)) * 100 : null;
              const attemptId = getAttemptId(t);
              const tt = getType(t);
              return (
                <button
                  key={attemptId}
                  onClick={() => navigate(`/test-result/${attemptId}`)}
                  className="w-full text-left bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-primary/30 hover:bg-muted/20 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground truncate">
                        {t.title || t.testTitle || `Test #${getTestId(t)}`}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${TEST_TYPE_BADGE[tt]}`}
                      >
                        <Icon name={TEST_TYPE_ICON[tt]} size={11} />
                        {TEST_TYPE_LABEL[tt]}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-medium text-success">
                        <Icon name="CheckCircle2" size={13} /> Completed
                      </span>
                      {getSubmitted(t) && (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="CalendarCheck" size={13} /> {formatDateTime(getSubmitted(t))}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {score != null && (
                      <div className="text-right">
                        <div className="font-display text-xl font-semibold text-foreground leading-none nums-tabular">
                          {score}
                          {max != null && <span className="text-sm text-muted-foreground font-sans"> / {max}</span>}
                        </div>
                        {pct != null && (
                          <div className="text-xs text-muted-foreground mt-1 nums-tabular">{pct.toFixed(0)}%</div>
                        )}
                      </div>
                    )}
                    <Icon name="ChevronRight" size={20} className="text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default StudentResults;
