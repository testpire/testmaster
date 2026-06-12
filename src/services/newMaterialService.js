import { get, post, put, del } from '../lib/apiClient';
import { unwrapOne, unwrapList } from '../utils/responseHelpers';

// Material service — study material (PDF / PPT / VIDEO files, inline NOTEs, external
// LINKs) attached to a topic. Backs the per-topic Materials UI in course management.
//
// Everything lives under /api/topics/{topicId}/materials. The backend wraps every
// response as `{ message, success, data }`; we unwrap `data` defensively, matching the
// other new* services. Every method returns the standard `{ data, error }` envelope
// and never throws.
//
// File upload is a 3-step S3 presigned flow:
//   1) POST .../upload-url        → { uploadUrl, s3Key, contentType, expiresInSeconds }
//   2) PUT  <uploadUrl> (to S3)   ← raw bytes, no auth header, exact Content-Type
//   3) POST .../materials         → register the material with the returned s3Key
// Step 2 hits S3 directly (a different host), so it must NOT go through apiClient
// (no Authorization / X-Institute-Id) — we use a bare XHR to also surface progress.

// Allowed file kinds (mirrors the backend's accepted content types). The `type` sent
// in step 3 must match the file's content-type family.
export const MATERIAL_FILE_RULES = {
  PDF: {
    label: 'PDF',
    contentTypes: ['application/pdf'],
    extensions: ['.pdf'],
    accept: '.pdf,application/pdf',
  },
  PPT: {
    label: 'PowerPoint',
    contentTypes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    extensions: ['.ppt', '.pptx'],
    accept: '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
  VIDEO: {
    label: 'Video',
    contentTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    extensions: ['.mp4', '.webm', '.mov'],
    accept: '.mp4,.webm,.mov,video/mp4,video/webm,video/quicktime',
  },
};

// Combined accept string for a single file input that takes any allowed type.
export const ALL_FILE_ACCEPT = Object.values(MATERIAL_FILE_RULES)
  .map((r) => r.accept)
  .join(',');

// 50 MB default cap (backend enforces the real limit against the uploaded S3 object).
export const MATERIAL_MAX_BYTES = 50 * 1024 * 1024;

// Resolve a File into { type, contentType } using its MIME type, falling back to the
// extension when the browser reports an empty/generic type (common for .ppt/.pptx).
export const resolveFileMaterial = (file) => {
  const name = (file?.name || '').toLowerCase();
  const mime = file?.type || '';
  for (const [type, rule] of Object.entries(MATERIAL_FILE_RULES)) {
    if (mime && rule.contentTypes.includes(mime)) return { type, contentType: mime };
  }
  for (const [type, rule] of Object.entries(MATERIAL_FILE_RULES)) {
    if (rule.extensions.some((ext) => name.endsWith(ext))) {
      // Use the browser MIME if it's allowed, else the canonical one for the kind.
      const contentType = mime && rule.contentTypes.includes(mime) ? mime : rule.contentTypes[0];
      return { type, contentType };
    }
  }
  return null;
};

// Raw PUT of file bytes to the presigned S3 URL. Deliberately a bare XHR (not axios /
// apiClient): no Authorization header (the signature is in the URL), exact Content-Type,
// and a progress callback. Resolves to { ok, status } — never throws on HTTP status.
const putToS3 = (uploadUrl, file, contentType, onProgress) =>
  new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', contentType);
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status });
    // A network/CORS failure surfaces here with status 0.
    xhr.onerror = () => resolve({ ok: false, status: xhr.status || 0 });
    xhr.send(file);
  });

