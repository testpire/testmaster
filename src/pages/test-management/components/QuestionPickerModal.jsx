import React, { useState, useEffect, useRef, useMemo } from 'react';
import { newTestService } from '../../../services/newTestService';
import { questionService } from '../../../services/questionService';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import MathText from '../../../components/MathText';
import { resolveImagePath } from '../testConstants';

const PAGE_SIZE = 20;
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

// Curate the questions on a test. Browse the institute's question bank (left),
// pick questions and tune their per-question marks / negative marks (right), then
// save the whole set via POST /tests/{id}/questions (replaces the question list).
const QuestionPickerModal = ({ isOpen, onClose, onSuccess, test }) => {
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 0, hasMore: false });
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState({ subjectId: '', difficulty: '' });

  // selected: Map keyed by questionId → { questionId, marks, negativeMarks, sortOrder, text, questionImagePath, questionType }
  const [selected, setSelected] = useState(new Map());

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const loadingMoreRef = useRef(false);

  // Seed the selection from the test's existing questions when opening.
  useEffect(() => {
    if (!isOpen) return;
    const seed = new Map();
    (test?.questions || []).forEach((q, i) => {
      seed.set(q.questionId, {
        questionId: q.questionId,
        marks: q.marks ?? 1,
        negativeMarks: q.negativeMarks ?? 0,
        sortOrder: q.sortOrder ?? i + 1,
        text: q.text,
        textFormat: q.textFormat,
        questionImagePath: q.questionImagePath,
        questionType: q.questionType
      });
    });
    setSelected(seed);
    setFilters({ subjectId: '', difficulty: '' });
    setError('');
    loadSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, test?.id]);

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

  const buildParams = (page) => {
    const p = { page, size: PAGE_SIZE };
    if (filters.subjectId) p.subjectId = filters.subjectId;
    if (filters.difficulty) p.difficulty = filters.difficulty;
    return p;
  };

  const loadQuestions = async (page) => {
    try {
      setLoading(page === 0);
      const { data, pagination: pg } = await questionService.searchQuestions(buildParams(page));
      const list = Array.isArray(data) ? data : [];
      setQuestions((prev) => (page === 0 ? list : [...prev, ...list]));
      setPagination({ currentPage: pg?.currentPage ?? page, hasMore: !!pg?.hasMore });
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

  const toggle = (q) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(q.id)) {
        next.delete(q.id);
      } else {
        next.set(q.id, {
          questionId: q.id,
          // Default per-question marks from the question's own values.
          marks: q.marks ?? 1,
          negativeMarks: q.negativeMarks ?? 0,
          sortOrder: next.size + 1,
          text: q.text,
          textFormat: q.textFormat,
          questionImagePath: q.questionImagePath,
          questionType: q.questionType
        });
      }
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

  const selectedList = useMemo(
    () => Array.from(selected.values()).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [selected]
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

  if (!isOpen) return null;

  const inputCls =
    'px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg border border-border shadow-lg w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Manage Questions</h2>
            <p className="text-sm text-muted-foreground">{test?.title}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Icon name="X" size={24} />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center space-x-2">
            <Icon name="AlertCircle" size={16} className="text-destructive" />
            <p className="text-destructive text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* LEFT: question bank browser */}
          <div className="flex-1 flex flex-col border-r border-border min-h-0">
            <div className="p-3 border-b border-border flex flex-wrap gap-2">
              <select
                value={filters.subjectId}
                onChange={(e) => setFilters((f) => ({ ...f, subjectId: e.target.value }))}
                className={inputCls}
              >
                <option value="">All subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.difficulty}
                onChange={(e) => setFilters((f) => ({ ...f, difficulty: e.target.value }))}
                className={inputCls}
              >
                <option value="">All difficulty</option>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d.charAt(0) + d.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              )}
              {!loading && questions.length === 0 && (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No questions found. Add questions in the Question Bank first.
                </div>
              )}
              {questions.map((q) => {
                const isSel = selected.has(q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => toggle(q)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isSel
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon
                        name={isSel ? 'CheckSquare' : 'Square'}
                        size={18}
                        className={isSel ? 'text-primary mt-0.5' : 'text-muted-foreground mt-0.5'}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground line-clamp-2">
                          <MathText text={q.text || `Question #${q.id}`} textFormat={q.textFormat} />
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                          {q.topicName && <span>📚 {q.topicName}</span>}
                          {q.difficultyLevel && <span>⚡ {q.difficultyLevel}</span>}
                          <span>★ {q.marks ?? 1} marks</span>
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
                );
              })}
              {loadingMore && (
                <div className="flex items-center justify-center py-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: selected questions with per-question marks */}
          <div className="w-full lg:w-96 flex flex-col min-h-0">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Selected ({selected.size})
              </span>
              <span className="text-sm text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{totalMarks}</span> marks
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {selectedList.length === 0 && (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  Pick questions from the left to build this test.
                </div>
              )}
              {selectedList.map((q, i) => (
                <div key={q.questionId} className="p-3 rounded-lg border border-border bg-background">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-foreground line-clamp-2 flex-1">
                      <span className="text-muted-foreground mr-1">{i + 1}.</span>
                      <MathText text={q.text || `Question #${q.questionId}`} textFormat={q.textFormat} />
                    </p>
                    <button
                      onClick={() => removeSelected(q.questionId)}
                      className="text-destructive hover:opacity-70"
                      title="Remove"
                    >
                      <Icon name="Trash2" size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <label className="text-xs text-muted-foreground">
                      Marks
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={q.marks}
                        onChange={(e) => updateSelectedField(q.questionId, 'marks', e.target.value)}
                        className={`${inputCls} w-full mt-1`}
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
                        className={`${inputCls} w-full mt-1`}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end space-x-3">
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
        </div>
      </div>
    </div>
  );
};

export default QuestionPickerModal;
