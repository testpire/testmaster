import { get, post, put, del, getActiveInstituteId } from '../lib/apiClient';
import { unwrapOne, unwrapList } from '../utils/responseHelpers';

// Batch service — backs the Course → Batch relationship (one course has many batches)
// and the student multi-enrollment flow. Talks to the TestPire REST API (`/api/batches`).
// Every method returns the standard `{ data, error }` envelope and never throws.
//
// Note: the backend exposes batches per-course (GET /batches/course/{courseId}); there is
// no list-all endpoint. Response bodies may be wrapped as { data: ... } or { batches: [...] },
// so we unwrap defensively (shared helpers in utils/responseHelpers).

export const newBatchService = {
  // List all batches belonging to a course.
  async getBatchesByCourse(courseId) {
    if (!courseId) return { data: [], error: null };
    try {
      const { data, error, success } = await get(`/batches/course/${courseId}`);
      if (!success) return { data: [], error };
      return { data: unwrapList(data, 'batches'), error: null };
    } catch (error) {
      return { data: [], error: { message: error?.message || 'Failed to load batches' } };
    }
  },

  async getBatch(batchId) {
    try {
      const { data, error, success } = await get(`/batches/${batchId}`);
      if (!success) return { data: null, error };
      return { data: unwrapOne(data), error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to load batch' } };
    }
  },

  // Create a batch under a course. `courseId` + `name` are required by the API
  // (CreateBatchRequestDto); the rest are optional. For SUPER_ADMIN, instituteId is forced
  // to the switcher's selected institute (matching the X-Institute-Id header); other roles'
  // payloads are scoped from their JWT on the backend.
  async createBatch(batchData) {
    try {
      const scopedId = getActiveInstituteId();
      const body = scopedId != null ? { ...batchData, instituteId: scopedId } : batchData;
      const { data, error, success } = await post('/batches', body);
      if (!success) return { data: null, error };
      return { data: unwrapOne(data), error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to create batch' } };
    }
  },

  // Update a batch (UpdateBatchRequestDto: name, code, description, startDate, endDate,
  // capacity, active). courseId is fixed at creation and not updatable here.
  async updateBatch(batchId, updates) {
    try {
      const { data, error, success } = await put(`/batches/${batchId}`, updates);
      if (!success) return { data: null, error };
      return { data: unwrapOne(data), error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to update batch' } };
    }
  },

  async deleteBatch(batchId) {
    try {
      const { data, error, success } = await del(`/batches/${batchId}`);
      if (!success) return { data: null, error };
      return { data: unwrapOne(data) ?? true, error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to delete batch' } };
    }
  }
};

export default newBatchService;
