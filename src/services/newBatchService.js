import { get, post, put, del, getActiveInstituteId } from '../lib/apiClient';
import { unwrapOne, unwrapList } from '../utils/responseHelpers';

// Batch service — backs the Course → Batch relationship (one course has many batches)
// and the student batch-membership flow. Talks to the TestPire REST API (`/api/batches`).
// Every method returns the standard `{ data, error }` envelope and never throws.
//
// A batch carries a weekly `timetable` (TimetableSlot[]); the *course* owns the fee, not
// the batch. The backend exposes a list-all (GET /batches) plus per-course
// (GET /batches/course/{courseId}). Response bodies may be wrapped as { data: ... } or
// { batches: [...] }, so we unwrap defensively (shared helpers in utils/responseHelpers).

export const newBatchService = {
  // List every batch in scope (institute from JWT / X-Institute-Id). Used by the student
  // form's batch picker, where batch selection is independent of course selection.
  async getAllBatches() {
    try {
      const { data, error, success } = await get('/batches');
      if (!success) return { data: [], error };
      return { data: unwrapList(data, 'batches'), error: null };
    } catch (error) {
      return { data: [], error: { message: error?.message || 'Failed to load batches' } };
    }
  },

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
  // capacity, timetable, active). courseId is fixed at creation and not updatable here.
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
