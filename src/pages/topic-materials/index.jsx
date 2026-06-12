import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import MathText from '../../components/MathText';
import MaterialComposer from '../../components/course/MaterialComposer';
import { cn } from '../../utils/cn';
import { courseService } from '../../services/courseService';
import { newMaterialService } from '../../services/newMaterialService';
import { formatBytes as fmtBytes } from '../../utils/formatters';

// Per-type display metadata.
const TYPE_META = {
  PDF: { icon: 'FileText', label: 'PDF', color: 'text-red-600', badge: 'bg-red-50 text-red-700' },
  PPT: { icon: 'Presentation', label: 'Slides', color: 'text-orange-600', badge: 'bg-orange-50 text-orange-700' },
  VIDEO: { icon: 'Video', label: 'Video', color: 'text-purple-600', badge: 'bg-purple-50 text-purple-700' },
  NOTE: { icon: 'StickyNote', label: 'Note', color: 'text-amber-600', badge: 'bg-amber-50 text-amber-700' },
  LINK: { icon: 'Link', label: 'Link', color: 'text-blue-600', badge: 'bg-blue-50 text-blue-700' },
};
const metaFor = (type) => TYPE_META[type] || { icon: 'File', label: type || 'File', color: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' };
const FILE_TYPES = new Set(['PDF', 'PPT', 'VIDEO']);

// Standalone teaching page: a topic's materials with a list sidebar and a large viewer
// pane that renders the selected material inline (PDF/video embedded, notes rendered,
// slides/links opened). Designed for live use while teaching, with a present/fullscreen
// mode. Reached from the course-management curriculum tree.
const TopicMaterialsPage = () => {
  const { topicId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Topic context: prefer the object passed via navigation state; fall back to a fetch
  // on direct load / refresh.
  const [topic, setTopic] = useState(location.state?.topic || null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [selected, setSelected] = useState(null); // currently-viewed material
  const [viewerUrl, setViewerUrl] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState('');

  const [composer, setComposer] = useState(null); // { mode, editing }
  const [siblings, setSiblings] = useState([]); // other topics in the same chapter
  const viewerRef = useRef(null);

  // On topic change (mount or sibling navigation, which doesn't remount): adopt the
  // topic from nav state when it matches, else fetch it; and reset the open composer.
  useEffect(() => {
    setComposer(null);
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
    courseService.getTopics(chapterId, { page: 0, size: 200 }).then(({ data }) => {
      if (cancelled) return;
      const list = Array.isArray(data) ? [...data] : [];
      list.sort((a, b) => (a.orderIndex ?? a.order ?? 0) - (b.orderIndex ?? b.order ?? 0));
      setSiblings(list);
    });
    return () => {
      cancelled = true;
    };
  }, [topic?.chapterId]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(
    async (selectFirst = false) => {
      if (!topicId) return;
      setLoading(true);
      setError('');
      const { data, error: err } = await newMaterialService.list(topicId);
      if (err) setError(err.message || 'Failed to load materials');
      const list = Array.isArray(data) ? [...data] : [];
      list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setMaterials(list);
      setLoading(false);
      if (selectFirst) {
        // Opening a (new) topic: jump straight to its first material.
        if (list.length) openMaterial(list[0]);
        else {
          setSelected(null);
          setViewerUrl(null);
        }
      } else {
        // Refresh after an edit/delete: keep the current selection, refreshed.
        setSelected((prev) => (prev ? list.find((m) => m.id === prev.id) || null : prev));
      }
    },
    [topicId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    load(true);
  }, [topicId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Topic navigation (prev / next / jump) — stays on this page so teachers flip through
  // a chapter's topics like slides.
  const currentIndex = siblings.findIndex((t) => String(t.id) === String(topicId));
  const goToTopic = (t) => {
    if (t && String(t.id) !== String(topicId)) navigate(`/topic-materials/${t.id}`, { state: { topic: t } });
  };

  // Select a material and prepare the viewer. Files need a fresh presigned URL (they
  // expire), fetched on demand here. Notes/links render from the object directly.
  const openMaterial = async (m) => {
    setSelected(m);
    setViewerUrl(null);
    setViewerError('');
    if (FILE_TYPES.has(m.type)) {
      setViewerLoading(true);
      const { data: url, error: err } = await newMaterialService.getDownloadUrl(topicId, m.id);
      setViewerLoading(false);
      if (url) setViewerUrl(url);
      else setViewerError(err?.message || 'Could not load this material.');
    }
  };

  const handleDelete = async (m) => {
    if (!window.confirm(`Delete "${m.title}"? This cannot be undone.`)) return;
    setBusyId(m.id);
    const { error: err } = await newMaterialService.remove(topicId, m.id);
    setBusyId(null);
    if (err) {
      setError(err.message || 'Failed to delete material.');
      return;
    }
    setMaterials((prev) => prev.filter((x) => x.id !== m.id));
    if (selected?.id === m.id) {
      setSelected(null);
      setViewerUrl(null);
    }
  };

  const handleMove = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= materials.length) return;
    const a = materials[index];
    const b = materials[target];
    const aOrder = a.sortOrder ?? index;
    const bOrder = b.sortOrder ?? target;
    setBusyId(a.id);
    const r1 = await newMaterialService.update(topicId, a.id, { sortOrder: bOrder });
    const r2 = await newMaterialService.update(topicId, b.id, { sortOrder: aOrder });
    setBusyId(null);
    if (r1.error || r2.error) setError(r1.error?.message || r2.error?.message || 'Failed to reorder.');
    load();
  };

  const nextSortOrder = materials.length ? Math.max(...materials.map((m) => m.sortOrder ?? 0)) + 1 : 0;

  const onComposerDone = async () => {
    setComposer(null);
    await load();
  };

  const presentFullscreen = () => {
    const el = viewerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  };

  return (
    <PageLayout title="Topic Materials">
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
                {topic?.name || 'Topic'} Materials
              </h1>
              {topic?.code && <p className="text-xs text-muted-foreground">{topic.code}</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setComposer({ mode: 'FILE', editing: null })}>
              <Icon name="Upload" size={15} className="mr-1.5" /> File
            </Button>
            <Button variant="outline" size="sm" onClick={() => setComposer({ mode: 'NOTE', editing: null })}>
              <Icon name="StickyNote" size={15} className="mr-1.5" /> Note
            </Button>
            <Button variant="outline" size="sm" onClick={() => setComposer({ mode: 'LINK', editing: null })}>
              <Icon name="Link" size={15} className="mr-1.5" /> Link
            </Button>
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

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4">
            <Icon name="AlertCircle" size={16} className="mt-0.5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
              <Icon name="X" size={14} />
            </button>
          </div>
        )}

        {composer && (
          <div className="mb-4">
            <MaterialComposer
              topicId={topicId}
              mode={composer.mode}
              editing={composer.editing}
              defaultSortOrder={nextSortOrder}
              onCancel={() => setComposer(null)}
              onDone={onComposerDone}
            />
          </div>
        )}

        {/* Two-pane layout */}
        <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-13rem)]">
          {/* Sidebar list */}
          <aside className="lg:w-80 flex-shrink-0 border border-border rounded-lg bg-card overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {materials.length} material{materials.length === 1 ? '' : 's'}
            </div>
            {loading ? (
              <div className="p-6 text-center text-muted-foreground">
                <Icon name="Loader" size={20} className="animate-spin mx-auto mb-2" />
                <p className="text-sm">Loading…</p>
              </div>
            ) : materials.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Icon name="FolderOpen" size={36} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No materials yet.</p>
                <p className="text-xs mt-1">Add a file, note or link above.</p>
              </div>
            ) : (
              <ul className="overflow-y-auto divide-y divide-border flex-1">
                {materials.map((m, i) => {
                  const meta = metaFor(m.type);
                  const active = selected?.id === m.id;
                  return (
                    <li
                      key={m.id}
                      className={cn('group', active ? 'bg-primary/5' : 'hover:bg-muted/50')}
                    >
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <button
                          onClick={() => openMaterial(m)}
                          className="flex items-center gap-2 min-w-0 flex-1 text-left"
                        >
                          <span className={cn('flex-shrink-0', meta.color)}>
                            <Icon name={meta.icon} size={17} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-foreground truncate">{m.title}</span>
                            <span className="block text-xs text-muted-foreground truncate">
                              {meta.label}
                              {FILE_TYPES.has(m.type) && m.sizeBytes != null && ` · ${fmtBytes(m.sizeBytes)}`}
                            </span>
                          </span>
                        </button>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={() => handleMove(i, -1)} disabled={i === 0 || busyId === m.id} title="Move up" className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30">
                            <Icon name="ChevronUp" size={14} />
                          </button>
                          <button onClick={() => handleMove(i, 1)} disabled={i === materials.length - 1 || busyId === m.id} title="Move down" className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30">
                            <Icon name="ChevronDown" size={14} />
                          </button>
                          <button onClick={() => setComposer({ mode: m.type === 'NOTE' ? 'NOTE' : m.type === 'LINK' ? 'LINK' : 'FILE', editing: m })} title="Edit" className="p-1 rounded text-indigo-600 hover:bg-indigo-50">
                            <Icon name="Edit" size={14} />
                          </button>
                          <button onClick={() => handleDelete(m)} disabled={busyId === m.id} title="Delete" className="p-1 rounded text-red-600 hover:bg-red-50 disabled:opacity-50">
                            <Icon name="Trash2" size={14} />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* Viewer pane */}
          <section
            ref={viewerRef}
            className="flex-1 border border-border rounded-lg bg-card overflow-hidden flex flex-col min-h-[400px]"
          >
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                <Icon name="MonitorPlay" size={48} className="mb-3 text-gray-300" />
                <p className="text-sm">Select a material to view it here.</p>
              </div>
            ) : (
              <>
                {/* Viewer toolbar */}
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={metaFor(selected.type).color}>
                      <Icon name={metaFor(selected.type).icon} size={16} />
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">{selected.title}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {viewerUrl && (
                      <a href={viewerUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Open in new tab">
                        <Icon name="ExternalLink" size={16} />
                      </a>
                    )}
                    <button onClick={presentFullscreen} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Present / fullscreen">
                      <Icon name="Maximize" size={16} />
                    </button>
                  </div>
                </div>

                {/* Viewer body */}
                <div className="flex-1 overflow-auto bg-muted/20">
                  <MaterialViewer
                    material={selected}
                    url={viewerUrl}
                    loading={viewerLoading}
                    error={viewerError}
                  />
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </PageLayout>
  );
};

// Renders the selected material in the viewer pane.
const MaterialViewer = ({ material, url, loading, error }) => {
  if (material.type === 'NOTE') {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        {material.description && <p className="text-sm text-muted-foreground mb-3">{material.description}</p>}
        {material.contentFormat === 'LATEX' ? (
          <div className="prose prose-sm sm:prose max-w-none text-foreground leading-relaxed">
            <MathText text={material.content || ''} />
          </div>
        ) : (
          <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">{material.content}</p>
        )}
      </div>
    );
  }

  if (material.type === 'LINK') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 h-full">
        <Icon name="Link" size={40} className="text-blue-500 mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">{material.title}</p>
        <p className="text-xs text-muted-foreground break-all mb-4 max-w-md">{material.externalUrl}</p>
        <a href={material.externalUrl} target="_blank" rel="noopener noreferrer">
          <Button size="sm"><Icon name="ExternalLink" size={15} className="mr-1.5" /> Open link</Button>
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full text-muted-foreground">
        <Icon name="Loader" size={24} className="animate-spin mr-2" /> Preparing…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
        <Icon name="AlertCircle" size={36} className="text-red-400 mb-2" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }
  if (!url) return null;

  if (material.type === 'VIDEO') {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <video src={url} controls autoPlay={false} className="max-h-full max-w-full">
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  if (material.type === 'PDF') {
    return <iframe title={material.title} src={url} className="w-full h-full min-h-[70vh] border-0" />;
  }

  // PPT — browsers can't render PowerPoint inline. Use the Office Online viewer as a
  // best-effort embed (it fetches the presigned URL server-side), with open/download
  // fallbacks below.
  if (material.type === 'PPT') {
    const office = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    return (
      <div className="h-full flex flex-col">
        <iframe title={material.title} src={office} className="w-full flex-1 min-h-[60vh] border-0" />
        <div className="flex items-center justify-center gap-2 p-2 border-t border-border bg-card text-xs text-muted-foreground">
          <span>Slides not showing?</span>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
            <Icon name="ExternalLink" size={13} /> Open / download
          </a>
        </div>
      </div>
    );
  }

  return null;
};

export default TopicMaterialsPage;
