import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { newTestService } from '../../services/newTestService';
import { newUserService } from '../../services/newUserService';
import { courseService } from '../../services/courseService';

// Self-Test blueprint builder — the student assembles a practice test on demand.
//
// Flow (two steps in one page):
//   1. BUILD  — pick a scope per section (subject → optional chapter → optional
//               topics), a difficulty and a question count. Subjects from every course
//               the student is enrolled in are offered directly (no course step);
//               server precedence is topicIds > chapterId > subjectId, so each section
//               sends the deepest granularity the student chose.
//   2. RESULT — the server assembles the test (best-effort: `selected` can be < the
//               `requested` count because the bank is small or a question was already
//               used by an earlier section). We show the per-section breakdown, flag
//               any shortfall non-blockingly, then Start → hand testId to the runner.
//
// Only enrolled content is offered (GET /students/profile → courseEnrollments, then
// GET /courses/{id}?include=subjects,chapters,topics per course), which keeps the
// backend from 404-ing on out-of-scope ids.

// Client-side guards that mirror the server defaults. The server is authoritative —
// it re-checks and returns a 400 we always surface — these just prevent an obviously
// doomed request and give the student live feedback.
const MAX_SECTIONS = 10;
const MAX_TOTAL_QUESTIONS = 50;
const DEFAULT_COUNT = 10;

const DIFFICULTIES = [
  { value: 'ALL', label: 'Any difficulty' },
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' }
];

// Native-select styling that matches the app's Input primitive.
const selectClass =
  'flex h-11 w-full rounded-lg border border-input bg-card px-3.5 py-2 text-sm text-foreground ' +
  'ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-ring/70 focus-visible:ring-offset-1 focus-visible:border-primary ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const emptySection = (uid) => ({
  uid,
  subjectId: null,
  chapterId: null, // null = all chapters in the subject
  topicIds: [], // [] = all topics in the chapter
  difficulty: 'ALL',
  count: DEFAULT_COUNT
});

