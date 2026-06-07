import { get, post, put, del } from '../lib/apiClient';

// Batch service — backs the Course → Batch relationship (one course has many batches)
// and the student multi-enrollment flow. Talks to the TestPire REST API (`/api/batches`).
// Every method returns the standard `{ data, error }` envelope and never throws.
//
// Note: the backend exposes batches per-course (GET /batches/course/{courseId}); there is
// no list-all endpoint. Response bodies may be wrapped as { data: ... } or { batches: [...] },
// so we unwrap defensively like the other new* services.

// Pull a batch array out of whatever shape the API returns.
const unwrapList = (data) => {
  const body = data?.data ?? data ?? {};
  if (Array.isArray(body)) return body;
  return body.batches || body.content || body.data || [];
};

// Pull a single batch object out of the response envelope.
const unwrapOne = (data) => data?.data ?? data ?? null;

export const newBatchService = {
  // List all batches belonging to a course.
  async getBatchesByCourse(courseId) {
    if (!courseId) return { data: [], error: null };
    try {
      const { data, error, success } = await get(`/batches/course/${courseId}`);
      if (!success) return { data: [], error };
      return { data: unwrapList(data), error: null };
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
  // (CreateBatchRequestDto); the rest are optional. instituteId is scoped from the
  // JWT on the backend but can be passed explicitly for super-admin cross-institute use.
  async createBatch(batchData) {
    try {
      const { data, error, success } = await post('/batches', batchData);
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
