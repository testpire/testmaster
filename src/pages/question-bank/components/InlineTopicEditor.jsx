import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Select from '../../../components/ui/Select';
import { questionService } from '../../../services/questionService';

// Compact inline Subject -> Chapter -> Topic picker used inside a QuestionCard.
// Topics are scoped under chapters, so re-assigning one means walking the
// cascade. The control is collapsed by default (just shows the current topic +
// a "Change" affordance) and only fetches the hierarchy once the user expands
// it, so rendering it on every card in a long list stays cheap.
//
// On first expand it PREFILLS the question's existing Subject/Chapter/Topic so
// the dropdowns open already pointing at the current values (the user only has
// to change what they want), instead of forcing a re-pick from scratch.
//
// Subjects are passed in from the parent (it already loads them for the filter
// bar). Chapter/topic option lists come from parent-provided loaders that cache
// across cards; we fall back to the service if no loader is supplied.
//
// State ownership: this component owns the *cascade selection* + its fetch
// state. The chosen topic is lifted to the parent via onChange(topicId, name);
// whether a change is currently staged is told to us via `pendingTopicId`.
const toOptions = (items) =>
  (items || []).map((it) => ({
    value: it?.id?.toString(),
    label: `${it?.name}${it?.code ? ` (${it.code})` : ''}`
  }));