const SelfTestBuilder = () => {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]); // courseEnrollments
  const [treesByCourseId, setTreesByCourseId] = useState({}); // courseId → course subtree
  const [loadingCurriculum, setLoadingCurriculum] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const uidRef = useRef(1);
  const [sections, setSections] = useState(() => [emptySection(uidRef.current++)]);
  const [title, setTitle] = useState('');

  const [step, setStep] = useState('build'); // 'build' | 'result'
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  // Snapshot of the sections that produced `result`, so the result view can label
  // each returned section with human names even after the student edits the form.
  const [resultSections, setResultSections] = useState([]);
  const [startingAttempt, setStartingAttempt] = useState(false);

  useEffect(() => {
    document.title = 'Build a Practice Test - TopperLoop';
  }, []);

  // ---- load enrolled courses + their full subtrees ----------------------------
  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingCurriculum(true);
      setLoadError(null);
      const { data, error: err } = await newUserService.getMyStudentProfile();
      if (!active) return;
      if (err) {
        setLoadError(err.message || 'Could not load your courses. Please try again.');
        setLoadingCurriculum(false);
        return;
      }
      const enrollments = Array.isArray(data?.courseEnrollments) ? data.courseEnrollments : [];
      setCourses(enrollments);
      if (enrollments.length === 0) {
        setLoadingCurriculum(false);
        return;
      }
      // Fetch every enrolled course's subject/chapter/topic subtree so the student can
      // pick any subject directly, without choosing a course first.
      const results = await Promise.all(
        enrollments.map((e) =>
          courseService.getCourseById(e.courseId, { include: 'subjects,chapters,topics' })
        )
      );
      if (!active) return;
      const trees = {};
      results.forEach((res, i) => {
        if (res?.data) trees[enrollments[i].courseId] = res.data;
      });
      setTreesByCourseId(trees);
      // Only a hard failure (nothing loaded at all) is worth blocking on; a partial
      // load still lets the student build from whatever subjects did come back.
      if (Object.keys(trees).length === 0) {
        setLoadError('Could not load your subjects. Please try again.');
      }
      setLoadingCurriculum(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Subjects across all enrolled courses, grouped by course for the picker (deduped so
  // a subject shared by two courses is offered once), plus a flat id→subject lookup.
  const { subjectGroups, subjectById } = useMemo(() => {
    const groups = [];
    const byId = {};
    const seen = new Set();
    for (const c of courses) {
      const tree = treesByCourseId[c.courseId];
      const subs = Array.isArray(tree?.subjects) ? tree.subjects : [];
      const group = [];
      for (const s of subs) {
        if (s == null || s.id == null) continue;
        if (!byId[s.id]) byId[s.id] = s;
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        group.push(s);
      }
      if (group.length) groups.push({ courseId: c.courseId, courseName: c.courseName, subjects: group });
    }
    return { subjectGroups: groups, subjectById: byId };
  }, [courses, treesByCourseId]);

  const hasSubjects = subjectGroups.length > 0;

  // ---- section editing --------------------------------------------------------
  const updateSection = (uid, patch) =>
    setSections((prev) => prev.map((s) => (s.uid === uid ? { ...s, ...patch } : s)));

  const changeSubject = (uid, subjectId) =>
    updateSection(uid, { subjectId, chapterId: null, topicIds: [] });

  const changeChapter = (uid, chapterId) => updateSection(uid, { chapterId, topicIds: [] });

  const toggleTopic = (uid, topicId) =>
    setSections((prev) =>
      prev.map((s) => {
        if (s.uid !== uid) return s;
        const has = s.topicIds.includes(topicId);
        return { ...s, topicIds: has ? s.topicIds.filter((t) => t !== topicId) : [...s.topicIds, topicId] };
      })
    );

  const changeCount = (uid, raw) => {
    const n = Math.floor(Number(raw));
    updateSection(uid, { count: Number.isFinite(n) && n > 0 ? n : '' });
  };

  const addSection = () => {
    if (sections.length >= MAX_SECTIONS) return;
    setSections((prev) => [...prev, emptySection(uidRef.current++)]);
  };

  const removeSection = (uid) => setSections((prev) => prev.filter((s) => s.uid !== uid));

  // ---- derived ----------------------------------------------------------------
  const totalRequested = sections.reduce((sum, s) => sum + (Number(s.count) || 0), 0);
  const overCap = totalRequested > MAX_TOTAL_QUESTIONS;

  // A section is valid when it has at least a subject and a count >= 1.
  const sectionValid = (s) => s.subjectId != null && Number(s.count) >= 1;
  const canGenerate =
    !generating &&
    sections.length > 0 &&
    sections.every(sectionValid) &&
    totalRequested >= 1 &&
    !overCap;

  // Resolve display helpers from the flat subject lookup.
  const chaptersOf = (subjectId) => subjectById[subjectId]?.chapters || [];
  const topicsOf = (subjectId, chapterId) =>
    chaptersOf(subjectId).find((c) => c.id === chapterId)?.topics || [];
  const nameOf = (list, id) => list.find((x) => x.id === id)?.name;

  // Human "Scoped to …" summary for a section (mirrors the server precedence).
  const scopeSummary = (s) => {
    if (s.subjectId == null) return null;
    const subjName = subjectById[s.subjectId]?.name || `Subject #${s.subjectId}`;
    if (s.topicIds.length > 0) {
      const topics = topicsOf(s.subjectId, s.chapterId);
      const names = s.topicIds.map((t) => nameOf(topics, t) || `#${t}`);
      return `${names.length} topic${names.length === 1 ? '' : 's'} in ${subjName}`;
    }
    if (s.chapterId != null) {
      const chName = nameOf(chaptersOf(s.subjectId), s.chapterId) || `Chapter #${s.chapterId}`;
      return `All of “${chName}” (${subjName})`;
    }
    return `All of ${subjName}`;
  };

  // ---- generate ---------------------------------------------------------------
  const buildRequest = () => ({
    title: title.trim() || null,
    sections: sections.map((s) => {
      const section = { difficulty: s.difficulty || 'ALL', count: Number(s.count) };
      // Send exactly one granularity, deepest first (topicIds > chapterId > subjectId).
      if (s.topicIds.length > 0) section.topicIds = s.topicIds;
      else if (s.chapterId != null) section.chapterId = s.chapterId;
      else section.subjectId = s.subjectId;
      return section;
    })
  });

  const handleGenerate = async () => {
    setError(null);
    if (!canGenerate) return;
    setGenerating(true);
    const snapshot = sections.map((s) => ({ ...s })); // freeze names for the result view
    const { data, error: err } = await newTestService.generateSelfTest(buildRequest());
    setGenerating(false);
    if (err) {
      setError(err.message || 'Could not generate your test. Please adjust your selection and try again.');
      return;
    }
    if (!data || data.testId == null) {
      setError('The test was generated but no id was returned. Please try again.');
      return;
    }
    setResult(data);
    setResultSections(snapshot);
    setStep('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ---- start the generated test ----------------------------------------------
  const handleStart = async () => {
    if (!result?.testId) return;
    setStartingAttempt(true);
    setError(null);
    const { data, error: err } = await newTestService.startAttempt(result.testId);
    setStartingAttempt(false);
    if (err) {
      setError(err.message || 'Could not start the test. Please try again.');
      return;
    }
    const attemptId = data?.attemptId ?? data?.id ?? data?.attempt?.id;
    if (!attemptId) {
      setError('The attempt started but no attempt id was returned.');
      return;
    }
    navigate(`/test-taking/${attemptId}`, { state: { testType: 'SELF_TEST' } });
  };

  const startOver = () => {
    setResult(null);
    setResultSections([]);
    setError(null);
    setStep('build');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ===========================================================================
  // RESULT VIEW
  // ===========================================================================
  if (step === 'result' && result) {
    const resSections = Array.isArray(result.sections) ? result.sections : [];
    const shortfalls = resSections.filter((r) => Number(r.selected) < Number(r.requested));

    return (
      <PageLayout title="Practice test ready">
        <div className="p-4 lg:p-6 max-w-2xl mx-auto w-full">
          <button
            onClick={startOver}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <Icon name="ArrowLeft" size={16} /> Edit blueprint
          </button>

          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm text-center mb-5">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center">
              <Icon name="Sparkles" size={28} />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">
              {result.title || 'Your practice test'}
            </h1>
            <p className="text-muted-foreground mt-1.5">
              Assembled <span className="font-semibold text-foreground">{result.totalQuestions}</span>{' '}
              question{result.totalQuestions === 1 ? '' : 's'} from your enrolled content.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center gap-3">
              <Button
                variant="default"
                size="lg"
                onClick={handleStart}
                disabled={startingAttempt || result.totalQuestions < 1}
                iconName={startingAttempt ? 'Loader2' : 'Play'}
                iconPosition="left"
                className={`w-full sm:w-auto ${startingAttempt ? 'animate-pulse' : ''}`}
              >
                {startingAttempt ? 'Starting…' : 'Start test'}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={startOver}
                iconName="Pencil"
                iconPosition="left"
                className="w-full sm:w-auto"
              >
                Adjust
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Non-blocking shortfall notice */}
          {shortfalls.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 mb-4">
              <Icon name="Info" size={18} className="mt-0.5 flex-shrink-0 text-warning" />
              <div className="text-sm text-foreground">
                <p className="font-medium">Some sections have fewer questions than requested.</p>
                <p className="text-muted-foreground mt-0.5">
                  The question bank didn’t have enough matching questions (or some were already used by
                  another section). Your test still includes every question that could be found.
                </p>
              </div>
            </div>
          )}

          {/* Per-section breakdown */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="font-display text-base font-semibold text-foreground">What was selected</h2>
            </div>
            <ul className="divide-y divide-border">
              {resSections.map((r, i) => {
                const short = Number(r.selected) < Number(r.requested);
                // Prefer a named label built from the frozen blueprint + still-loaded
                // subjects; fall back to the ids the server echoed if that's unavailable.
                const label =
                  (resultSections[i] && scopeSummary(resultSections[i])) ||
                  scopeSummaryForResult(resultSections[i], r);
                return (
                  <li key={i} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {difficultyLabel(r.difficulty ?? resultSections[i]?.difficulty)}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 text-sm font-semibold tabular-nums px-2.5 py-1 rounded-full ${
                        short ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'
                      }`}
                      title={short ? 'Fewer questions than requested' : 'Full count'}
                    >
                      {r.selected}
                      <span className="text-muted-foreground font-normal"> / {r.requested}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Self-tests are untimed with unlimited attempts. Answer, then hit “Check answer” to see
            whether you got it right — and why.
          </p>
        </div>
      </PageLayout>
    );
  }

  // ===========================================================================
  // BUILD VIEW
  // ===========================================================================
  return (
    <PageLayout title="Build a practice test">
      <div className="p-4 lg:p-6 max-w-3xl mx-auto w-full">
        <button
          onClick={() => navigate('/self-test')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <Icon name="ArrowLeft" size={16} /> My practice tests
        </button>

        <div className="mb-6">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground tracking-tight">
            Build a practice test
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Pick what you want to revise — a whole subject, a chapter, or specific topics — set a
            difficulty and how many questions, and we’ll assemble a test from your courses. It’s
            untimed, with unlimited attempts and feedback on demand.
          </p>
        </div>

        {loadingCurriculum ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : loadError ? (
          <div className="text-center py-16">
            <Icon name="AlertCircle" size={40} className="mx-auto mb-3 text-destructive" />
            <p className="text-foreground font-medium mb-4">{loadError}</p>
            <Button variant="outline" onClick={() => window.location.reload()} iconName="RefreshCw" iconPosition="left">
              Retry
            </Button>
          </div>
        ) : courses.length === 0 ? (
          <EmptyCurriculum
            title="No courses yet"
            body="You need to be enrolled in a course before you can build a practice test. Ask your institute to enroll you."
          />
        ) : !hasSubjects ? (
          <EmptyCurriculum
            title="No subjects available"
            body="Your courses don’t have any subjects to practise yet. Check back once your institute adds curriculum."
          />
        ) : (
          <>
            {/* Optional title */}
            <div className="mb-5">
              <Input
                label="Title (optional)"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Electricity revision"
                maxLength={120}
              />
            </div>

            {/* Sections */}
            <div className="space-y-4">
              {sections.map((s, idx) => (
                <SectionCard
                  key={s.uid}
                  index={idx}
                  section={s}
                  subjectGroups={subjectGroups}
                  chapters={chaptersOf(s.subjectId)}
                  topics={topicsOf(s.subjectId, s.chapterId)}
                  scopeSummary={scopeSummary(s)}
                  canRemove={sections.length > 1}
                  onChangeSubject={(v) => changeSubject(s.uid, v)}
                  onChangeChapter={(v) => changeChapter(s.uid, v)}
                  onToggleTopic={(v) => toggleTopic(s.uid, v)}
                  onChangeDifficulty={(v) => updateSection(s.uid, { difficulty: v })}
                  onChangeCount={(v) => changeCount(s.uid, v)}
                  onRemove={() => removeSection(s.uid)}
                />
              ))}
            </div>

            {/* Add section */}
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={addSection}
                disabled={sections.length >= MAX_SECTIONS}
                iconName="Plus"
                iconPosition="left"
              >
                Add another section
              </Button>
              {sections.length >= MAX_SECTIONS && (
                <p className="text-xs text-muted-foreground mt-2">
                  You can add up to {MAX_SECTIONS} sections.
                </p>
              )}
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mt-5">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            {/* Footer summary + generate */}
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border pt-5">
              <div className="text-sm">
                <span className="text-muted-foreground">Total questions requested: </span>
                <span className={`font-semibold tabular-nums ${overCap ? 'text-destructive' : 'text-foreground'}`}>
                  {totalRequested}
                </span>
                <span className="text-muted-foreground"> / {MAX_TOTAL_QUESTIONS} max</span>
                {overCap && (
                  <p className="text-destructive text-xs mt-1">
                    That’s over the {MAX_TOTAL_QUESTIONS}-question limit — reduce a count to continue.
                  </p>
                )}
              </div>
              <Button
                variant="default"
                size="lg"
                onClick={handleGenerate}
                disabled={!canGenerate}
                iconName={generating ? 'Loader2' : 'Sparkles'}
                iconPosition="left"
                className={`w-full sm:w-auto ${generating ? 'animate-pulse' : ''}`}
              >
                {generating ? 'Generating…' : 'Generate test'}
              </Button>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};

// Empty-state card for the build view (no courses / no subjects).
const EmptyCurriculum = ({ title, body }) => (
  <div className="text-center py-16">
    <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
      <Icon name="BookOpen" size={30} className="text-muted-foreground" />
    </div>
    <h3 className="font-display text-lg font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-muted-foreground text-sm max-w-md mx-auto">{body}</p>
  </div>
);

// Label a *result* section from the frozen blueprint snapshot / server-echoed ids when
// a named summary isn't available.
const scopeSummaryForResult = (snapshot, resSection) => {
  if (snapshot) {
    if (snapshot.topicIds?.length > 0)
      return `${snapshot.topicIds.length} topic${snapshot.topicIds.length === 1 ? '' : 's'}`;
    if (snapshot.chapterId != null) return 'One chapter';
    if (snapshot.subjectId != null) return 'Whole subject';
  }
  const r = resSection || {};
  if (Array.isArray(r.topicIds) && r.topicIds.length)
    return `${r.topicIds.length} topic${r.topicIds.length === 1 ? '' : 's'}`;
  if (r.chapterId != null) return `Chapter #${r.chapterId}`;
  if (r.subjectId != null) return `Subject #${r.subjectId}`;
  return 'Section';
};

const difficultyLabel = (d) => {
  const found = DIFFICULTIES.find((x) => x.value === String(d || 'ALL').toUpperCase());
  return found ? found.label : 'Any difficulty';
};

// ---- one blueprint section ---------------------------------------------------
const SectionCard = ({
  index,
  section,
  subjectGroups,
  chapters,
  topics,
  scopeSummary,
  canRemove,
  onChangeSubject,
  onChangeChapter,
  onToggleTopic,
  onChangeDifficulty,
  onChangeCount,
  onRemove
}) => {
  const chapterDisabled = section.subjectId == null;
  // Group subjects by course only when the student has more than one course — a single
  // course doesn't need the extra heading.
  const grouped = subjectGroups.length > 1;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            {index + 1}
          </span>
          Section {index + 1}
        </h3>
        {canRemove && (
          <button
            onClick={onRemove}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            <Icon name="Trash2" size={15} /> Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Subject</label>
          <select
            className={selectClass}
            value={section.subjectId ?? ''}
            onChange={(e) => onChangeSubject(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Select a subject…</option>
            {grouped
              ? subjectGroups.map((g) => (
                  <optgroup key={g.courseId} label={g.courseName || `Course #${g.courseId}`}>
                    {g.subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                ))
              : subjectGroups[0]?.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
          </select>
        </div>

        {/* Chapter (optional) */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Chapter <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <select
            className={selectClass}
            value={section.chapterId ?? ''}
            disabled={chapterDisabled}
            onChange={(e) => onChangeChapter(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">All chapters</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Topics (optional; only once a chapter is chosen) */}
        {section.chapterId != null && (
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Topics <span className="text-muted-foreground font-normal">(optional — leave empty for all)</span>
            </label>
            {topics.length === 0 ? (
              <p className="text-sm text-muted-foreground">This chapter has no topics listed.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topics.map((t) => {
                  const selected = section.topicIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onToggleTopic(t.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        selected
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-border text-foreground hover:bg-muted/40'
                      }`}
                    >
                      <Icon name={selected ? 'CheckCircle2' : 'Circle'} size={14} />
                      {t.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Difficulty</label>
          <select
            className={selectClass}
            value={section.difficulty}
            onChange={(e) => onChangeDifficulty(e.target.value)}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* Count */}
        <div>
          <Input
            label="Number of questions"
            type="number"
            min={1}
            max={MAX_TOTAL_QUESTIONS}
            value={section.count}
            onChange={(e) => onChangeCount(e.target.value)}
            placeholder="e.g. 10"
          />
        </div>
      </div>

      {/* Scope summary */}
      {scopeSummary && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Icon name="Target" size={14} className="text-primary flex-shrink-0" />
          <span>
            Scoped to <span className="text-foreground font-medium">{scopeSummary}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default SelfTestBuilder;
