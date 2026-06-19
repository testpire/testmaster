import React, { useState, useEffect, useRef, useMemo } from 'react';
import { newTestService } from '../../../services/newTestService';
import { questionService } from '../../../services/questionService';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Select from '../../../components/ui/Select';
import MathText from '../../../components/MathText';
import { resolveImagePath } from '../testConstants';

const PAGE_SIZE = 20;
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

// Difficulty → badge colors, shared by both panels.
const DIFFICULTY_STYLES = {
  EASY: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HARD: 'bg-red-100 text-red-700'
};

const titleCase = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : '');

// Curate the questions on a test. Browse the institute's question bank (left),
// narrow it with the Subject → Chapter → Topic + difficulty + text filters,
// pick questions and tune their per-question marks / negative marks / order on
// the right, then save the whole set via POST /tests/{id}/questions (replaces
// the question list).
const QuestionPickerModal = ({ isOpen, onClose, onSuccess, test }) => {
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 0, hasMore: false, totalElements: 0 });

  // Cascade filter option lists.
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Active filters that drive the search. searchText is debounced from searchInput.
  const [filters, setFilters] = useState({
    subjectId: '',
    chapterId: '',
    topicId: '',
    difficulty: '',
    searchText: ''
  });
  const [searchInput, setSearchInput] = useState('');

  // selected: Map keyed by questionId → { questionId, marks, negativeMarks, sortOrder, text, questionImagePath, questionType, difficultyLevel, topicName }
  const [selected, setSelected] = useState(new Map());

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const loadingMoreRef = useRef(false);

  // Seed the selection from the test's existing questions when opening. The test
  // row coming from the list only carries a questionCount (not the full question
  // set), so fetch the test detail to recover previously-added questions and show
  // them in the "Selected" panel.
  useEffect(() => {
    if (!isOpen) return;
    setFilters({ subjectId: '', chapterId: '', topicId: '', difficulty: '', searchText: '' });
    setSearchInput('');
    setChapters([]);
    setTopics([]);
    setError('');
    loadSubjects();
    seedSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, test?.id]);

  const seedSelection = async () => {
    setSeeding(true);
    try {
      let existing =
        Array.isArray(test?.questions) && test.questions.length > 0
          ? test.questions
          : null;
      if (!existing && test?.id != null) {
        const { data } = await newTestService.getTest(test.id);
        existing = Array.isArray(data?.questions) ? data.questions : [];
      }
      const seed = new Map();
      (existing || []).forEach((q, i) => {
        const qid = q.questionId ?? q.id;
        if (qid == null) return;
        seed.set(qid, {
          questionId: qid,
          marks: q.marks ?? 1,
          negativeMarks: q.negativeMarks ?? 0,
          sortOrder: q.sortOrder ?? i + 1,
          text: q.text,
          textFormat: q.textFormat,
          questionImagePath: q.questionImagePath,
          questionType: q.questionType,
          difficultyLevel: q.difficultyLevel,
          topicName: q.topicName
        });
      });
      setSelected(seed);
    } finally {
      setSeeding(false);
    }
  };

  // Debounce the free-text box into the active filter (which triggers a reload).
  useEffect(() => {
    if (!isOpen) return undefined;
    const t = setTimeout(() => {
      setFilters((f) => (f.searchText === searchInput ? f : { ...f, searchText: searchInput }));
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput, isOpen]);

  // Reload the question list whenever filters change (while open).
  useEffect(() => {
    if (isOpen) loadQuestions(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, filters]);

  const loadSubjects = async () => {
    try {
      const { data } = await questionService.getSubjects();
      setSubjects(Array.isArray(data) ? data : []);
    } catch {
      setSubjects([]);
    }
  };

  const loadChapters = async (subjectId) => {
    setLoadingChapters(true);
    try {
      const { data } = await questionService.getChaptersBySubject(subjectId);
      setChapters(Array.isArray(data) ? data : []);
    } catch {
      setChapters([]);
    } finally {
      setLoadingChapters(false);
    }
  };

  const loadTopics = async (chapterId) => {
    setLoadingTopics(true);
    try {
      const { data } = await questionService.getTopicsByChapter(chapterId);
      setTopics(Array.isArray(data) ? data : []);
    } catch {
      setTopics([]);
    } finally {
      setLoadingTopics(false);
    }
  };

  // Cascade handlers: changing a parent clears its descendants so the search
  // never carries a stale chapter/topic from a different subject.
  const handleSubjectChange = (val) => {
    setFilters((f) => ({ ...f, subjectId: val || '', chapterId: '', topicId: '' }));
    setChapters([]);
    setTopics([]);
    if (val) loadChapters(val);
  };

  const handleChapterChange = (val) => {
    setFilters((f) => ({ ...f, chapterId: val || '', topicId: '' }));
    setTopics([]);
    if (val) loadTopics(val);
  };

  const handleTopicChange = (val) => setFilters((f) => ({ ...f, topicId: val || '' }));
  const handleDifficultyChange = (val) => setFilters((f) => ({ ...f, difficulty: val || '' }));

  const clearFilters = () => {
    setFilters({ subjectId: '', chapterId: '', topicId: '', difficulty: '', searchText: '' });
    setSearchInput('');
    setChapters([]);
    setTopics([]);
  };

  const activeFilterCount = useMemo(
    () => ['subjectId', 'chapterId', 'topicId', 'difficulty', 'searchText'].filter((k) => filters[k]).length,
    [filters]
  );

  const buildParams = (page) => {
    // Only published questions can be added to a test — drafts are hidden here.
    const p = { page, size: PAGE_SIZE, draftMode: false };
    if (filters.subjectId) p.subjectId = filters.subjectId;
    if (filters.chapterId) p.chapterId = filters.chapterId;
    if (filters.topicId) p.topicId = filters.topicId;
    if (filters.difficulty) p.difficulty = filters.difficulty;
    if (filters.searchText) p.searchText = filters.searchText;
    return p;
  };

  const loadQuestions = async (page) => {
    try {
      setLoading(page === 0);
      const { data, pagination: pg } = await questionService.searchQuestions(buildParams(page));
      const list = Array.isArray(data) ? data : [];
      setQuestions((prev) => (page === 0 ? list : [...prev, ...list]));
      setPagination({
        currentPage: pg?.currentPage ?? page,
        hasMore: !!pg?.hasMore,
        totalElements: pg?.totalElements ?? list.length
      });
      if (page === 0 && listRef.current) listRef.current.scrollTop = 0;
    } catch {
      if (page === 0) setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loading || loadingMoreRef.current || !pagination.hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      await loadQuestions(pagination.currentPage + 1);
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };

  const handleScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 150) loadMore();
  };

  // Build the "selected" entry for a question from the bank, carrying the display
  // metadata (difficulty/topic) so the right panel can render badges too.
  const toSelectedEntry = (q, sortOrder) => ({
    questionId: q.id,
    // Default per-question marks from the question's own values.
    marks: q.marks ?? 1,
    negativeMarks: q.negativeMarks ?? 0,
    sortOrder,
    text: q.text,
    textFormat: q.textFormat,
    questionImagePath: q.questionImagePath,
    questionType: q.questionType,
    difficultyLevel: q.difficultyLevel,
    topicName: q.topicName
  });

  const toggle = (q) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(q.id)) next.delete(q.id);
      else next.set(q.id, toSelectedEntry(q, next.size + 1));
      return next;
    });
  };

  // Add every question currently visible in the bank (those not already added).
  const addAllVisible = () => {
    setSelected((prev) => {
      const next = new Map(prev);
      let order = next.size;
      availableQuestions.forEach((q) => {
        if (!next.has(q.id)) {
          order += 1;
          next.set(q.id, toSelectedEntry(q, order));
        }
      });
      return next;
    });
  };

  const updateSelectedField = (questionId, key, value) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const item = next.get(questionId);
      if (item) next.set(questionId, { ...item, [key]: value });
      return next;
    });
  };

  const removeSelected = (questionId) => {
    setSelected((prev) => {
      const next = new Map(prev);
      next.delete(questionId);
      return next;
    });
  };

  // Reorder a selected question by swapping it with its neighbour, then
  // renumbering sortOrder 1..n so the order persists exactly as displayed.
  const moveSelected = (questionId, dir) => {
    setSelected((prev) => {
      const arr = Array.from(prev.values()).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      const i = arr.findIndex((x) => x.questionId === questionId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return prev;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      const next = new Map();
      arr.forEach((item, idx) => next.set(item.questionId, { ...item, sortOrder: idx + 1 }));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Map());

  const selectedList = useMemo(
    () => Array.from(selected.values()).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [selected]
  );

  // Hide questions already on this test from the bank browser — the left panel
  // shows only what can still be added; the right panel is the test's set.
  const availableQuestions = useMemo(
    () => questions.filter((q) => !selected.has(q.id)),
    [questions, selected]
  );

  const totalMarks = useMemo(
    () => selectedList.reduce((sum, q) => sum + (Number(q.marks) || 0), 0),
    [selectedList]
  );

  const handleSave = async () => {
    setError('');
    if (selected.size === 0) {
      setError('Select at least one question, or close without saving.');
      return;
    }
    // Normalise sortOrder to 1..n in current display order.
    const payload = selectedList.map((q, i) => ({
      questionId: q.questionId,
      marks: Number(q.marks) || 0,
      negativeMarks: Number(q.negativeMarks) || 0,
      sortOrder: i + 1
    }));
    try {
      setSaving(true);
      const { data, error: saveErr } = await newTestService.setQuestions(test.id, payload);
      if (saveErr) {
        setError(saveErr.message || 'Failed to save questions');
        return;
      }
      onSuccess?.(data);
      onClose?.();
    } catch (err) {
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  // Filter option lists for the shared Select.
  const subjectOptions = useMemo(() => subjects.map((s) => ({ value: s.id, label: s.name })), [subjects]);
  const chapterOptions = useMemo(() => chapters.map((c) => ({ value: c.id, label: c.name })), [chapters]);
  const topicOptions = useMemo(() => topics.map((t) => ({ value: t.id, label: t.name })), [topics]);
  const difficultyOptions = DIFFICULTIES.map((d) => ({ value: d, label: titleCase(d) }));

  const searchCls =
    'w-full pl-9 pr-3 h-10 border border-input rounded-md bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
  const marksInputCls =
    'w-full mt-1 px-2 py-1 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

  const DifficultyBadge = ({ level }) =>
    level ? (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${DIFFICULTY_STYLES[level] || 'bg-muted text-muted-foreground'}`}>
        {titleCase(level)}
      </span>
    ) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Questions"
      description={test?.title}
      size="full"
      className="max-w-[1400px]"
      footer={
        <>
          <span className="mr-auto text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{selected.size}</span> selected ·{' '}
            <span className="font-semibold text-foreground">{totalMarks}</span> marks
          </span>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleSave}
            disabled={saving}
            iconName={saving ? 'Loader2' : 'Save'}
            iconPosition="left"
            className={saving ? 'animate-pulse' : ''}
          >
            {saving ? 'Saving...' : 'Save Questions'}
          </Button>
        </>
      }
    >
      {error && (
        <div className="-mt-4 mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center space-x-2">
          <Icon name="AlertCircle" size={16} className="text-destructive" />
          <p className="text-destructive text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="-mx-6 -my-4 flex flex-col h-[calc(90vh-8rem)] min-h-0">
        {/* FILTER BAR */}
        <div className="px-4 py-3 border-b border-border bg-muted/20 flex-shrink-0">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-foreground mb-2 block">Search</label>
              <div className="relative">
                <Icon
                  name="Search"
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search question text..."
                  className={searchCls}
                />
              </div>
            </div>

            <div className="w-full sm:w-44">
              <Select
                label="Subject"
                options={subjectOptions}
                value={filters.subjectId}
                onChange={handleSubjectChange}
                placeholder="All subjects"
                searchable
                clearable
              />
            </div>

            <div className="w-full sm:w-44">
              <Select
                label="Chapter"
                options={chapterOptions}
                value={filters.chapterId}
                onChange={handleChapterChange}
                placeholder={filters.subjectId ? 'All chapters' : 'Select subject first'}
                disabled={!filters.subjectId || loadingChapters}
                loading={loadingChapters}
                searchable
                clearable
              />
            </div>

            <div className="w-full sm:w-44">
              <Select
                label="Topic"
                options={topicOptions}
                value={filters.topicId}
                onChange={handleTopicChange}
                placeholder={filters.chapterId ? 'All topics' : 'Select chapter first'}
                disabled={!filters.chapterId || loadingTopics}
                loading={loadingTopics}
                searchable
                clearable
              />
            </div>

            <div className="w-full sm:w-40">
              <Select
                label="Difficulty"
                options={difficultyOptions}
                value={filters.difficulty}
                onChange={handleDifficultyChange}
                placeholder="All difficulty"
                clearable
              />
            </div>

            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={clearFilters}
                iconName="X"
                iconPosition="left"
                className="h-10"
              >
                Clear ({activeFilterCount})
              </Button>
            )}
          </div>
        </div>

        {/* BODY: bank browser (left) + selected (right) */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* LEFT: question bank browser */}
          <div className="flex-1 flex flex-col border-r border-border min-h-0">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 text-sm">
                <Icon name="Library" size={16} className="text-muted-foreground" />
                <span className="font-medium text-foreground">Question Bank</span>
                {!loading && (
                  <span className="text-muted-foreground">
                    · {availableQuestions.length} available
                    {pagination.totalElements ? ` of ${pagination.totalElements}` : ''}
                  </span>
                )}
              </div>
              {availableQuestions.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAllVisible}
                  iconName="ListPlus"
                  iconPosition="left"
                >
                  Add all shown
                </Button>
              )}
            </div>

            <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              )}
              {!loading && availableQuestions.length === 0 && (
                <div className="flex flex-col items-center text-center py-12 text-muted-foreground">
                  <Icon name="SearchX" size={28} className="mb-2 opacity-60" />
                  <p className="text-sm">
                    {questions.length === 0
                      ? activeFilterCount > 0
                        ? 'No questions match these filters.'
                        : 'No questions found. Add questions in the Question Bank first.'
                      : 'All matching questions are already added to this test.'}
                  </p>
                  {activeFilterCount > 0 && questions.length === 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-2 text-sm text-primary hover:underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
              {availableQuestions.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => toggle(q)}
                  className="group w-full text-left p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon name="Plus" size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground line-clamp-2">
                        <MathText text={q.text || `Question #${q.id}`} textFormat={q.textFormat} />
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                        <DifficultyBadge level={q.difficultyLevel} />
                        {q.questionType && (
                          <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium uppercase tracking-wide">
                            {q.questionType}
                          </span>
                        )}
                        {q.topicName && (
                          <span className="inline-flex items-center gap-1">
                            <Icon name="Tag" size={12} /> {q.topicName}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Icon name="Star" size={12} /> {q.marks ?? 1} marks
                        </span>
                      </div>
                      {q.questionImagePath && (
                        <img
                          src={resolveImagePath(q.questionImagePath)}
                          alt=""
                          className="mt-2 max-h-24 rounded border border-border"
                          onError={(e) => (e.target.style.display = 'none')}
                        />
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {loadingMore && (
                <div className="flex items-center justify-center py-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: selected questions with per-question marks + order */}
          <div className="w-full lg:w-[26rem] flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 text-sm">
                <Icon name="ListChecks" size={16} className="text-muted-foreground" />
                <span className="font-medium text-foreground">Selected ({selected.size})</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">{totalMarks}</span>
                </span>
                {selected.size > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-xs text-destructive hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {seeding && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              )}
              {!seeding && selectedList.length === 0 && (
                <div className="flex flex-col items-center text-center py-12 text-muted-foreground">
                  <Icon name="MousePointerClick" size={28} className="mb-2 opacity-60" />
                  <p className="text-sm">Pick questions from the left to build this test.</p>
                </div>
              )}
              {selectedList.map((q, i) => (
                <div key={q.questionId} className="p-3 rounded-lg border border-border bg-background">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded bg-muted px-1 text-xs font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <p className="text-xs text-foreground line-clamp-2 flex-1">
                      <MathText text={q.text || `Question #${q.questionId}`} textFormat={q.textFormat} />
                    </p>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => moveSelected(q.questionId, -1)}
                        disabled={i === 0}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <Icon name="ChevronUp" size={14} />
                      </button>
                      <button
                        onClick={() => moveSelected(q.questionId, 1)}
                        disabled={i === selectedList.length - 1}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <Icon name="ChevronDown" size={14} />
                      </button>
                      <button
                        onClick={() => removeSelected(q.questionId)}
                        className="p-1 text-destructive hover:opacity-70"
                        title="Remove"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                  </div>
                  {(q.difficultyLevel || q.topicName) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 ml-7 text-[11px] text-muted-foreground">
                      <DifficultyBadge level={q.difficultyLevel} />
                      {q.topicName && (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="Tag" size={11} /> {q.topicName}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-2 ml-7">
                    <label className="text-xs text-muted-foreground">
                      Marks
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={q.marks}
                        onChange={(e) => updateSelectedField(q.questionId, 'marks', e.target.value)}
                        className={marksInputCls}
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Negative
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={q.negativeMarks}
                        onChange={(e) => updateSelectedField(q.questionId, 'negativeMarks', e.target.value)}
                        className={marksInputCls}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default QuestionPickerModal;