const InlineTopicEditor = ({
  subjects: subjectsProp = [],
  fetchChapters,
  fetchTopics,
  resolveTopicPath,
  currentTopicName,
  originalTopicName,
  pendingTopicId = null,
  initialSubjectId = null,
  initialChapterId = null,
  initialTopicId = null,
  disabled = false,
  defaultExpanded = false,
  onChange,
  onRevert
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Follow the parent's default (e.g. bulk-edit mode auto-expands every card),
  // but only when that default actually flips — so a user's manual collapse of a
  // single row isn't clobbered by unrelated re-renders.
  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  const [subjects, setSubjects] = useState(subjectsProp);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Keep our local subjects in sync if the parent supplies them after mount.
  useEffect(() => {
    if (subjectsProp && subjectsProp.length > 0) setSubjects(subjectsProp);
  }, [subjectsProp]);

  // Loaders: prefer the parent's cached loaders, fall back to the service so the
  // component still works standalone.
  const loadChapters = async (sid) => {
    if (!sid) return [];
    if (fetchChapters) return (await fetchChapters(sid)) || [];
    const { data } = await questionService.getChaptersBySubject(sid);
    return Array.isArray(data) ? data : [];
  };

  const loadTopics = async (cid) => {
    if (!cid) return [];
    if (fetchTopics) return (await fetchTopics(cid)) || [];
    const { data } = await questionService.getTopicsByChapter(cid);
    return Array.isArray(data) ? data : [];
  };

  // Lazily fetch subjects the first time the cascade is opened, only if the
  // parent didn't hand us a list.
  useEffect(() => {
    if (!expanded || subjects.length > 0 || loadingSubjects) return;
    let cancelled = false;
    (async () => {
      setLoadingSubjects(true);
      const { data } = await questionService.getSubjects();
      if (!cancelled) setSubjects(Array.isArray(data) ? data : []);
      setLoadingSubjects(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  // Resolve the question's full Subject→Chapter→Topic path and select it, loading
  // each level's option list so the dropdowns render labels (not bare ids).
  // A question only carries topicId — subject/chapter are resolved upward via
  // resolveTopicPath when not already supplied. `isStale` lets a caller abort if
  // the editor unmounts mid-flight.
  const loadPathAndSelect = async (isStale) => {
    if (initialTopicId == null || initialTopicId === '') return;
    let sid = initialSubjectId != null ? String(initialSubjectId) : '';
    let cid = initialChapterId != null ? String(initialChapterId) : '';
    const tid = String(initialTopicId);

    if ((!sid || !cid) && resolveTopicPath) {
      const path = await resolveTopicPath(initialTopicId);
      if (isStale?.()) return;
      if (path) {
        if (!sid && path.subjectId != null) sid = String(path.subjectId);
        if (!cid && path.chapterId != null) cid = String(path.chapterId);
      }
    }

    if (sid) {
      setLoadingChapters(true);
      const ch = await loadChapters(sid);
      if (isStale?.()) return;
      setChapters(ch);
      setLoadingChapters(false);
    }
    if (cid) {
      setLoadingTopics(true);
      const tp = await loadTopics(cid);
      if (isStale?.()) return;
      setTopics(tp);
      setLoadingTopics(false);
    }
    if (isStale?.()) return;
    setSubjectId(sid);
    setChapterId(cid);
    setTopicId(tid);
  };

  // Prefill on first expand, so the dropdowns open already pointing at the
  // current values. Runs once: after this the local selection persists across
  // collapse/expand (the component stays mounted), so we never clobber a change
  // the user has since made.
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (!expanded || prefilledRef.current) return;
    prefilledRef.current = true;
    let cancelled = false;
    loadPathAndSelect(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const handleSubjectChange = async (value) => {
    setSubjectId(value);
    setChapterId('');
    setTopicId('');
    setChapters([]);
    setTopics([]);
    if (!value) return;
    setLoadingChapters(true);
    setChapters(await loadChapters(value));
    setLoadingChapters(false);
  };

  const handleChapterChange = async (value) => {
    setChapterId(value);
    setTopicId('');
    setTopics([]);
    if (!value) return;
    setLoadingTopics(true);
    setTopics(await loadTopics(value));
    setLoadingTopics(false);
  };

  const handleTopicChange = (value) => {
    setTopicId(value);
    if (!value) {
      onRevert?.();
      return;
    }
    const name = topics.find((t) => String(t?.id) === String(value))?.name;
    onChange?.(value, name);
  };

  // Clear the staged change and restore the dropdowns to the question's original
  // path (the user may have navigated away). Path lookups + lists are cached at
  // the parent, so this is cheap.
  const revertTopic = async () => {
    onRevert?.();
    await loadPathAndSelect();
  };

  if (!expanded) {
    return (
      <div className="flex items-center gap-2">
        <Icon name="Tag" size={12} />
        <span className={pendingTopicId ? 'text-foreground font-medium' : ''}>
          {currentTopicName || 'Unassigned'}
        </span>
        {pendingTopicId && (
          <span className="text-[10px] font-medium text-warning bg-warning/10 border border-warning/30 rounded px-1">
            changed
          </span>
        )}
        <button
          type="button"
          onClick={() => setExpanded(true)}
          disabled={disabled}
          className="text-primary hover:underline disabled:opacity-50"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">
          {pendingTopicId ? 'New topic staged' : 'Topic'}
        </span>
        <div className="flex items-center gap-3">
          {pendingTopicId && (
            <button
              type="button"
              onClick={revertTopic}
              disabled={disabled}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
            >
              Revert to “{originalTopicName || 'Unassigned'}”
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(false)}
            disabled={disabled}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
          >
            Collapse
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Select
          value={subjectId}
          onChange={handleSubjectChange}
          options={toOptions(subjects)}
          placeholder={loadingSubjects ? 'Loading…' : 'Subject'}
          disabled={disabled || loadingSubjects}
          searchable
        />
        <Select
          value={chapterId}
          onChange={handleChapterChange}
          options={toOptions(chapters)}
          placeholder={loadingChapters ? 'Loading…' : 'Chapter'}
          disabled={disabled || !subjectId || loadingChapters}
          searchable
        />
        <Select
          value={topicId}
          onChange={handleTopicChange}
          options={toOptions(topics)}
          placeholder={loadingTopics ? 'Loading…' : 'Topic'}
          disabled={disabled || !chapterId || loadingTopics}
          searchable
        />
      </div>
    </div>
  );
};

export default InlineTopicEditor;
