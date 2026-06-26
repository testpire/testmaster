import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import MathText from '../../components/MathText';
import { newTestService } from '../../services/newTestService';
import { questionService } from '../../services/questionService';
import { newInstituteService } from '../../services/newInstituteService';
import { printTestPaper } from '../../utils/testPaperPdf';
import { cn } from '../../utils/cn';
import TestFormModal from '../test-management/components/TestFormModal';
import QuestionPickerModal from '../test-management/components/QuestionPickerModal';
import AssignTestModal from '../test-management/components/AssignTestModal';
import TestResultsModal from '../test-management/components/TestResultsModal';
import {
  TEST_TYPE_BADGE,
  TEST_TYPE_LABEL,
  TEST_TYPE_ICON,
  TEST_AVAILABILITY_BADGE,
  TARGET_TYPE_LABEL,
  TARGET_TYPE_ICON,
  REVEAL_TRIGGER_LABEL,
  normalizeTestType,
  getTestAvailability,
  prettyEnum,
  formatDate,
  formatDateTime,
  resolveImagePath
} from '../test-management/testConstants';

// ---- small presentational helpers (mirrors the student-profile detail page) ----

const Card = ({ title, icon, action, children, className }) => (
  <div className={cn('bg-card rounded-2xl border border-border shadow-sm', className)}>
    {(title || action) && (
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <h2 className="font-display flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon && <Icon name={icon} size={16} className="text-muted-foreground" />}
          {title}
        </h2>
        {action}
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

const Field = ({ label, value, full = false }) => (
  <div className={cn('min-w-0', full && 'sm:col-span-2')}>
    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 text-sm text-foreground break-words">
      {value === 0 || value ? value : <span className="text-muted-foreground">—</span>}
    </dd>
  </div>
);

// A compact key stat shown in the header strip.
const Stat = ({ icon, value, label }) => (
  <div className="flex items-center gap-2">
    <Icon name={icon} size={16} className="text-muted-foreground flex-shrink-0" />
    <div className="leading-tight">
      <div className="text-sm font-semibold text-foreground nums-tabular">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  </div>
);

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'Info' },
  { key: 'questions', label: 'Questions', icon: 'ListChecks' },
  { key: 'assignments', label: 'Assignments', icon: 'Send' }
];

const TestDetail = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const currentUser = userProfile || user;

  // SuperAdmin context is only present under the super-admin guard branch.
  let superAdminContext = null;
  try {
    superAdminContext = useSuperAdmin();
  } catch (e) {
    // INST_ADMIN / TEACHER — fine.
  }

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);

  const [tab, setTab] = useState('overview');

  // Modals.
  const [showEdit, setShowEdit] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Transient action state.
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadTest = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await newTestService.getTest(testId);
    if (err || !data) {
      setError(err?.message || 'Failed to load this test');
      setTest(null);
    } else {
      setTest(data);
    }
    setLoading(false);
  }, [testId]);

  const loadAssignments = useCallback(async () => {
    setAssignmentsLoading(true);
    const { data } = await newTestService.listAssignments(testId);
    setAssignments(Array.isArray(data) ? data : []);
    setAssignmentsLoading(false);
  }, [testId]);

  useEffect(() => {
    document.title = 'Test Details - TestMaster';
  }, []);

  useEffect(() => {
    loadTest();
    loadAssignments();
  }, [loadTest, loadAssignments]);

  // Only show the full-page spinner on the first load — later reloads (after publish,
  // edit, question changes) keep the current content visible to avoid a jarring flash.
  if (loading && !test) {
    return (
      <PageLayout title="Test Details">
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageLayout>
    );
  }

  if (error || !test) {
    return (
      <PageLayout title="Test Details">
        <div className="text-center py-24 px-4">
          <Icon name="AlertCircle" size={40} className="mx-auto mb-3 text-destructive" />
          <p className="text-foreground font-medium mb-4">{error || 'Test not found'}</p>
          <Button variant="outline" onClick={() => navigate('/test-management')} iconName="ArrowLeft" iconPosition="left">
            Back to Test Management
          </Button>
        </div>
      </PageLayout>
    );
  }

  const status = (test.status || '').toUpperCase();
  const isDraft = status === 'DRAFT';
  const testType = normalizeTestType(test.type);
  const isPractice = testType === 'PRACTICE';
  const questions = Array.isArray(test.questions) ? [...test.questions].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) : [];
  const qCount = test.questionCount ?? questions.length;
  const availability = getTestAvailability(test);

  // ---- actions ----

  const handlePublish = async () => {
    if (qCount === 0) {
      setActionError('Add at least one question before publishing.');
      return;
    }
    setActionError(null);
    setPublishing(true);
    const { error: err } = await newTestService.publishTest(test.id);
    setPublishing(false);
    if (err) setActionError(err.message || 'Failed to publish test');
    else loadTest();
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete test "${test.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    const { error: err } = await newTestService.deleteTest(test.id);
    if (err) {
      setDeleting(false);
      setActionError(err.message || 'Failed to delete test');
    } else {
      navigate('/test-management');
    }
  };

  // Resolve the institute name to print on the paper (best-effort).
  const resolveInstituteName = async () => {
    const fromSwitcher = superAdminContext?.selectedInstitute?.name;
    if (fromSwitcher) return fromSwitcher;
    const instituteId = currentUser?.instituteId;
    if (!instituteId) return '';
    try {
      const { data } = await newInstituteService.getInstituteById(instituteId, { skipAuthRedirect: true });
      const inst = data?.institute || data?.data || data;
      return inst?.name || '';
    } catch {
      return '';
    }
  };

  // Build an offline question paper and open the print → "Save as PDF" dialog. The
  // test-detail payload may omit per-question options, so enrich those from the bank.
  const handleDownloadPaper = async () => {
    setActionError(null);
    if (questions.length === 0) {
      setActionError('This test has no questions to download.');
      return;
    }
    setDownloading(true);
    try {
      const enriched = await Promise.all(
        questions.map(async (q) => {
          if (Array.isArray(q.options) && q.options.length > 0) return q;
          const qid = q.questionId ?? q.id;
          if (qid == null) return q;
          const { data: detail } = await questionService.getQuestionById(qid);
          if (!detail) return q;
          return {
            ...detail,
            ...q,
            text: q.text || detail.text,
            textFormat: q.textFormat || detail.textFormat,
            questionType: q.questionType || detail.questionType,
            questionImagePath: q.questionImagePath || detail.questionImagePath,
            options: Array.isArray(q.options) && q.options.length > 0 ? q.options : detail.options || []
          };
        })
      );
      const instituteName = await resolveInstituteName();
      await printTestPaper(test, enriched, { instituteName });
    } catch (e) {
      setActionError(e?.message || 'Failed to generate the test paper');
    } finally {
      setDownloading(false);
    }
  };

  // Open the edit form focused on fixing the availability window (from the guard CTA).
  const openReopenWindow = () => {
    setShowAssign(false);
    setShowEdit(true);
  };

  return (
    <PageLayout title="Test Details">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto w-full">
        <button
          onClick={() => navigate('/test-management')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <Icon name="ArrowLeft" size={16} /> Back to Test Management
        </button>

        {actionError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4 flex items-center justify-between">
            <p className="text-destructive text-sm">{actionError}</p>
            <button onClick={() => setActionError(null)} className="text-destructive hover:opacity-70">
              <Icon name="X" size={16} />
            </button>
          </div>
        )}

        {/* Header card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', TEST_TYPE_BADGE[testType])}>
                <Icon name={TEST_TYPE_ICON[testType]} size={11} />
                {TEST_TYPE_LABEL[testType]}
              </span>
              <span
                className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', TEST_AVAILABILITY_BADGE[availability.state])}
                title={availability.detail}
              >
                <Icon name="Clock" size={11} />
                {availability.label}
              </span>
            </div>

            <div className="min-w-0">
              <h1 className="font-display font-semibold text-2xl text-foreground break-words">{test.title || 'Untitled test'}</h1>
              {test.description && <p className="text-sm text-muted-foreground mt-1 break-words">{test.description}</p>}
            </div>
          </div>

          {/* Key stats */}
          <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
            <Stat icon="ListChecks" value={qCount} label="Questions" />
            <Stat icon="Award" value={test.totalMarks ?? 0} label="Total marks" />
            <Stat icon="Timer" value={test.durationMinutes ? `${test.durationMinutes} min` : 'Untimed'} label="Duration" />
            <Stat icon="Repeat" value={isPractice ? 'Unlimited' : test.maxAttempts ?? 1} label="Attempts" />
            <Stat icon="Target" value={test.passingMarks != null && test.passingMarks !== '' ? test.passingMarks : '—'} label="Passing marks" />
          </div>

          {/* Action bar */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)} iconName="Pencil" iconPosition="left">
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowPicker(true)} iconName="ListChecks" iconPosition="left">
              Manage questions
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAssign(true)} iconName="Send" iconPosition="left">
              Assign
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowResults(true)} iconName="BarChart3" iconPosition="left">
              Results
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPaper}
              loading={downloading}
              iconName={downloading ? undefined : 'FileDown'}
              iconPosition="left"
            >
              {downloading ? 'Preparing…' : 'Download paper'}
            </Button>
            {isDraft && (
              <Button
                variant="default"
                size="sm"
                onClick={handlePublish}
                loading={publishing}
                iconName={publishing ? undefined : 'Upload'}
                iconPosition="left"
              >
                {publishing ? 'Publishing…' : 'Publish'}
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              loading={deleting}
              iconName={deleting ? undefined : 'Trash2'}
              iconPosition="left"
              className="text-destructive"
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Availability guard banner — the confusion fix, surfaced prominently. */}
        {availability.state !== 'OPEN' && availability.state !== 'ALWAYS_OPEN' && (
          <div
            className={cn(
              'mt-4 rounded-2xl border p-4 flex items-start gap-3',
              availability.state === 'EXPIRED' ? 'bg-destructive/10 border-destructive/30' : 'bg-warning/10 border-warning/40'
            )}
          >
            <Icon
              name={availability.state === 'EXPIRED' ? 'CalendarX' : availability.state === 'SCHEDULED' ? 'CalendarClock' : 'FileEdit'}
              size={20}
              className={cn('mt-0.5 flex-shrink-0', availability.state === 'EXPIRED' ? 'text-destructive' : 'text-warning')}
            />
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-medium', availability.state === 'EXPIRED' ? 'text-destructive' : 'text-warning')}>
                {availability.state === 'DRAFT'
                  ? 'This test is a draft — students can’t take it yet.'
                  : availability.state === 'SCHEDULED'
                  ? 'This test hasn’t opened yet.'
                  : 'This test’s availability window has expired.'}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {availability.detail}
                {availability.state !== 'DRAFT' && ' Assignments can only narrow within this window — reopen it to make the test takeable.'}
              </p>
              <div className="mt-2">
                {availability.state === 'DRAFT' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePublish}
                    loading={publishing}
                    iconName={publishing ? undefined : 'Upload'}
                    iconPosition="left"
                  >
                    {publishing ? 'Publishing…' : 'Publish now'}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setShowEdit(true)} iconName="CalendarClock" iconPosition="left">
                    Reopen / extend test window
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mt-5">
          <div className="flex items-center gap-1 border-b border-border">
            {TABS.map((t) => {
              const active = tab === t.key;
              const count = t.key === 'questions' ? qCount : t.key === 'assignments' ? assignments.length : null;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon name={t.icon} size={15} />
                  {t.label}
                  {count != null && (
                    <span className={cn('px-1.5 py-0.5 rounded-full text-[11px]', active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-5">
            {tab === 'overview' && (
              <div className="space-y-5">
                <Card title="Timing & Scoring" icon="SlidersHorizontal">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    <Field label="Type" value={TEST_TYPE_LABEL[testType]} />
                    <Field label="Duration" value={test.durationMinutes ? `${test.durationMinutes} minutes` : 'Untimed'} />
                    <Field label="Max attempts" value={isPractice ? 'Unlimited' : test.maxAttempts ?? 1} />
                    <Field label="Passing marks" value={test.passingMarks != null && test.passingMarks !== '' ? test.passingMarks : null} />
                    <Field label="Negative marking" value={test.negativeMarking ? 'On' : 'Off'} />
                    <Field label="Shuffle questions" value={test.shuffleQuestions ? 'On' : 'Off'} />
                    <Field label="Created" value={test.createdAt ? formatDate(test.createdAt) : null} />
                  </dl>
                </Card>

                <Card title="Availability" icon="CalendarClock">
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', TEST_AVAILABILITY_BADGE[availability.state])}
                    >
                      <Icon name="Clock" size={12} />
                      {availability.label}
                    </span>
                    <span className="text-sm text-muted-foreground">{availability.detail}</span>
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    <Field label="Available from" value={test.availableFrom ? formatDateTime(test.availableFrom) : 'No start limit'} />
                    <Field label="Available until" value={test.availableUntil ? formatDateTime(test.availableUntil) : 'No expiry'} />
                  </dl>
                </Card>

                <Card title="Result visibility" icon="Eye">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    <Field
                      label="Students see their score"
                      value={REVEAL_TRIGGER_LABEL[test.scoreReveal] || prettyEnum(test.scoreReveal)}
                    />
                    <Field
                      label="Students see the answers"
                      value={REVEAL_TRIGGER_LABEL[test.solutionReveal] || prettyEnum(test.solutionReveal)}
                    />
                    {test.scoreReveal === 'SCHEDULED' && (
                      <Field label="Score reveal time" value={formatDateTime(test.scoreRevealAt)} />
                    )}
                    {test.solutionReveal === 'SCHEDULED' && (
                      <Field label="Answer reveal time" value={formatDateTime(test.solutionRevealAt)} />
                    )}
                    {test.resultsPublishedAt && (
                      <Field label="Results published" value={formatDateTime(test.resultsPublishedAt)} full />
                    )}
                  </dl>
                </Card>
              </div>
            )}

            {tab === 'questions' && (
              <Card
                title={`Questions (${qCount})`}
                icon="ListChecks"
                action={
                  <Button variant="outline" size="sm" onClick={() => setShowPicker(true)} iconName="Pencil" iconPosition="left">
                    Manage questions
                  </Button>
                }
              >
                {questions.length === 0 ? (
                  <div className="text-center py-10">
                    <Icon name="ListChecks" size={36} className="mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground mb-4">No questions added yet.</p>
                    <Button variant="default" size="sm" onClick={() => setShowPicker(true)} iconName="Plus" iconPosition="left">
                      Add questions
                    </Button>
                  </div>
                ) : (
                  <ol className="space-y-3">
                    {questions.map((q, i) => {
                      const img = resolveImagePath(q.questionImagePath);
                      return (
                        <li key={q.questionId ?? q.id ?? i} className="rounded-xl border border-border p-4">
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-semibold flex items-center justify-center mt-0.5">
                              {i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-foreground">
                                <MathText text={q.text || `Question #${q.questionId ?? q.id}`} textFormat={q.textFormat} />
                              </div>
                              {img && (
                                <img src={img} alt="" className="mt-2 max-h-40 rounded-lg border border-border object-contain" />
                              )}
                              {Array.isArray(q.options) && q.options.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                  {q.options.map((o, oi) => (
                                    <li
                                      key={o.id ?? oi}
                                      className={cn(
                                        'flex items-start gap-2 text-sm',
                                        o.correct ? 'text-success font-medium' : 'text-muted-foreground'
                                      )}
                                    >
                                      <Icon name={o.correct ? 'CheckCircle2' : 'Circle'} size={14} className="mt-0.5 flex-shrink-0" />
                                      <MathText text={o.text} textFormat={q.textFormat} />
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                  <Icon name="Award" size={11} />
                                  {q.marks ?? 0} mark{(q.marks ?? 0) === 1 ? '' : 's'}
                                </span>
                                {test.negativeMarking && q.negativeMarks ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                                    <Icon name="Minus" size={11} />
                                    {q.negativeMarks}
                                  </span>
                                ) : null}
                                {q.difficultyLevel && (
                                  <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                    {prettyEnum(q.difficultyLevel)}
                                  </span>
                                )}
                                {q.topicName && (
                                  <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground truncate max-w-[200px]">
                                    {q.topicName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </Card>
            )}

            {tab === 'assignments' && (
              <Card
                title={`Assignments (${assignments.length})`}
                icon="Send"
                action={
                  <Button variant="default" size="sm" onClick={() => setShowAssign(true)} iconName="Plus" iconPosition="left">
                    Assign
                  </Button>
                }
              >
                {/* Inline echo of the test-window guard so it's visible before opening the dialog. */}
                {(availability.state === 'EXPIRED' || availability.state === 'SCHEDULED' || availability.state === 'DRAFT') && (
                  <div
                    className={cn(
                      'mb-4 rounded-lg border p-3 flex items-start gap-2',
                      availability.state === 'EXPIRED' ? 'bg-destructive/10 border-destructive/30' : 'bg-warning/10 border-warning/40'
                    )}
                  >
                    <Icon name="AlertTriangle" size={16} className={cn('mt-0.5', availability.state === 'EXPIRED' ? 'text-destructive' : 'text-warning')} />
                    <p className="text-sm text-muted-foreground">
                      Heads up — this test isn’t currently takeable ({availability.label.toLowerCase()}). New assignments
                      won’t reach students until the test’s own window is open.
                    </p>
                  </div>
                )}

                {assignmentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="text-center py-10">
                    <Icon name="Send" size={36} className="mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground mb-4">Not assigned to anyone yet.</p>
                    <Button variant="default" size="sm" onClick={() => setShowAssign(true)} iconName="Plus" iconPosition="left">
                      Assign this test
                    </Button>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {assignments.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                        <Icon name={TARGET_TYPE_ICON[a.targetType] || 'Tag'} size={18} className="text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {a.targetName || `${TARGET_TYPE_LABEL[a.targetType] || a.targetType} #${a.targetId}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {TARGET_TYPE_LABEL[a.targetType] || a.targetType}
                            {(a.availableFrom || a.availableUntil) && (
                              <> {' · '}{formatDateTime(a.availableFrom)} → {formatDateTime(a.availableUntil)}</>
                            )}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modals — reuse the proven editors from test-management. */}
      {showEdit && (
        <TestFormModal
          isOpen={showEdit}
          editMode
          existingTest={test}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            setShowEdit(false);
            loadTest();
          }}
        />
      )}

      {showPicker && (
        <QuestionPickerModal
          isOpen={showPicker}
          test={test}
          onClose={() => setShowPicker(false)}
          onSuccess={() => loadTest()}
        />
      )}

      {showAssign && (
        <AssignTestModal
          isOpen={showAssign}
          test={test}
          onClose={() => setShowAssign(false)}
          onChanged={() => loadAssignments()}
          onReopenWindow={openReopenWindow}
        />
      )}

      {showResults && (
        <TestResultsModal isOpen={showResults} test={test} onClose={() => setShowResults(false)} />
      )}
    </PageLayout>
  );
};

export default TestDetail;
