import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import MaterialsManager from '../../components/course/MaterialsManager';
import { courseService } from '../../services/courseService';
import { fetchAllPages } from '../../utils/pagination';

// Standalone teaching page: a topic's materials with a list sidebar and a large viewer
// pane that renders the selected material inline (PDF/video embedded, notes rendered,
// slides/links opened). Designed for live use while teaching. The material list/viewer/
// composer is the shared <MaterialsManager>; this page adds the topic header and the
// prev/next/jump navigation across the chapter's topics. Reached from the
// course-management curriculum tree.
const TopicMaterialsPage = () => {
  const { topicId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Topic context: prefer the object passed via navigation state; fall back to a fetch
  // on direct load / refresh.
  const [topic, setTopic] = useState(location.state?.topic || null);
  const [siblings, setSiblings] = useState([]); // other topics in the same chapter

  // On topic change (mount or sibling navigation, which doesn't remount): adopt the
  // topic from nav state when it matches, else fetch it.
  useEffect(() => {
    const navTopic = location.state?.topic;
    if (navTopic && String(navTopic.id) === String(topicId)) {
      setTopic(navTopic);
      return undefined;
    }
    setTopic(null);
    let cancelled = false;
    courseService.getTopic(topicId).then(({ data }) => {
      if (!cancelled && data) setTopic(data);
    });
    return () => {
      cancelled = true;
    };
  }, [topicId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load this chapter's topic list once the chapter is known, to power prev/next + the
  // jump dropdown. Only refetches when the chapter actually changes (sibling nav within
  // the same chapter reuses it).
  useEffect(() => {
    const chapterId = topic?.chapterId;
    if (!chapterId) return undefined;
    if (siblings.some((t) => String(t.chapterId) === String(chapterId))) return undefined;
    let cancelled = false;
    fetchAllPages((pg) => courseService.getTopics(chapterId, pg)).then(({ data }) => {
      if (cancelled) return;
      const list = Array.isArray(data) ? [...data] : [];
      list.sort((a, b) => (a.orderIndex ?? a.order ?? 0) - (b.orderIndex ?? b.order ?? 0));
      setSiblings(list);
    });
    return () => {
      cancelled = true;
    };
  }, [topic?.chapterId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Topic navigation (prev / next / jump) — stays on this page so teachers flip through
  // a chapter's topics like slides.
  const currentIndex = siblings.findIndex((t) => String(t.id) === String(topicId));
  const goToTopic = (t) => {
    if (t && String(t.id) !== String(topicId)) navigate(`/topic-materials/${t.id}`, { state: { topic: t } });
  };

  return (
    <PageLayout title="Topic Materials">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() =>
                navigate('/course-management', {
                  state: { revealCurriculum: { subjectId: topic?.subjectId, chapterId: topic?.chapterId } },
                })
              }
              className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Back to curriculum"
            >
              <Icon name="ArrowLeft" size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-foreground truncate flex items-center gap-2">
                <Icon name="Library" size={18} className="text-primary flex-shrink-0" />
                {topic?.name || 'Topic'} Materials
              </h1>
              {topic?.code && <p className="text-xs text-muted-foreground">{topic.code}</p>}
            </div>
          </div>
        </div>

        {/* Topic navigation — flip through the chapter's topics without leaving the page */}
        {siblings.length > 1 && (
          <div className="flex items-center gap-2 mb-4 bg-card border border-border rounded-lg px-2 py-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIndex <= 0}
              onClick={() => goToTopic(siblings[currentIndex - 1])}
              title="Previous topic"
            >
              <Icon name="ChevronLeft" size={16} className="mr-1" /> Prev
            </Button>

            <div className="flex-1 flex items-center gap-2 min-w-0">
              <select
                value={String(topicId)}
                onChange={(e) => goToTopic(siblings.find((t) => String(t.id) === e.target.value))}
                className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                title="Jump to topic"
              >
                {siblings.map((t, i) => (
                  <option key={t.id} value={String(t.id)}>
                    {i + 1}. {t.name}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                {currentIndex >= 0 ? currentIndex + 1 : '–'} / {siblings.length}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={currentIndex < 0 || currentIndex >= siblings.length - 1}
              onClick={() => goToTopic(siblings[currentIndex + 1])}
              title="Next topic"
            >
              Next <Icon name="ChevronRight" size={16} className="ml-1" />
            </Button>
          </div>
        )}

        <MaterialsManager scope="topics" ownerId={topicId} />
      </div>
    </PageLayout>
  );
};

export default TopicMaterialsPage;
