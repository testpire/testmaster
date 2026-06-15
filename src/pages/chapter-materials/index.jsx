import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import MaterialsManager from '../../components/course/MaterialsManager';
import { courseService } from '../../services/courseService';
import { fetchAllPages } from '../../utils/pagination';

// Standalone teaching page: a chapter's materials (files, notes, links) with a list
// sidebar and inline viewer — the chapter-level counterpart of the topic materials page.
// The material list/viewer/composer is the shared <MaterialsManager> (scope="chapters");
// this page adds the chapter header and prev/next/jump navigation across the subject's
// chapters. Reached from the course-management curriculum tree.
const ChapterMaterialsPage = () => {
  const { chapterId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Chapter context: prefer the object passed via navigation state; fall back to a fetch
  // on direct load / refresh.
  const [chapter, setChapter] = useState(location.state?.chapter || null);
  const [siblings, setSiblings] = useState([]); // other chapters in the same subject

  // On chapter change (mount or sibling navigation, which doesn't remount): adopt the
  // chapter from nav state when it matches, else fetch it.
  useEffect(() => {
    const navChapter = location.state?.chapter;
    if (navChapter && String(navChapter.id) === String(chapterId)) {
      setChapter(navChapter);
      return undefined;
    }
    setChapter(null);
    let cancelled = false;
    courseService.getChapterById(chapterId).then(({ data }) => {
      if (!cancelled && data) setChapter(data);
    });
    return () => {
      cancelled = true;
    };
  }, [chapterId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load this subject's chapter list once the subject is known, to power prev/next + the
  // jump dropdown. Only refetches when the subject actually changes.
  useEffect(() => {
    const subjectId = chapter?.subjectId;
    if (!subjectId) return undefined;
    if (siblings.some((c) => String(c.subjectId) === String(subjectId))) return undefined;
    let cancelled = false;
    fetchAllPages((pg) => courseService.getChapters(subjectId, pg)).then(({ data }) => {
      if (cancelled) return;
      const list = Array.isArray(data) ? [...data] : [];
      list.sort((a, b) => (a.orderIndex ?? a.order ?? 0) - (b.orderIndex ?? b.order ?? 0));
      setSiblings(list);
    });
    return () => {
      cancelled = true;
    };
  }, [chapter?.subjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chapter navigation (prev / next / jump) — stays on this page so teachers flip through
  // a subject's chapters.
  const currentIndex = siblings.findIndex((c) => String(c.id) === String(chapterId));
  const goToChapter = (c) => {
    if (c && String(c.id) !== String(chapterId)) navigate(`/chapter-materials/${c.id}`, { state: { chapter: c } });
  };

  return (
    <PageLayout title="Chapter Materials">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Back"
            >
              <Icon name="ArrowLeft" size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-foreground truncate flex items-center gap-2">
                <Icon name="Library" size={18} className="text-primary flex-shrink-0" />
                {chapter?.name || 'Chapter'} Materials
              </h1>
              {chapter?.code && <p className="text-xs text-muted-foreground">{chapter.code}</p>}
            </div>
          </div>
        </div>

        {/* Chapter navigation — flip through the subject's chapters without leaving the page */}
        {siblings.length > 1 && (
          <div className="flex items-center gap-2 mb-4 bg-card border border-border rounded-lg px-2 py-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIndex <= 0}
              onClick={() => goToChapter(siblings[currentIndex - 1])}
              title="Previous chapter"
            >
              <Icon name="ChevronLeft" size={16} className="mr-1" /> Prev
            </Button>

            <div className="flex-1 flex items-center gap-2 min-w-0">
              <select
                value={String(chapterId)}
                onChange={(e) => goToChapter(siblings.find((c) => String(c.id) === e.target.value))}
                className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                title="Jump to chapter"
              >
                {siblings.map((c, i) => (
                  <option key={c.id} value={String(c.id)}>
                    {i + 1}. {c.name}
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
              onClick={() => goToChapter(siblings[currentIndex + 1])}
              title="Next chapter"
            >
              Next <Icon name="ChevronRight" size={16} className="ml-1" />
            </Button>
          </div>
        )}

        <MaterialsManager scope="chapters" ownerId={chapterId} />
      </div>
    </PageLayout>
  );
};

export default ChapterMaterialsPage;
