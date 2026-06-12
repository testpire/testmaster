import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import { cn } from '../../utils/cn';
import { courseService } from '../../services/courseService';
import { fetchAllPages } from '../../utils/pagination';

// Read-only curriculum browser for teachers: drill Course → Subject → Chapter → Topic,
// then open a topic's Materials page (where they can teach from / manage materials).
// Children are lazy-loaded on first expand to keep the initial load light.
const CourseContent = () => {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Lazy-loaded children, keyed by parent id, plus expand + loading sets per level.
  const [expanded, setExpanded] = useState({ course: new Set(), subject: new Set(), chapter: new Set() });
  const [subjectsByCourse, setSubjectsByCourse] = useState({});
  const [chaptersBySubject, setChaptersBySubject] = useState({});
  const [topicsByChapter, setTopicsByChapter] = useState({});
  const [loadingSet, setLoadingSet] = useState({ subject: new Set(), chapter: new Set(), topic: new Set() });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await fetchAllPages((pg) => courseService.getCourses(pg));
      setCourses(Array.isArray(list) ? list : []);
      setLoading(false);
    })().catch((e) => {
      console.error('Failed to load courses:', e);
      setError('Failed to load courses.');
      setLoading(false);
    });
  }, []);

  const toggleSet = (level, id) =>
    setExpanded((prev) => {
      const next = new Set(prev[level]);
      next.has(id) ? next.delete(id) : next.add(id);
      return { ...prev, [level]: next };
    });

  const markLoading = (level, id, on) =>
    setLoadingSet((prev) => {
      const next = new Set(prev[level]);
      on ? next.add(id) : next.delete(id);
      return { ...prev, [level]: next };
    });

  const toggleCourse = useCallback(
    async (course) => {
      toggleSet('course', course.id);
      if (subjectsByCourse[course.id] === undefined) {
        markLoading('subject', course.id, true);
        const rows = await fetchAllPages((pg) => courseService.getSubjects(course.id, pg));
        setSubjectsByCourse((prev) => ({ ...prev, [course.id]: rows }));
        markLoading('subject', course.id, false);
      }
    },
    [subjectsByCourse]
  );

  const toggleSubject = useCallback(
    async (subject) => {
      toggleSet('subject', subject.id);
      if (chaptersBySubject[subject.id] === undefined) {
        markLoading('chapter', subject.id, true);
        const rows = await fetchAllPages((pg) => courseService.getChapters(subject.id, pg));
        setChaptersBySubject((prev) => ({ ...prev, [subject.id]: rows }));
        markLoading('chapter', subject.id, false);
      }
    },
    [chaptersBySubject]
  );

  const toggleChapter = useCallback(
    async (chapter) => {
      toggleSet('chapter', chapter.id);
      if (topicsByChapter[chapter.id] === undefined) {
        markLoading('topic', chapter.id, true);
        const rows = await fetchAllPages((pg) => courseService.getTopics(chapter.id, pg));
        setTopicsByChapter((prev) => ({ ...prev, [chapter.id]: rows }));
        markLoading('topic', chapter.id, false);
      }
    },
    [topicsByChapter]
  );

  const openTopic = (topic) => navigate(`/topic-materials/${topic.id}`, { state: { topic } });

  const filteredCourses = search.trim()
    ? courses.filter((c) => `${c.name} ${c.code || ''}`.toLowerCase().includes(search.toLowerCase()))
    : courses;

  const EmptyRow = ({ text }) => (
    <div className="px-3 py-2 text-xs text-muted-foreground italic">{text}</div>
  );

  return (
    <PageLayout title="Course Content">
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Icon name="BookOpen" size={20} className="text-primary" />
              Course Content
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Browse the curriculum and open a topic's materials to teach from.
            </p>
          </div>
          <input
            type="text"
            placeholder="Search courses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent w-64 bg-card text-sm"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <Icon name="Loader" size={24} className="animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading curriculum…</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-lg">
            <Icon name="BookOpen" size={44} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium">No courses found</p>
            {search && <p className="text-xs mt-1">Try a different search.</p>}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden divide-y divide-border">
            {filteredCourses.map((course) => {
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
                    <Icon name="BookOpen" size={16} className="text-blue-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">{course.name}</span>
                    {course.code && <span className="text-xs text-muted-foreground">({course.code})</span>}
                  </button>

                  {cOpen && (
                    <div className="pl-6 bg-muted/20 border-t border-border">
                      {loadingSet.subject.has(course.id) ? (
                        <EmptyRow text="Loading subjects…" />
                      ) : !subjects || subjects.length === 0 ? (
                        <EmptyRow text="No subjects." />
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
                                <Icon name="Folder" size={15} className="text-emerald-600 flex-shrink-0" />
                                <span className="text-sm text-foreground truncate">{subject.name}</span>
                                {subject.code && <span className="text-xs text-muted-foreground">({subject.code})</span>}
                              </button>

                              {sOpen && (
                                <div className="pl-6">
                                  {loadingSet.chapter.has(subject.id) ? (
                                    <EmptyRow text="Loading chapters…" />
                                  ) : !chapters || chapters.length === 0 ? (
                                    <EmptyRow text="No chapters." />
                                  ) : (
                                    chapters.map((chapter) => {
                                      const chOpen = expanded.chapter.has(chapter.id);
                                      const topics = topicsByChapter[chapter.id];
                                      return (
                                        <div key={chapter.id}>
                                          <button
                                            onClick={() => toggleChapter(chapter)}
                                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/50 text-left"
                                          >
                                            <Icon name={chOpen ? 'ChevronDown' : 'ChevronRight'} size={15} className="text-muted-foreground flex-shrink-0" />
                                            <Icon name="Bookmark" size={14} className="text-indigo-600 flex-shrink-0" />
                                            <span className="text-sm text-foreground truncate">{chapter.name}</span>
                                            {chapter.code && <span className="text-xs text-muted-foreground">({chapter.code})</span>}
                                          </button>

                                          {chOpen && (
                                            <div className="pl-6">
                                              {loadingSet.topic.has(chapter.id) ? (
                                                <EmptyRow text="Loading topics…" />
                                              ) : !topics || topics.length === 0 ? (
                                                <EmptyRow text="No topics." />
                                              ) : (
                                                topics.map((topic) => (
                                                  <button
                                                    key={topic.id}
                                                    onClick={() => openTopic(topic)}
                                                    className={cn(
                                                      'w-full flex items-center justify-between gap-2 px-4 py-2 text-left group hover:bg-primary/5'
                                                    )}
                                                  >
                                                    <span className="flex items-center gap-2 min-w-0">
                                                      <Icon name="List" size={14} className="text-muted-foreground flex-shrink-0" />
                                                      <span className="text-sm text-foreground truncate">{topic.name}</span>
                                                      {topic.code && <span className="text-xs text-muted-foreground">({topic.code})</span>}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                      <Icon name="Library" size={14} />
                                                      Materials
                                                    </span>
                                                  </button>
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
        )}
      </div>
    </PageLayout>
  );
};

export default CourseContent;
