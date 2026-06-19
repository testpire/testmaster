import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import QuestionCard from './components/QuestionCard';
import ManualQuestionModal from './components/ManualQuestionModal';
import BulkImportModal from './components/BulkImportModal';
import CurriculumTree from './components/CurriculumTree';
import InfiniteScrollSentinel from '../../components/ui/InfiniteScrollSentinel';
import { questionService } from '../../services/questionService';
import { cn } from '../../utils/cn';

const PAGE_SIZE = 20;

const QuestionBank = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const currentUser = userProfile || user;

  // Normalized role check — must match InstituteContext's isSuperAdminRole, since
  // that logic is what actually populates `selectedInstitute` below.
  const normalizedRole = String(currentUser?.role || '').toUpperCase().replace(/-/g, '_');
  const isSuperAdmin = normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'SUPERADMIN';

  // SuperAdmin context for the institute switcher / institute-change refetch.
  // useSuperAdmin() delegates to InstituteContext and never throws, so this is
  // always a context object (its institute fields are only populated for SUPER_ADMIN).
  const superAdminContext = useSuperAdmin();
  
  // Mobile-only disclosure for the curriculum tree (persistent column on lg+).
  const [treeOpen, setTreeOpen] = useState(false);
  const [isManualQuestionModalOpen, setIsManualQuestionModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Used to scroll the list back to the top on a fresh load/filter change.
  // (Infinite scroll itself is driven by an <InfiniteScrollSentinel> observing
  // the viewport, so it works whether the window or this container scrolls.)
  const scrollContainerRef = useRef(null);
  // Synchronous guard so a burst of scroll events can't fire overlapping fetches
  // before the `loadingMore` state has a chance to update.
  const loadingMoreRef = useRef(false);

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    hasMore: false,
    size: 20
  });
  
  // Filter states. Difficulty is the only facet still driven by a control in the
  // header; subject/chapter/topic are driven by the curriculum tree (which simply
  // reports a {subjectId, chapterId, topicId} path it sets into these same fields).
  const [filters, setFilters] = useState({
    difficulty: '',
    subject: '',
    chapter: '',
    topic: ''
  });

  // Human-readable names for the currently selected tree node, used for the scope
  // breadcrumb above the list (filters only carry ids).
  const [selectedPath, setSelectedPath] = useState({ subjectName: '', chapterName: '', topicName: '' });

  // Sort state — backend supports createdAt | updatedAt with asc/desc.
  const [sort, setSort] = useState({ sortBy: 'createdAt', sortDirection: 'desc' });

  // Curriculum (subjects) for the tree's top level and the inline topic editor.
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  // Per-node question counts for the tree (coverage). Coverage is intentionally
  // tab/difficulty-agnostic — it answers "how many questions exist under this
  // node" regardless of the active Published/Draft tab — so it caches cleanly by
  // node key and only resets when the institute changes. The precise count for the
  // *selected* node, scoped to the current tab + difficulty, is always shown by the
  // list header ("Showing X of N"). Fetched lazily as each tree level is revealed.
  const [nodeCounts, setNodeCounts] = useState({});
  const nodeCountsRef = useRef({});
  const countInFlightRef = useRef(new Set());

  // State for questions - starts empty, loads from API
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Published vs Draft tab. New questions are created as drafts; this tab drives
  // the `draftMode` filter sent to the search API.
  const [activeTab, setActiveTab] = useState('published');
  const isDraftTab = activeTab === 'draft';

  // Totals shown on the tabs, scoped to the current filters so they match the list.
  const [counts, setCounts] = useState({ published: 0, draft: 0 });

  // Bulk-publish selection (Draft tab only) + in-flight publish tracking.
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [publishingId, setPublishingId] = useState(null);
  const [bulkPublishing, setBulkPublishing] = useState(false);

  // Shared search params for the active tab — filters + draftMode + sort. The list
  // loads and the tab-count queries both build from this so they can't drift apart.
  // Institute is scoped server-side via the X-Institute-Id header (selected
  // institute for SUPER_ADMIN) or the JWT for other roles — no instituteId needed.
  const buildSearchParams = (page) => {
    const params = {
      page,
      size: PAGE_SIZE,
      sortBy: sort.sortBy,
      sortDirection: sort.sortDirection,
      draftMode: isDraftTab
    };
    if (filters.difficulty) params.difficulty = filters.difficulty;
    if (filters.subject) params.subjectId = filters.subject;
    if (filters.chapter) params.chapterId = filters.chapter;
    if (filters.topic) params.topicId = filters.topic;
    return params;
  };

  // Load a specific page of questions from the backend (replaces the current list).
  const loadQuestions = async (page = 0) => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);

      const result = await questionService.searchQuestions(buildSearchParams(page));
      const { data, pagination: paginationData } = result;

      setSelectedQuestions(data && Array.isArray(data) ? data : []);
      setPagination(
        paginationData || {
          currentPage: page,
          totalPages: 0,
          totalElements: 0,
          hasMore: false,
          size: PAGE_SIZE
        }
      );
      // Fresh load — scroll the list back to the top.
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    } catch (err) {
      // On error, show empty state
      setSelectedQuestions([]);
      setPagination({
        currentPage: 0,
        totalPages: 0,
        totalElements: 0,
        hasMore: false,
        size: PAGE_SIZE
      });
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch the next page and append it to the current list (infinite scroll).
  const loadMoreQuestions = async () => {
    if (!currentUser || loading || loadingMoreRef.current || !pagination.hasMore) return;

    loadingMoreRef.current = true;
    try {
      setLoadingMore(true);

      const result = await questionService.searchQuestions(
        buildSearchParams(pagination.currentPage + 1)
      );
      const { data, pagination: paginationData } = result;

      if (data && Array.isArray(data) && data.length > 0) {
        setSelectedQuestions((prev) => [...prev, ...data]);
      }
      if (paginationData) {
        setPagination(paginationData);
      }
    } catch (err) {
      // Soft-fail: keep what we have, don't surface a hard error for a scroll fetch.
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };

  // Fetch the published & draft totals for the current filters (size:1 — we only
  // need totalElements) so the tabs can show how many questions are in each state.
  const loadCounts = async () => {
    if (!currentUser) return;
    const base = {
      page: 0,
      size: 1,
      sortBy: sort.sortBy,
      sortDirection: sort.sortDirection
    };
    if (filters.difficulty) base.difficulty = filters.difficulty;
    if (filters.subject) base.subjectId = filters.subject;
    if (filters.chapter) base.chapterId = filters.chapter;
    if (filters.topic) base.topicId = filters.topic;

    try {
      const [pub, draft] = await Promise.all([
        questionService.searchQuestions({ ...base, draftMode: false }),
        questionService.searchQuestions({ ...base, draftMode: true })
      ]);
      setCounts({
        published: pub?.pagination?.totalElements || 0,
        draft: draft?.pagination?.totalElements || 0
      });
    } catch (err) {
      // Non-critical — leave the prior counts in place.
    }
  };

  // Load the subject list (tree top level + inline topic editor source).
  const loadSubjects = async () => {
    try {
      setSubjectsLoading(true);
      const { data } = await questionService.getSubjects();
      setSubjects(data || []);
    } catch (error) {
      console.warn('Failed to load subjects:', error);
    } finally {
      setSubjectsLoading(false);
    }
  };

  // Fetch (once) the question count for a tree node and cache it by key. Dedupes
  // in-flight requests via a ref so a burst of expands can't double-fetch. size:1
  // — we only need totalElements. draftMode/difficulty are intentionally omitted
  // so the badge is a stable coverage total (see nodeCounts comment above).
  const ensureNodeCount = useCallback(async (nodeKey, criteria) => {
    if (nodeKey in nodeCountsRef.current || countInFlightRef.current.has(nodeKey)) return;
    countInFlightRef.current.add(nodeKey);
    try {
      const res = await questionService.searchQuestions({ ...criteria, page: 0, size: 1 });
      const total = res?.pagination?.totalElements ?? 0;
      nodeCountsRef.current = { ...nodeCountsRef.current, [nodeKey]: total };
      setNodeCounts(nodeCountsRef.current);
    } finally {
      countInFlightRef.current.delete(nodeKey);
    }
  }, []);

  // Tree node selected → drive the same search filters the old dropdown used.
  // Empty strings clear the deeper levels (e.g. selecting a subject clears any
  // chapter/topic), and "All questions" clears all three.
  const handleTreeSelect = ({ subjectId, subjectName, chapterId, chapterName, topicId, topicName }) => {
    setFilters((prev) => ({ ...prev, subject: subjectId || '', chapter: chapterId || '', topic: topicId || '' }));
    setSelectedPath({ subjectName: subjectName || '', chapterName: chapterName || '', topicName: topicName || '' });
    // On mobile the tree is a disclosure above the list — collapse it once a node
    // is chosen so the results are immediately visible.
    setTreeOpen(false);
  };

  // Load (reset to first page) when a user is present, filters change, or the
  // super-admin switches institute. Keyed on the *presence* of a user rather than
  // the `currentUser` object — otherwise this double-fires on initial load, once
  // when `user` resolves and again when `userProfile` follows (both yield a new
  // object identity for the same person). For a super-admin the list is
  // institute-scoped, so we also wait until an institute is selected to avoid an
  // initial fetch with no/stale institute that is then immediately repeated.
  useEffect(() => {
    if (!currentUser) return;
    // Only SUPER_ADMIN needs to wait for an institute selection (data is institute-
    // scoped via X-Institute-Id). Other roles (e.g. INST_ADMIN) are scoped by their
    // JWT and have no selectedInstitute, so they must not be blocked here.
    if (isSuperAdmin && !superAdminContext?.selectedInstitute?.id) return;
    loadQuestions(0);
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!currentUser, isSuperAdmin, filters, sort, activeTab, superAdminContext?.selectedInstitute?.id]);

  // Load subjects on mount, and refetch when a super-admin switches institute
  // (curriculum is institute-scoped). Keyed on user *presence* to avoid the
  // double-fire as user → userProfile resolves.
  useEffect(() => {
    if (currentUser) {
      loadSubjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!currentUser, superAdminContext?.selectedInstitute?.id]);

  // Enhanced handlers with API integration
  const handleQuestionCreated = () => {
    setIsManualQuestionModalOpen(false);
    setEditingQuestion(null); // Clear editing state
    // Refresh questions from API with fresh pagination after creating a new question
    if (currentUser && !loading) {
      loadQuestions(0);
      loadCounts();
    }
  };
  
  const handleDeleteQuestion = async (questionId) => {
    if (!questionId) return;
    if (!window.confirm('Delete this question? This cannot be undone.')) return;

    // Optimistically remove from UI, keep a copy to restore on failure
    const previous = selectedQuestions;
    setSelectedQuestions(prev => prev.filter(q => q.id !== questionId));

    const { error } = await questionService.deleteQuestion(questionId);
    if (error) {
      // Restore and surface the failure
      setSelectedQuestions(previous);
      setError(error.message || 'Failed to delete question');
    } else {
      setPagination((prev) => ({
        ...prev,
        totalElements: Math.max(0, (prev.totalElements || 0) - 1)
      }));
      loadCounts();
    }
  };

  // Difficulty is the only header-driven facet now (curriculum lives in the tree).
  const handleDifficultyChange = (value) => setFilters((prev) => ({ ...prev, difficulty: value }));

  // Return the tree to "All questions" (clears subject/chapter/topic); difficulty
  // is intentionally left as-is.
  const clearScope = () => handleTreeSelect({ subjectId: '', chapterId: '', topicId: '' });

  const hasScope = !!(filters.subject || filters.chapter || filters.topic);
  const scopeCrumbs = [selectedPath.subjectName, selectedPath.chapterName, selectedPath.topicName].filter(Boolean);

  const handleQuestionEdit = (question) => {
    // Set the editing question for the ManualQuestionModal
    setEditingQuestion(question);
    setIsManualQuestionModalOpen(true);
  };

  // --- Inline difficulty / topic editing ---------------------------------
  // Difficulty and topic are editable in place on each card. The page (not the
  // card) owns the map of unsaved changes, keyed by question id, so a single
  // "Save all" in bulk mode can replay every staged change. `pendingEdits[id]`
  // holds only fields that actually differ from the question's current value.
  const [bulkMode, setBulkMode] = useState(false);
  const [pendingEdits, setPendingEdits] = useState({});
  const [savingRowId, setSavingRowId] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [rowErrors, setRowErrors] = useState({});

  const pendingCount = Object.keys(pendingEdits).length;

  // Merge a field change into the pending map, pruning any field that has been
  // dragged back to the question's original value so the "changed" count and the
  // dirty highlight stay honest.
  const handleFieldChange = (questionId, changes) => {
    setRowErrors((prev) => {
      if (!prev[questionId]) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    setPendingEdits((prev) => {
      const q = selectedQuestions.find((x) => String(x.id) === String(questionId));
      const merged = { ...(prev[questionId] || {}), ...changes };
      const pruned = {};

      const origDifficulty = String(q?.difficultyLevel || '').toUpperCase();
      if (merged.difficultyLevel && String(merged.difficultyLevel).toUpperCase() !== origDifficulty) {
        pruned.difficultyLevel = String(merged.difficultyLevel).toUpperCase();
      }

      // topicId === null is the explicit "revert to original topic" signal.
      const origTopicId = q?.topicId ?? q?.topic ?? '';
      if (
        merged.topicId != null &&
        merged.topicId !== '' &&
        String(merged.topicId) !== String(origTopicId)
      ) {
        pruned.topicId = merged.topicId;
        pruned.topicName = merged.topicName;
      }

      const next = { ...prev };
      if (Object.keys(pruned).length === 0) {
        delete next[questionId];
      } else {
        next[questionId] = pruned;
      }
      return next;
    });
  };

  const clearPending = (questionId) =>
    setPendingEdits((prev) => {
      if (!prev[questionId]) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });

  // Persist one question's staged change. The service re-fetches the full
  // question and merges, so untouched fields (text, options, explanation) are
  // preserved. On success, patch the list item in place and drop it from the
  // pending map.
  const persistEdit = async (questionId, changes) => {
    const result = await questionService.updateQuestionFields(questionId, changes);
    if (!result?.error) {
      setSelectedQuestions((prev) =>
        prev.map((q) =>
          String(q.id) === String(questionId)
            ? {
                ...q,
                ...(changes.difficultyLevel ? { difficultyLevel: changes.difficultyLevel } : {}),
                ...(changes.topicId != null
                  ? { topicId: changes.topicId, topicName: changes.topicName ?? q.topicName }
                  : {})
              }
            : q
        )
      );
    }
    return result;
  };

  const handleSaveRow = async (questionId) => {
    const changes = pendingEdits[questionId];
    if (!changes) return;
    setSavingRowId(questionId);
    const result = await persistEdit(questionId, changes);
    setSavingRowId(null);
    if (result?.error) {
      setRowErrors((prev) => ({ ...prev, [questionId]: result.error.message || 'Failed to save' }));
    } else {
      clearPending(questionId);
    }
  };

  // Save every staged change. Run sequentially so each PUT's load+merge is clean
  // and failures are isolated — successful rows clear, failed rows keep their
  // change + show an inline error so the user can retry just those.
  const handleSaveAll = async () => {
    const ids = Object.keys(pendingEdits);
    if (ids.length === 0 || savingAll) return;
    setSavingAll(true);
    setRowErrors({});
    const errors = {};
    for (const id of ids) {
      const result = await persistEdit(id, pendingEdits[id]);
      if (result?.error) {
        errors[id] = result.error.message || 'Failed to save';
      } else {
        clearPending(id);
      }
    }
    setRowErrors(errors);
    setSavingAll(false);
  };

  const toggleBulkMode = () => {
    // Leaving bulk mode keeps any staged edits — they fall back to per-row Save.
    setBulkMode((prev) => !prev);
  };

  // --- Tabs (Published / Draft) ------------------------------------------
  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    // Staged inline edits and selections are list-specific — drop them so they
    // don't silently apply to the other tab's questions.
    setPendingEdits({});
    setRowErrors({});
    setSelectedIds(new Set());
    setError(null);
    setActiveTab(tab);
  };

  // --- Publish / draft -----------------------------------------------------
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected =
    selectedQuestions.length > 0 && selectedQuestions.every((q) => selectedIds.has(q.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectedQuestions.map((q) => q.id)));
    }
  };

  // After a publish/unpublish, the question no longer matches the active tab's
  // filter, so drop it from the list and keep the counters honest.
  const dropFromList = (questionId, n = 1) => {
    const ids = new Set([].concat(questionId).map(String));
    setSelectedQuestions((prev) => prev.filter((q) => !ids.has(String(q.id))));
    setPagination((prev) => ({
      ...prev,
      totalElements: Math.max(0, (prev.totalElements || 0) - n)
    }));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((sid) => !ids.has(String(sid))));
      return next.size === prev.size ? prev : next;
    });
  };

  // Optimistically move the tab counts when a question flips state.
  const shiftCounts = (publishedDelta, draftDelta) =>
    setCounts((prev) => ({
      published: Math.max(0, prev.published + publishedDelta),
      draft: Math.max(0, prev.draft + draftDelta)
    }));

  // publish === true  → draftMode false (publish); false → draftMode true (unpublish).
  const handlePublishToggle = async (questionId, publish) => {
    if (publishingId != null || bulkPublishing) return;
    setPublishingId(questionId);
    setError(null);
    const result = await questionService.setQuestionDraftMode(questionId, !publish);
    setPublishingId(null);
    if (result?.error) {
      setError(result.error.message || 'Failed to update publish status');
      return;
    }
    dropFromList(questionId);
    shiftCounts(publish ? 1 : -1, publish ? -1 : 1);
  };

  // Bulk publish the selected drafts (Draft tab only). Sequential so failures are
  // isolated; failed ids stay selected for a retry.
  const handleBulkPublish = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || bulkPublishing) return;
    setBulkPublishing(true);
    setError(null);

    const failed = [];
    const succeeded = [];
    for (const id of ids) {
      const result = await questionService.setQuestionDraftMode(id, false); // publish
      if (result?.error) failed.push(id);
      else succeeded.push(id);
    }

    if (succeeded.length > 0) {
      dropFromList(succeeded, succeeded.length);
      shiftCounts(succeeded.length, -succeeded.length);
    }
    setSelectedIds(new Set(failed)); // keep only failures selected for retry
    if (failed.length > 0) {
      setError(`${failed.length} question(s) couldn't be published. Try again.`);
    }
    setBulkPublishing(false);
  };

  // Cache the cascade option lists. Each card's topic editor prefills its current
  // Subject→Chapter→Topic path, and bulk mode expands every card at once — without
  // a cache that's one chapters+topics fetch per card, mostly for the same parents.
  const chaptersCacheRef = useRef({});
  const topicsCacheRef = useRef({});

  const fetchChaptersFor = useCallback(async (subjectId) => {
    if (!subjectId) return [];
    const key = String(subjectId);
    if (chaptersCacheRef.current[key]) return chaptersCacheRef.current[key];
    const { data } = await questionService.getChaptersBySubject(subjectId);
    const list = Array.isArray(data) ? data : [];
    chaptersCacheRef.current[key] = list;
    return list;
  }, []);

  const fetchTopicsFor = useCallback(async (chapterId) => {
    if (!chapterId) return [];
    const key = String(chapterId);
    if (topicsCacheRef.current[key]) return topicsCacheRef.current[key];
    const { data } = await questionService.getTopicsByChapter(chapterId);
    const list = Array.isArray(data) ? data : [];
    topicsCacheRef.current[key] = list;
    return list;
  }, []);

  // A question response only carries topicId/topicName — not its subject/chapter.
  // To prefill the topic editor's cascade we resolve the path upward once per
  // topic (topic -> chapterId, chapter -> subjectId) and cache the result.
  const topicPathCacheRef = useRef({});
  const resolveTopicPath = useCallback(async (topicId) => {
    if (topicId == null || topicId === '') return null;
    const key = String(topicId);
    if (topicPathCacheRef.current[key]) return topicPathCacheRef.current[key];
    const { data: topic } = await questionService.getTopicById(topicId);
    const chapterId = topic?.chapterId ?? null;
    let subjectId = null;
    if (chapterId != null) {
      const { data: chapter } = await questionService.getChapterById(chapterId);
      subjectId = chapter?.subjectId ?? null;
    }
    const path = { subjectId, chapterId, topicId };
    topicPathCacheRef.current[key] = path;
    return path;
  }, []);

  // Curriculum is institute-scoped — drop the cached lists when a super-admin
  // switches institute so a card never shows another institute's chapters/topics.
  useEffect(() => {
    chaptersCacheRef.current = {};
    topicsCacheRef.current = {};
    topicPathCacheRef.current = {};
    // Tree question counts are institute-scoped too — reset so the tree recomputes
    // them for the newly selected institute.
    nodeCountsRef.current = {};
    countInFlightRef.current = new Set();
    setNodeCounts({});
  }, [superAdminContext?.selectedInstitute?.id]);

  const handleQuestionRemove = (index) => {
    setSelectedQuestions(prev => prev?.filter((_, i) => i !== index));
  };

  const handleQuestionReplace = (question) => {
    // Replace question
  };

  const handleQuestionMoveUp = (index) => {
    if (index > 0) {
      setSelectedQuestions(prev => {
        const newQuestions = [...prev];
        [newQuestions[index], newQuestions[index - 1]] = [newQuestions[index - 1], newQuestions[index]];
        return newQuestions;
      });
    }
  };

  const handleQuestionMoveDown = (index) => {
    setSelectedQuestions(prev => {
      if (index < prev.length - 1) {
        const newQuestions = [...prev];
        [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
        return newQuestions;
      }
      return prev;
    });
  };

  return (
    <PageLayout
      title="Question Bank"
      activeRoute="/question-bank"
      showInstituteDropdown={isSuperAdmin}
      institutes={superAdminContext?.allInstitutes || []}
      selectedInstitute={superAdminContext?.selectedInstitute || null}
      onInstituteChange={superAdminContext?.handleInstituteChange || (() => {})}
      institutesLoading={superAdminContext?.institutesLoading || false}
    >
      {/* Bound to the viewport below the fixed 64px (pt-16) header so the tree and
          the question list each scroll independently instead of the whole window. */}
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header Section with Actions and Filters */}
        <div className="bg-background border-b border-border px-4 lg:px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Title and Question Count */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4">
              <h1 className="text-xl lg:text-2xl font-bold text-foreground">Question Bank</h1>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1 lg:mt-0">
                <span>
                  {loading && selectedQuestions.length === 0 ? (
                    'Loading questions...'
                  ) : pagination.totalElements > 0 ? (
                    <>
                      Showing {selectedQuestions.length} of {pagination.totalElements} questions
                    </>
                  ) : (
                    '0 Questions'
                  )}
                </span>
              </div>
            </div>

            {/* Action Buttons and Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              {/* Sort */}
              <div className="flex items-center space-x-2">
                <Icon name="ArrowUpDown" size={16} className="text-muted-foreground hidden sm:block" />
                <select
                  aria-label="Sort questions"
                  value={`${sort.sortBy}|${sort.sortDirection}`}
                  onChange={(e) => {
                    const [sortBy, sortDirection] = e.target.value.split('|');
                    setSort({ sortBy, sortDirection });
                  }}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                >
                  <option value="createdAt|desc">Newest first</option>
                  <option value="createdAt|asc">Oldest first</option>
                  <option value="updatedAt|desc">Recently updated</option>
                  <option value="updatedAt|asc">Least recently updated</option>
                </select>
              </div>

              {/* Difficulty (the only header-driven facet; curriculum lives in the tree) */}
              <div className="flex items-center space-x-2">
                <Icon name="SlidersHorizontal" size={16} className="text-muted-foreground hidden sm:block" />
                <select
                  aria-label="Filter by difficulty"
                  value={filters.difficulty}
                  onChange={(e) => handleDifficultyChange(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                >
                  <option value="">All difficulty</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>

              {/* Mobile-only: open the curriculum tree (persistent column on lg+) */}
              <Button
                variant="outline"
                onClick={() => setTreeOpen((v) => !v)}
                iconName="FolderTree"
                iconPosition="left"
                className="text-sm lg:hidden"
              >
                Topics
              </Button>

              <Button
                variant={bulkMode ? 'default' : 'outline'}
                onClick={toggleBulkMode}
                iconName={bulkMode ? 'Check' : 'PencilLine'}
                iconPosition="left"
                className="text-sm"
                title="Edit difficulty & topic across questions"
              >
                <span className="hidden sm:inline">{bulkMode ? 'Done editing' : 'Bulk edit'}</span>
                <span className="sm:hidden">{bulkMode ? 'Done' : 'Edit'}</span>
              </Button>

              {bulkMode && (
                <Button
                  variant="success"
                  onClick={handleSaveAll}
                  disabled={pendingCount === 0 || savingAll}
                  iconName={savingAll ? 'Loader2' : 'Save'}
                  iconPosition="left"
                  className={`text-sm ${savingAll ? 'animate-pulse' : ''}`}
                >
                  {savingAll
                    ? 'Saving…'
                    : pendingCount > 0
                      ? `Save all (${pendingCount})`
                      : 'Save all'}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => setIsBulkImportModalOpen(true)}
                iconName="Upload"
                iconPosition="left"
                className="text-sm"
              >
                <span className="hidden sm:inline">Bulk Import</span>
                <span className="sm:hidden">Import</span>
              </Button>

              <Button
                variant="primary"
                onClick={() => navigate('/question-bank/add')}
                iconName="Plus"
                iconPosition="left"
                className="text-sm"
              >
                <span className="hidden sm:inline">Add Questions</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Published / Draft tabs */}
        <div className="bg-background border-b border-border px-4 lg:px-6">
          <div className="flex items-center gap-1">
            {[
              { key: 'published', label: 'Published', count: counts.published },
              { key: 'draft', label: 'Draft', count: counts.draft }
            ].map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`relative px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`ml-2 inline-flex items-center justify-center min-w-[1.25rem] px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      tab.key === 'draft' && tab.count > 0
                        ? 'bg-amber-100 text-amber-700'
                        : active
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Two-pane body: curriculum tree (left) + question list (right) */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Curriculum tree — persistent left column on lg; collapsible disclosure
              on mobile (toggled by the "Topics" button). Remounted per institute so
              its expand state / loaded children reset on an institute switch. */}
          <aside
            className={cn(
              'bg-card border-border overflow-y-auto shrink-0',
              'lg:w-72 lg:border-r lg:block lg:max-h-none',
              treeOpen ? 'block max-h-72 border-b' : 'hidden'
            )}
          >
            <CurriculumTree
              key={superAdminContext?.selectedInstitute?.id || 'default'}
              subjects={subjects}
              subjectsLoading={subjectsLoading}
              fetchChapters={fetchChaptersFor}
              fetchTopics={fetchTopicsFor}
              selection={{ subjectId: filters.subject, chapterId: filters.chapter, topicId: filters.topic }}
              onSelect={handleTreeSelect}
              counts={nodeCounts}
              ensureCount={ensureNodeCount}
            />
          </aside>

          {/* Right pane: scope breadcrumb + bulk strip + question list */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Scope breadcrumb — shows the selected tree path with a quick clear */}
            {hasScope && (
              <div className="bg-muted/40 border-b border-border px-4 lg:px-6 py-2 flex items-center gap-2 text-sm">
                <Icon name="FolderTree" size={15} className="text-muted-foreground shrink-0" />
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap text-foreground">
                  {scopeCrumbs.map((name, i) => (
                    <span key={i} className="flex items-center gap-1.5 min-w-0">
                      {i > 0 && <Icon name="ChevronRight" size={13} className="text-muted-foreground shrink-0" />}
                      <span className={cn('truncate', i === scopeCrumbs.length - 1 ? 'font-medium' : 'text-muted-foreground')}>
                        {name}
                      </span>
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={clearScope}
                  className="ml-auto shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Icon name="X" size={13} />
                  Clear
                </button>
              </div>
            )}

        {/* Bulk-publish action strip (Draft tab) */}
        {isDraftTab && !loading && selectedQuestions.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 lg:px-6 py-2 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-amber-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-amber-300 text-primary focus:ring-primary"
              />
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
            </label>
            <Button
              variant="success"
              size="sm"
              onClick={handleBulkPublish}
              disabled={selectedIds.size === 0 || bulkPublishing}
              iconName={bulkPublishing ? 'Loader2' : 'CheckCircle'}
              iconPosition="left"
              className={`text-sm ${bulkPublishing ? 'animate-pulse' : ''}`}
            >
              {bulkPublishing
                ? 'Publishing…'
                : `Publish selected${selectedIds.size ? ` (${selectedIds.size})` : ''}`}
            </Button>
          </div>
        )}

        {/* Questions List */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 lg:p-6"
        >
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Loading questions...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {!loading && !error && selectedQuestions?.length === 0 && (
            <div className="text-center py-12">
              <Icon name="FileText" size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {isDraftTab ? 'No draft questions' : 'No published questions'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isDraftTab
                  ? 'New questions you add appear here as drafts until you publish them.'
                  : counts.draft > 0
                    ? 'Publish questions from the Draft tab to make them available here.'
                    : 'Start by adding your first question or adjust your filters.'}
              </p>
              {!isDraftTab && counts.draft > 0 ? (
                <Button
                  variant="outline"
                  onClick={() => handleTabChange('draft')}
                  iconName="FileText"
                  iconPosition="left"
                >
                  Go to Drafts ({counts.draft})
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => navigate('/question-bank/add')}
                  iconName="Plus"
                  iconPosition="left"
                >
                  {isDraftTab ? 'Add Questions' : 'Add First Question'}
                </Button>
              )}
            </div>
          )}

          {!loading && selectedQuestions?.length > 0 && (
            <>
              <div className="space-y-4">
                {selectedQuestions.map((question, index) => (
                  <QuestionCard
                    key={question?.id || index}
                    question={question}
                    index={index}
                    onEdit={handleQuestionEdit}
                    onRemove={handleQuestionRemove}
                    onReplace={handleQuestionReplace}
                    onMoveUp={handleQuestionMoveUp}
                    onMoveDown={handleQuestionMoveDown}
                    onDelete={() => handleDeleteQuestion(question?.id)}
                    editable
                    bulkMode={bulkMode}
                    subjects={subjects}
                    fetchChapters={fetchChaptersFor}
                    fetchTopics={fetchTopicsFor}
                    resolveTopicPath={resolveTopicPath}
                    pendingEdit={pendingEdits[question?.id] || null}
                    onFieldChange={handleFieldChange}
                    onSaveRow={handleSaveRow}
                    onResetRow={clearPending}
                    savingRow={savingAll || String(savingRowId) === String(question?.id)}
                    rowError={rowErrors[question?.id] || null}
                    onPublish={handlePublishToggle}
                    publishing={
                      String(publishingId) === String(question?.id) ||
                      (bulkPublishing && selectedIds.has(question?.id))
                    }
                    selectable={isDraftTab}
                    selected={selectedIds.has(question?.id)}
                    onToggleSelect={toggleSelect}
                  />
                ))}
              </div>

              {/* Sentinel: fetches the next page when scrolled into view */}
              <InfiniteScrollSentinel
                hasMore={pagination.hasMore}
                loading={loadingMore}
                onLoadMore={loadMoreQuestions}
              />

              {/* Loading more indicator */}
              {loadingMore && (
                <div className="py-8 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground text-sm">Loading more questions...</p>
                </div>
              )}

              {/* End of list indicator */}
              {!pagination.hasMore && !loadingMore && selectedQuestions.length > 0 && (
                <div className="py-6 text-center">
                  <p className="text-muted-foreground text-sm">
                    You've reached the end · {pagination.totalElements} questions total
                  </p>
                </div>
              )}
            </>
          )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}

      {isManualQuestionModalOpen && (
        <ManualQuestionModal
          isOpen={isManualQuestionModalOpen}
          onClose={() => {
            setIsManualQuestionModalOpen(false);
            setEditingQuestion(null);
          }}
          onQuestionAdded={handleQuestionCreated}
          currentUser={currentUser}
          editingQuestion={editingQuestion}
        />
      )}

      {isBulkImportModalOpen && (
        <BulkImportModal
          isOpen={isBulkImportModalOpen}
          onClose={() => setIsBulkImportModalOpen(false)}
          onQuestionsImported={() => {
            // Keep the modal open so the upload summary (counts + row errors) stays
            // visible; the user closes it manually. Just refresh the list underneath.
            if (currentUser && !loading) {
              loadQuestions(0);
              loadCounts();
            }
          }}
        />
      )}
    </PageLayout>
  );
};

export default QuestionBank;