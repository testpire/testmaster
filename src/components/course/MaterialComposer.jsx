import React, { useState, useRef } from 'react';
import Button from '../ui/Button';
import Icon from '../AppIcon';
import MathText from '../MathText';
import { cn } from '../../utils/cn';
import {
  newMaterialService,
  ALL_FILE_ACCEPT,
  MATERIAL_MAX_BYTES,
  resolveFileMaterial,
} from '../../services/newMaterialService';
import { formatBytes as fmtBytes } from '../../utils/formatters';

const COMPOSER_ICON = { FILE: 'Upload', NOTE: 'StickyNote', LINK: 'Link' };

/**
 * MaterialComposer — add or edit a single material (FILE / NOTE / LINK) on a
 * curriculum node (topic or chapter).
 *
 * Props:
 *  - scope            : 'topics' | 'chapters' (owner collection)
 *  - ownerId          : id of the owning topic / chapter
 *  - mode             : 'FILE' | 'NOTE' | 'LINK'
 *  - editing          : material object when editing, else null
 *  - defaultSortOrder : sortOrder to assign new materials
 *  - onCancel, onDone : callbacks
 */
const MaterialComposer = ({ scope, ownerId, mode, editing, defaultSortOrder = 0, onCancel, onDone }) => {
  const isEdit = !!editing;
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState(editing?.title || '');
  const [description, setDescription] = useState(editing?.description || '');
  const [content, setContent] = useState(editing?.content || '');
  const [contentFormat, setContentFormat] = useState(editing?.contentFormat || 'PLAIN');
  const [externalUrl, setExternalUrl] = useState(editing?.externalUrl || '');
  const [file, setFile] = useState(null);

  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(null);
  const [err, setErr] = useState('');

  const fileResolved = file ? resolveFileMaterial(file) : null;
  const fileTooBig = file && file.size > MATERIAL_MAX_BYTES;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!title.trim()) return setErr('Title is required.');

    setSaving(true);
    let res;

    if (isEdit) {
      const body = { title: title.trim(), description };
      if (mode === 'NOTE') {
        body.content = content;
        body.contentFormat = contentFormat;
      } else if (mode === 'LINK') {
        body.externalUrl = externalUrl.trim();
      }
      res = await newMaterialService.update(scope, ownerId, editing.id, body);
    } else if (mode === 'FILE') {
      if (!file) {
        setSaving(false);
        return setErr('Choose a file to upload.');
      }
      if (!fileResolved) {
        setSaving(false);
        return setErr('Unsupported file type. Allowed: PDF, PPT/PPTX, MP4/WebM/MOV.');
      }
      if (fileTooBig) {
        setSaving(false);
        return setErr(`File exceeds the ${Math.round(MATERIAL_MAX_BYTES / 1024 / 1024)} MB limit.`);
      }
      setProgress(0);
      res = await newMaterialService.uploadFile(
        scope,
        ownerId,
        file,
        { title: title.trim(), description, sortOrder: defaultSortOrder },
        setProgress
      );
      setProgress(null);
    } else if (mode === 'NOTE') {
      if (!content.trim()) {
        setSaving(false);
        return setErr('Note content is required.');
      }
      res = await newMaterialService.createNote(scope, ownerId, {
        title: title.trim(),
        content,
        contentFormat,
        description,
        sortOrder: defaultSortOrder,
      });
    } else if (mode === 'LINK') {
      if (!externalUrl.trim()) {
        setSaving(false);
        return setErr('A URL is required.');
      }
      res = await newMaterialService.createLink(scope, ownerId, {
        title: title.trim(),
        externalUrl: externalUrl.trim(),
        description,
        sortOrder: defaultSortOrder,
      });
    }

    setSaving(false);
    if (res?.error) {
      setErr(res.error.message || 'Failed to save material.');
      return;
    }
    onDone();
  };

  const heading = {
    FILE: isEdit ? 'Edit file material' : 'Upload a file',
    NOTE: isEdit ? 'Edit note' : 'Add a note',
    LINK: isEdit ? 'Edit link' : 'Add a link',
  }[mode];

  return (
    <form onSubmit={submit} className="border border-border rounded-lg p-4 bg-muted/30 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Icon name={COMPOSER_ICON[mode]} size={16} className="text-primary" />
          {heading}
        </h4>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <Icon name="X" size={16} />
        </button>
      </div>

      {mode === 'FILE' && !isEdit && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">File *</label>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALL_FILE_ACCEPT}
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
              if (f && !title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ''));
            }}
            className="block w-full text-sm text-foreground file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
          {file && (
            <p className={cn('text-xs mt-1', fileResolved && !fileTooBig ? 'text-muted-foreground' : 'text-red-600')}>
              {fileResolved ? `${fileResolved.type} · ${fmtBytes(file.size)}` : 'Unsupported type'}
              {fileTooBig && ' · exceeds 50 MB'}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">PDF, PPT/PPTX, or MP4/WebM/MOV. Max 50 MB.</p>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Lecture 1 slides"
          maxLength={200}
          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {mode === 'LINK' && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">URL *</label>
          <input
            type="url"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://…"
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {mode === 'NOTE' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-muted-foreground">Content *</label>
            <div className="flex items-center gap-1 text-xs">
              {['PLAIN', 'LATEX'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setContentFormat(f)}
                  className={cn(
                    'px-2 py-0.5 rounded border',
                    contentFormat === f
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  )}
                >
                  {f === 'PLAIN' ? 'Plain' : 'LaTeX'}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder={contentFormat === 'LATEX' ? 'Use $…$ for inline math, $$…$$ for block.' : 'Write the note…'}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-card font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
          {contentFormat === 'LATEX' && content.trim() && (
            <div className="mt-2 p-2 border border-border rounded-md bg-card">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Preview</p>
              <div className="text-sm text-foreground"><MathText text={content} /></div>
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
          maxLength={500}
          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {progress != null && (
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">{err}</div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={saving} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : mode === 'FILE' ? 'Upload' : 'Add'}
        </Button>
      </div>
    </form>
  );
};

export default MaterialComposer;
