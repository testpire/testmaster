import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../../../components/AppIcon';
import { cn } from '../../../utils/cn';

// Subject → Chapter → Topic navigation tree for the Question Bank. It is purely a
// nicer UI for the curriculum filter: selecting a node reports the full
// {subjectId, chapterId, topicId} path up via onSelect, and the page feeds that
// into the same search filters the old dropdown drove. Children are lazy-loaded
// on expand (reusing the page's cached fetchChapters/fetchTopics), and per-node
// question counts are fetched lazily via ensureCount as each level is revealed.
const keyOf = {
  all: () => 'all',
  subject: (id) => `s:${id}`,
  chapter: (id) => `c:${id}`,
  topic: (id) => `t:${id}`
};

const CountBadge = ({ value }) => {
  if (value === undefined) return null;
  return (
    <span
      className={cn(
        'ml-auto shrink-0 text-xs tabular-nums rounded-full px-1.5 py-0.5',
        value === 0 ? 'text-muted-foreground/50' : 'text-muted-foreground bg-muted'
      )}
    >
      {value}
    </span>
  );
};

const Row = ({
  depth = 0,
  icon,
  label,
  count,
  active,
  expandable = false,
  expanded = false,
  loading = false,
  onClick,
  onToggle
}) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    className={cn(
      'w-full flex items-center gap-1.5 pr-2 py-1.5 rounded-md text-sm text-left transition-colors',
      active ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'
    )}
    style={{ paddingLeft: `${depth * 14 + 6}px` }}
  >
    {expandable ? (
      <span
        role="button"
        tabIndex={-1}
        aria-label={expanded ? 'Collapse' : 'Expand'}
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.();
        }}
        className="shrink-0 -ml-0.5 p-0.5 rounded hover:bg-black/10"
      >
        <Icon
          name={loading ? 'Loader2' : expanded ? 'ChevronDown' : 'ChevronRight'}
          size={14}
          className={cn('text-muted-foreground', loading && 'animate-spin')}
        />
      </span>
    ) : (
      <span className="shrink-0 w-[18px]" />
    )}
    <Icon name={icon} size={15} className={cn('shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
    <span className="truncate">{label}</span>
    <CountBadge value={count} />
  </button>
);

const CurriculumTree = ({
  subjects = [],
  subjectsLoading = false,
  fetchChapters,
  fetchTopics,
  selection = { subjectId: '', chapterId: '', topicId: '' },
  onSelect,
  counts = {},
  ensureCount
}) => {
  const [openSubjects, setOpenSubjects] = useState(() => new Set());
  const [openChapters, setOpenChapters] = useState(() => new Set());
  const [chaptersBySubject, setChaptersBySubject] = useState({});
  const [topicsByChapter, setTopicsByChapter] = useState({});
  const [loadingSubject, setLoadingSubject] = useState(() => new Set());
  const [loadingChapter, setLoadingChapter] = useState(() => new Set());

  const sel = {
    subjectId: selection.subjectId ? String(selection.subjectId) : '',
    chapterId: selection.chapterId ? String(selection.chapterId) : '',
    topicId: selection.topicId ? String(selection.topicId) : ''
  };

  const allActive = !sel.subjectId && !sel.chapterId && !sel.topicId;
  const isSubjectActive = (id) => sel.subjectId === String(id) && !sel.chapterId && !sel.topicId;
  const isChapterActive = (id) => sel.chapterId === String(id) && !sel.topicId;
  const isTopicActive = (id) => sel.topicId === String(id);

  // Root + every (always-visible) subject get counts up front; deeper nodes are
  // counted as they're revealed by an expand.
  useEffect(() => {
    ensureCount?.(keyOf.all(), {});
    subjects.forEach((s) => ensureCount?.(keyOf.subject(s.id), { subjectId: s.id }));
  }, [subjects, ensureCount]);

  const loadChapters = useCallback(
    async (subjectId) => {
      if (chaptersBySubject[subjectId]) {
        chaptersBySubject[subjectId].forEach((c) => ensureCount?.(keyOf.chapter(c.id), { chapterId: c.id }));
        return;
      }
      setLoadingSubject((prev) => new Set(prev).add(subjectId));
      const list = (await fetchChapters?.(subjectId)) || [];
      setChaptersBySubject((prev) => ({ ...prev, [subjectId]: list }));
      list.forEach((c) => ensureCount?.(keyOf.chapter(c.id), { chapterId: c.id }));
      setLoadingSubject((prev) => {
        const n = new Set(prev);
        n.delete(subjectId);
        return n;
      });
    },
    [chaptersBySubject, fetchChapters, ensureCount]
  );

  const loadTopics = useCallback(
    async (chapterId) => {
      if (topicsByChapter[chapterId]) {
        topicsByChapter[chapterId].forEach((t) => ensureCount?.(keyOf.topic(t.id), { topicId: t.id }));
        return;
      }
      setLoadingChapter((prev) => new Set(prev).add(chapterId));
      const list = (await fetchTopics?.(chapterId)) || [];
      setTopicsByChapter((prev) => ({ ...prev, [chapterId]: list }));
      list.forEach((t) => ensureCount?.(keyOf.topic(t.id), { topicId: t.id }));
      setLoadingChapter((prev) => {
        const n = new Set(prev);
        n.delete(chapterId);
        return n;
      });
    },
    [topicsByChapter, fetchTopics, ensureCount]
  );

  const toggleSubject = (subjectId) => {
    const isOpen = openSubjects.has(subjectId);
    setOpenSubjects((prev) => {
      const n = new Set(prev);
      if (isOpen) n.delete(subjectId);
      else n.add(subjectId);
      return n;
    });
    if (!isOpen) loadChapters(subjectId);
  };

  const openSubject = (subjectId) => {
    if (!openSubjects.has(subjectId)) {
      setOpenSubjects((prev) => new Set(prev).add(subjectId));
      loadChapters(subjectId);
    }
  };

  const toggleChapter = (chapterId) => {
    const isOpen = openChapters.has(chapterId);
    setOpenChapters((prev) => {
      const n = new Set(prev);
      if (isOpen) n.delete(chapterId);
      else n.add(chapterId);
      return n;
    });
    if (!isOpen) loadTopics(chapterId);
  };

  const openChapter = (chapterId) => {
    if (!openChapters.has(chapterId)) {
      setOpenChapters((prev) => new Set(prev).add(chapterId));
      loadTopics(chapterId);
    }
  };

  const handleSelectAll = () =>
    onSelect?.({ subjectId: '', subjectName: '', chapterId: '', chapterName: '', topicId: '', topicName: '' });

  const handleSelectSubject = (s) => {
    openSubject(s.id);
    onSelect?.({ subjectId: String(s.id), subjectName: s.name, chapterId: '', chapterName: '', topicId: '', topicName: '' });
  };

  const handleSelectChapter = (s, c) => {
    openChapter(c.id);
    onSelect?.({
      subjectId: String(s.id),
      subjectName: s.name,
      chapterId: String(c.id),
      chapterName: c.name,
      topicId: '',
      topicName: ''
    });
  };

  const handleSelectTopic = (s, c, t) =>
    onSelect?.({
      subjectId: String(s.id),
      subjectName: s.name,
      chapterId: String(c.id),
      chapterName: c.name,
      topicId: String(t.id),
      topicName: t.name
    });

  return (
    <nav className="py-2 text-sm" aria-label="Curriculum">
      <Row
        depth={0}
        icon="Layers"
        label="All questions"
        count={counts[keyOf.all()]}
        active={allActive}
        onClick={handleSelectAll}
      />

      {subjectsLoading && subjects.length === 0 && (
        <div className="px-3 py-2 text-xs text-muted-foreground">Loading curriculum…</div>
      )}
      {!subjectsLoading && subjects.length === 0 && (
        <div className="px-3 py-3 text-xs text-muted-foreground">
          No subjects yet. Add curriculum in Course Management.
        </div>
      )}

      {subjects.map((s) => {
        const sid = s.id;
        const sOpen = openSubjects.has(sid);
        const chapters = chaptersBySubject[sid] || [];
        return (
          <div key={sid}>
            <Row
              depth={0}
              icon="BookOpen"
              label={s.name}
              count={counts[keyOf.subject(sid)]}
              active={isSubjectActive(sid)}
              expandable
              expanded={sOpen}
              loading={loadingSubject.has(sid)}
              onClick={() => handleSelectSubject(s)}
              onToggle={() => toggleSubject(sid)}
            />

            {sOpen &&
              chapters.map((c) => {
                const cid = c.id;
                const cOpen = openChapters.has(cid);
                const topics = topicsByChapter[cid] || [];
                return (
                  <div key={cid}>
                    <Row
                      depth={1}
                      icon={cOpen ? 'FolderOpen' : 'Folder'}
                      label={c.name}
                      count={counts[keyOf.chapter(cid)]}
                      active={isChapterActive(cid)}
                      expandable
                      expanded={cOpen}
                      loading={loadingChapter.has(cid)}
                      onClick={() => handleSelectChapter(s, c)}
                      onToggle={() => toggleChapter(cid)}
                    />

                    {cOpen &&
                      topics.map((t) => (
                        <Row
                          key={t.id}
                          depth={2}
                          icon="Hash"
                          label={t.name}
                          count={counts[keyOf.topic(t.id)]}
                          active={isTopicActive(t.id)}
                          onClick={() => handleSelectTopic(s, c, t)}
                        />
                      ))}

                    {cOpen && !loadingChapter.has(cid) && topics.length === 0 && (
                      <div className="text-xs text-muted-foreground py-1" style={{ paddingLeft: '46px' }}>
                        No topics
                      </div>
                    )}
                  </div>
                );
              })}

            {sOpen && !loadingSubject.has(sid) && chapters.length === 0 && (
              <div className="text-xs text-muted-foreground py-1" style={{ paddingLeft: '32px' }}>
                No chapters
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default CurriculumTree;