export const newMaterialService = {
  // List materials for a topic (ordered by sortOrder; no download URLs included).
  async list(topicId) {
    try {
      const { data, error, success } = await get(`/topics/${topicId}/materials`);
      if (!success) return { data: [], error };
      return { data: unwrapList(data, 'materials'), error: null };
    } catch (error) {
      return { data: [], error: { message: error?.message || 'Failed to load materials' } };
    }
  },

  async getOne(topicId, id) {
    try {
      const { data, error, success } = await get(`/topics/${topicId}/materials/${id}`);
      if (!success) return { data: null, error };
      return { data: unwrapOne(data), error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to load material' } };
    }
  },

  // On-demand presigned download URL (presigned URLs expire, so we fetch per click).
  // For LINK materials the backend returns the externalUrl.
  async getDownloadUrl(topicId, id) {
    try {
      const { data, error, success } = await get(`/topics/${topicId}/materials/${id}/download-url`);
      if (!success) return { data: null, error };
      const payload = unwrapOne(data);
      const url = payload?.downloadUrl || payload?.externalUrl || payload?.url || null;
      return { data: url, error: url ? null : { message: 'No download URL returned' } };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to get download URL' } };
    }
  },

  // Inline NOTE — one step, no S3. contentFormat is PLAIN | LATEX.
  async createNote(topicId, { title, content, contentFormat = 'PLAIN', description, sortOrder }) {
    return registerMaterial(topicId, {
      type: 'NOTE',
      title,
      content,
      contentFormat,
      description,
      sortOrder,
    });
  },

  // External LINK — one step.
  async createLink(topicId, { title, externalUrl, description, sortOrder }) {
    return registerMaterial(topicId, {
      type: 'LINK',
      title,
      externalUrl,
      description,
      sortOrder,
    });
  },

  // File material — full 3-step flow. `onProgress(percent)` reports the S3 upload.
  // Returns the standard envelope; the registered material is in `data` on success.
  async uploadFile(topicId, file, { title, description, sortOrder } = {}, onProgress) {
    const resolved = resolveFileMaterial(file);
    if (!resolved) {
      return { data: null, error: { message: 'Unsupported file type. Allowed: PDF, PPT/PPTX, MP4/WebM/MOV.' } };
    }
    if (file.size > MATERIAL_MAX_BYTES) {
      return { data: null, error: { message: `File exceeds the ${Math.round(MATERIAL_MAX_BYTES / 1024 / 1024)} MB limit.` } };
    }
    const { type, contentType } = resolved;

    // Step 1 — presigned upload URL.
    let s3Key;
    let uploadUrl;
    try {
      const { data, error, success } = await post(`/topics/${topicId}/materials/upload-url`, {
        fileName: file.name,
        contentType,
        sizeBytes: file.size,
      });
      if (!success) return { data: null, error };
      const payload = unwrapOne(data);
      uploadUrl = payload?.uploadUrl;
      s3Key = payload?.s3Key;
      if (!uploadUrl || !s3Key) {
        return { data: null, error: { message: 'Upload URL response was malformed.' } };
      }
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to get upload URL' } };
    }

    // Step 2 — PUT bytes straight to S3.
    const put = await putToS3(uploadUrl, file, contentType, onProgress);
    if (!put.ok) {
      const hint =
        put.status === 0
          ? 'Upload to storage was blocked (likely a CORS/network issue).'
          : `Upload to storage failed (HTTP ${put.status}).`;
      return { data: null, error: { message: hint } };
    }

    // Step 3 — register the material now that the object exists.
    return registerMaterial(topicId, {
      type,
      title: title || file.name,
      description,
      s3Key,
      fileName: file.name,
      contentType,
      sortOrder,
    });
  },

  // PUT update — only metadata / NOTE content / LINK url are editable (not the file).
  async update(topicId, id, body) {
    try {
      const { data, error, success } = await put(`/topics/${topicId}/materials/${id}`, body);
      if (!success) return { data: null, error };
      return { data: unwrapOne(data), error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to update material' } };
    }
  },

  async remove(topicId, id) {
    try {
      const { data, error, success } = await del(`/topics/${topicId}/materials/${id}`);
      if (!success) return { data: null, error };
      return { data: unwrapOne(data) ?? true, error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to delete material' } };
    }
  },
};

// Shared POST /materials registration (used by note/link/file create). Strips
// undefined keys so optional fields aren't sent as nulls.
async function registerMaterial(topicId, payload) {
  try {
    const body = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined && v !== '')
    );
    const { data, error, success } = await post(`/topics/${topicId}/materials`, body);
    if (!success) return { data: null, error };
    return { data: unwrapOne(data), error: null };
  } catch (error) {
    return { data: null, error: { message: error?.message || 'Failed to save material' } };
  }
}

export default newMaterialService;
