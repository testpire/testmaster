import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import { cn } from '../../utils/cn';
import useMediaQuery from '../../hooks/useMediaQuery';
import { courseService } from '../../services/courseService';
import { newUserService } from '../../services/newUserService';
import { newMaterialService, MATERIAL_SCOPES } from '../../services/newMaterialService';
import MaterialsManager from '../../components/course/MaterialsManager';

// Student-facing study materials. Browse the curriculum of the courses you're
// enrolled in (Course → Subject → Chapter → Topic) and view the attached
// materials read-only. Materials live at both chapter and topic level, so both
// are openable. Access is scoped server-side to the student's enrolled courses
// (the tree is also seeded only from those courses); failed/forbidden reads
// degrade to an inline "unavailable" row rather than crashing.
const StudyMaterials = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Lazy-loaded children, keyed by parent id, plus expand + loading + error sets.
  const [expanded, setExpanded] = useState({ course: new Set(), subject: new Set(), chapter: new Set() });
  const [subjectsByCourse, setSubjectsByCourse] = useState({});
  const [chaptersBySubject, setChaptersBySubject] = useState({});
  const [topicsByChapter, setTopicsByChapter] = useState({});
  const [loadingSet, setLoadingSet] = useState({ subject: new Set(), chapter: new Set(), topic: new Set() });
  const [errorSet, setErrorSet] = useState({ subject: new Set(), chapter: new Set(), topic: new Set() });

  // The chapter/topic whose materials are shown in the right pane.
  const [selected, setSelected] = useState(null); // { scope, id, name }

  // On phones/tablets the tree and the viewer can't share the screen, so we
  // drill down: show the tree until a node is picked, then swap to its materials
  // (with a back affordance). `lg` (1024px) is where the two-pane desktop layout
  // fits; mirror that breakpoint so the JS and the `lg:` classes agree.
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Load the student's enrolled courses (the only roots they may browse).
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error: err } = await newUserService.getMyStudentProfile();
      if (!mounted) return;
      if (err) {
        setError(err.message || 'Failed to load your courses.');
        setCourses([]);
        setLoading(false);
        return;
      }
      // Dedupe enrollments by courseId; a student may only browse these.
      const seen = new Set();
      const enrolled = (Array.isArray(data?.courseEnrollments) ? data.courseEnrollments : [])
        .filter((en) => en?.courseId != null && !seen.has(en.courseId) && seen.add(en.courseId))
        .map((en) => ({ id: en.courseId, name: en.courseName || `Course #${en.courseId}` }));
      setCourses(enrolled);
      setLoading(false);
    })().catch(() => {
      if (mounted) {
        setError('Failed to load your courses.');
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const toggleSet = (level, id) =>
    setExpanded((prev) => {
      const next = new Set(prev[level]);
      next.has(id) ? next.delete(id) : next.add(id);
      return { ...prev, [level]: next };
    });

  const flagSet = (which, level, id, on) =>
    (which === 'loading' ? setLoadingSet : setErrorSet)((prev) => {
      const next = new Set(prev[level]);
      on ? next.add(id) : next.delete(id);
      return { ...prev, [level]: next };
    });

  // Generic lazy-loader for a tree level. `fetcher` returns the children array
  // (or throws / returns error); on failure we mark the node so the row shows an
  // "unavailable" hint (e.g. a 403 if the student isn't allowed that resource).
  const lazyLoad = useCallback(async ({ level, id, already, fetcher, store }) => {
    if (already !== undefined) return; // already loaded (incl. empty)
    flagSet('loading', level, id, true);
    flagSet('error', level, id, false);
    try {
      const list = await fetcher();
      store(Array.isArray(list) ? list : []);
    } catch (_) {
      flagSet('error', level, id, true);
      store([]);
    } finally {
      flagSet('loading', level, id, false);
    }
  }, []);

  const toggleCourse = useCallback(
    (course) => {
      toggleSet('course', course.id);
      lazyLoad({
        level: 'subject',
        id: course.id,
        already: subjectsByCourse[course.id],
        fetcher: async () => {
          const { data, error: err } = await courseService.getCourseById(course.id, { include: 'subjects' });
          if (err) throw err;
          return data?.subjects || [];
        },
        store: (list) => setSubjectsByCourse((prev) => ({ ...prev, [course.id]: list })),
      });
    },
    [subjectsByCourse, lazyLoad]
  );

  const toggleSubject = useCallback(
    (subject) => {
      toggleSet('subject', subject.id);
      lazyLoad({
        level: 'chapter',
        id: subject.id,
        already: chaptersBySubject[subject.id],
        fetcher: async () => {
          const { data, error: err } = await courseService.getSubjectById(subject.id, { include: 'chapters' });
          if (err) throw err;
          return data?.chapters || [];
        },
        store: (list) => setChaptersBySubject((prev) => ({ ...prev, [subject.id]: list })),
      });
    },
    [chaptersBySubject, lazyLoad]
  );

  const toggleChapter = useCallback(
    (chapter) => {
      toggleSet('chapter', chapter.id);
      lazyLoad({
        level: 'topic',
        id: chapter.id,
        already: topicsByChapter[chapter.id],
        fetcher: async () => {
          const { data, error: err } = await courseService.getChapterById(chapter.id, { include: 'topics' });
          if (err) throw err;
          return data?.topics || [];
        },
        store: (list) => setTopicsByChapter((prev) => ({ ...prev, [chapter.id]: list })),
      });
    },
    [topicsByChapter, lazyLoad]
  );

  const selectNode = (scope, id, name) => setSelected({ scope, id, name });
  const isSelected = (scope, id) => selected?.scope === scope && selected?.id === id;

  const Hint = ({ text }) => (
    <div className="px-3 py-2 text-xs text-muted-foreground italic">{text}</div>
  );

  // A small "View materials" pill, highlighted when its node is selected.
  const MaterialsPill = ({ active, onClick }) => (
    <span
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md flex-shrink-0 cursor-pointer transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-primary hover:bg-primary/10'
      )}
    >
      <Icon name="Library" size={13} />
      Materials
    </span>
  );

  return (
    <PageLayout title="Study Materials">
      <div className="p-4 sm:p-6">
        <div className="mb-5">
          <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Icon name="Library" size={22} className="text-primary" />
            Study Materials
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse your enrolled courses and study from the uploaded notes, slides, PDFs and videos.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            <Icon name="Loader" size={24} className="animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading your courses…</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-2xl shadow-sm">
            <Icon name="BookOpen" size={44} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium">You're not enrolled in any courses yet</p>
            <p className="text-xs mt-1">Study materials appear here once you're enrolled in a course.</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Curriculum tree (enrolled courses only). On mobile it gives way to
                the materials once a node is picked; on lg+ both panes coexist. */}
            <aside className={cn('lg:w-96 flex-shrink-0', selected && 'hidden lg:block')}>
              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden divide-y divide-border">
                {courses.map((course) => {
                  const cOpen = expanded.course.has(course.id);
                  const subjects = subjectsByCourse[course.id];
                  return (
                    <div key={course.id}>
                      {/* Course */}
                      <button
                        onClick={() => toggleCourse(course)}
                        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/50 text-left"
                      >
                        <Icon name={cOpen ? 'ChevronDown' : 'ChevronRight'} size={18} className="text-muted-foreground flex-shrink-0" />
                        <Icon name="BookOpen" size={16} className="text-primary flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">{course.name}</span>
                      </button>

                      {cOpen && (
                        <div className="pl-6 bg-muted/20 border-t border-border">
                          {loadingSet.subject.has(course.id) ? (
                            <Hint text="Loading subjects…" />
                          ) : errorSet.subject.has(course.id) ? (
                            <Hint text="Couldn't load subjects (you may not have access)." />
                          ) : !subjects || subjects.length === 0 ? (
                            <Hint text="No subjects." />
                          ) : (
                            subjects.map((subject) => {
                              const sOpen = expanded.subject.has(subject.id);
                              const chapters = chaptersBySubject[subject.id];
                              return (
                                <div key={subject.id}>
                                  <button
                                    onClick={() => toggleSubject(subject)}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-muted/50 text-left"
                                  >
                                    <Icon name={sOpen ? 'ChevronDown' : 'ChevronRight'} size={16} className="text-muted-foreground flex-shrink-0" />
                                    <Icon name="Folder" size={15} className="text-success flex-shrink-0" />
                                    <span className="text-sm text-foreground truncate">{subject.name}</span>
                                  </button>

                                  {sOpen && (
                                    <div className="pl-6">
                                      {loadingSet.chapter.has(subject.id) ? (
                                        <Hint text="Loading chapters…" />
                                      ) : errorSet.chapter.has(subject.id) ? (
                                        <Hint text="Couldn't load chapters." />
                                      ) : !chapters || chapters.length === 0 ? (
                                        <Hint text="No chapters." />
                                      ) : (
                                        chapters.map((chapter) => {
                                          const chOpen = expanded.chapter.has(chapter.id);
                                          const topics = topicsByChapter[chapter.id];
                                          return (
                                            <div key={chapter.id}>
                                              <div className="w-full flex items-center justify-between gap-2 px-4 py-2 hover:bg-muted/50">
                                                <button
                                                  onClick={() => toggleChapter(chapter)}
                                                  className="flex items-center gap-2 min-w-0 flex-1 text-left"
                                                >
                                                  <Icon name={chOpen ? 'ChevronDown' : 'ChevronRight'} size={15} className="text-muted-foreground flex-shrink-0" />
                                                  <Icon name="Bookmark" size={14} className="text-primary flex-shrink-0" />
                                                  <span className="text-sm text-foreground truncate">{chapter.name}</span>
                                                </button>
                                                <MaterialsPill
                                                  active={isSelected(MATERIAL_SCOPES.CHAPTER, chapter.id)}
                                                  onClick={() => selectNode(MATERIAL_SCOPES.CHAPTER, chapter.id, chapter.name)}
                                                />
                                              </div>

                                              {chOpen && (
                                                <div className="pl-6">
                                                  {loadingSet.topic.has(chapter.id) ? (
                                                    <Hint text="Loading topics…" />
                                                  ) : errorSet.topic.has(chapter.id) ? (
                                                    <Hint text="Couldn't load topics." />
                                                  ) : !topics || topics.length === 0 ? (
                                                    <Hint text="No topics." />
                                                  ) : (
                                                    topics.map((topic) => (
                                                      <div
                                                        key={topic.id}
                                                        className={cn(
                                                          'w-full flex items-center justify-between gap-2 px-4 py-2',
                                                          isSelected(MATERIAL_SCOPES.TOPIC, topic.id) ? 'bg-primary/5' : 'hover:bg-muted/50'
                                                        )}
                                                      >
                                                        <button
                                                          onClick={() => selectNode(MATERIAL_SCOPES.TOPIC, topic.id, topic.name)}
                                                          className="flex items-center gap-2 min-w-0 flex-1 text-left"
                                                        >
                                                          <Icon name="List" size={14} className="text-muted-foreground flex-shrink-0" />
                                                          <span className="text-sm text-foreground truncate">{topic.name}</span>
                                                        </button>
                                                        <MaterialsPill
                                                          active={isSelected(MATERIAL_SCOPES.TOPIC, topic.id)}
                                                          onClick={() => selectNode(MATERIAL_SCOPES.TOPIC, topic.id, topic.name)}
                                                        />
                                                      </div>
                                                    ))
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* Materials viewer (read-only) for the selected chapter / topic.
                Hidden on mobile until a node is selected (the tree owns the screen). */}
            <section className={cn('flex-1 min-w-0', !selected && 'hidden lg:block')}>
              {selected ? (
                <>
                  <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                    {/* Back to the curriculum tree — mobile only. */}
                    <button
                      onClick={() => setSelected(null)}
                      className="lg:hidden -ml-1 flex items-center gap-1 rounded-md px-2 py-1.5 text-primary hover:bg-primary/10"
                      aria-label="Back to curriculum"
                    >
                      <Icon name="ChevronLeft" size={18} />
                      <span className="text-sm font-medium">Curriculum</span>
                    </button>
                    <Icon name={selected.scope === MATERIAL_SCOPES.CHAPTER ? 'Bookmark' : 'List'} size={15} className="text-primary flex-shrink-0" />
                    <span className="text-foreground font-medium truncate">{selected.name}</span>
                    <span className="text-xs flex-shrink-0">· {selected.scope === MATERIAL_SCOPES.CHAPTER ? 'Chapter' : 'Topic'} materials</span>
                  </div>
                  <MaterialsManager
                    key={`${selected.scope}-${selected.id}`}
                    scope={selected.scope}
                    ownerId={selected.id}
                    autoOpenFirst={isDesktop}
                    readOnly
                  />
                </>
              ) : (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground bg-card border border-border rounded-2xl shadow-sm p-8">
                  <Icon name="MonitorPlay" size={44} className="mb-3 text-muted-foreground" />
                  <p className="text-sm">Select a chapter or topic to view its materials.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default StudyMaterials;
