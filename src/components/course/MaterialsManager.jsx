import React, { useState, useEffect, useCallback, useRef } from 'react';
import Button from '../ui/Button';
import Icon from '../AppIcon';
import MathText from '../MathText';
import MaterialComposer from './MaterialComposer';
import { cn } from '../../utils/cn';
import { newMaterialService } from '../../services/newMaterialService';
import { formatBytes as fmtBytes } from '../../utils/formatters';

// Per-type display metadata.
const TYPE_META = {
  PDF: { icon: 'FileText', label: 'PDF', color: 'text-destructive', badge: 'bg-destructive/10 text-destructive' },
  PPT: { icon: 'Presentation', label: 'Slides', color: 'text-warning', badge: 'bg-warning/10 text-warning' },
  VIDEO: { icon: 'Video', label: 'Video', color: 'text-secondary', badge: 'bg-secondary/10 text-secondary' },
  NOTE: { icon: 'StickyNote', label: 'Note', color: 'text-warning', badge: 'bg-warning/10 text-warning' },
  LINK: { icon: 'Link', label: 'Link', color: 'text-primary', badge: 'bg-primary/10 text-primary' },
};
const metaFor = (type) => TYPE_META[type] || { icon: 'File', label: type || 'File', color: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' };
const FILE_TYPES = new Set(['PDF', 'PPT', 'VIDEO']);

/**
 * MaterialsManager — the shared add/list/view experience for a curriculum node's
 * study materials (files, notes, links). Used by both the topic-materials and
 * chapter-materials pages; the only difference between them is the (scope, ownerId)
 * pair and the surrounding page chrome (header + sibling navigation), which the page
 * owns. This component is self-contained: it loads, lists, reorders, edits, deletes
 * and previews materials for the given owner, and reloads whenever the owner changes.
 *
 * Props:
 *  - scope    : 'topics' | 'chapters'
 *  - ownerId  : id of the owning topic / chapter
 *  - readOnly : when true, render a view-only experience (no add/edit/delete/
 *               reorder) — used by the student Study Materials section.
 */
const MaterialsManager = ({ scope, ownerId, readOnly = false }) => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [selected, setSelected] = useState(null); // currently-viewed material
  const [viewerUrl, setViewerUrl] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState('');

  const [composer, setComposer] = useState(null); // { mode, editing }
  const viewerRef = useRef(null);

  // Select a material and prepare the viewer. Files need a fresh presigned URL (they
  // expire), fetched on demand here. Notes/links render from the object directly.
  const openMaterial = useCallback(
    async (m) => {
      setSelected(m);
      setViewerUrl(null);
      setViewerError('');
      if (FILE_TYPES.has(m.type)) {
        setViewerLoading(true);
        const { data: url, error: err } = await newMaterialService.getDownloadUrl(scope, ownerId, m.id);
        setViewerLoading(false);
        if (url) setViewerUrl(url);
        else setViewerError(err?.message || 'Could not load this material.');
      }
    },
    [scope, ownerId]
  );

  const load = useCallback(
    async (selectFirst = false) => {
      if (!ownerId) return;
      setLoading(true);
      setError('');
      const { data, error: err } = await newMaterialService.list(scope, ownerId);
      if (err) setError(err.message || 'Failed to load materials');
      const list = Array.isArray(data) ? [...data] : [];
      list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setMaterials(list);
      setLoading(false);
      if (selectFirst) {
        // Opening a (new) owner: jump straight to its first material.
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
    [scope, ownerId, openMaterial]
  );

  // (Re)load whenever the owner changes — covers initial mount and sibling navigation
  // (which swaps ownerId without remounting the page). Also reset any open composer.
  useEffect(() => {
    setComposer(null);
    load(true);
  }, [scope, ownerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (m) => {
    if (!window.confirm(`Delete "${m.title}"? This cannot be undone.`)) return;
    setBusyId(m.id);
    const { error: err } = await newMaterialService.remove(scope, ownerId, m.id);
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
    const r1 = await newMaterialService.update(scope, ownerId, a.id, { sortOrder: bOrder });
    const r2 = await newMaterialService.update(scope, ownerId, b.id, { sortOrder: aOrder });
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
    <>
      {/* Add buttons (hidden in read-only / student view) */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
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
      )}

      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded-md text-sm mb-4">
          <Icon name="AlertCircle" size={16} className="mt-0.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-destructive/70 hover:text-destructive">
            <Icon name="X" size={14} />
          </button>
        </div>
      )}

      {!readOnly && composer && (
        <div className="mb-4">
          <MaterialComposer
            scope={scope}
            ownerId={ownerId}
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
        <aside className="lg:w-80 flex-shrink-0 border border-border rounded-2xl bg-card shadow-sm overflow-hidden flex flex-col">
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
              <Icon name="FolderOpen" size={36} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm">No materials yet.</p>
              {!readOnly && <p className="text-xs mt-1">Add a file, note or link above.</p>}
            </div>
          ) : (
            <ul className="overflow-y-auto divide-y divide-border flex-1">
              {materials.map((m, i) => {
                const meta = metaFor(m.type);
                const active = selected?.id === m.id;
                return (
                  <li key={m.id} className={cn('group', active ? 'bg-primary/5' : 'hover:bg-muted/50')}>
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <button onClick={() => openMaterial(m)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
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
                      {!readOnly && (
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={() => handleMove(i, -1)} disabled={i === 0 || busyId === m.id} title="Move up" className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30">
                            <Icon name="ChevronUp" size={14} />
                          </button>
                          <button onClick={() => handleMove(i, 1)} disabled={i === materials.length - 1 || busyId === m.id} title="Move down" className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30">
                            <Icon name="ChevronDown" size={14} />
                          </button>
                          <button onClick={() => setComposer({ mode: m.type === 'NOTE' ? 'NOTE' : m.type === 'LINK' ? 'LINK' : 'FILE', editing: m })} title="Edit" className="p-1 rounded text-primary hover:bg-primary/10">
                            <Icon name="Edit" size={14} />
                          </button>
                          <button onClick={() => handleDelete(m)} disabled={busyId === m.id} title="Delete" className="p-1 rounded text-destructive hover:bg-destructive/10 disabled:opacity-50">
                            <Icon name="Trash2" size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Viewer pane */}
        <section ref={viewerRef} className="flex-1 border border-border rounded-2xl bg-card shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
              <Icon name="MonitorPlay" size={48} className="mb-3 text-muted-foreground" />
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
                <MaterialViewer material={selected} url={viewerUrl} loading={viewerLoading} error={viewerError} />
              </div>
            </>
          )}
        </section>
      </div>
    </>
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
        <Icon name="Link" size={40} className="text-primary mb-3" />
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
        <Icon name="AlertCircle" size={36} className="text-destructive/70 mb-2" />
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

export default MaterialsManager;
