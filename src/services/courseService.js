import { get, post, put, del, getActiveInstituteId } from '../lib/apiClient';

// For SUPER_ADMIN, force the request body's instituteId to the institute selected in
// the switcher so it agrees with the X-Institute-Id header. Other roles keep their own
// payload (instituteId derived from their JWT/profile) untouched.
const withInstituteScope = (payload) => {
  const scopedId = getActiveInstituteId();
  return scopedId != null ? { ...payload, instituteId: scopedId } : payload;
};

// Build an axios config carrying the `?include=` query param for opt-in nesting.
// Accepts a string ('chapters,topics') or array (['chapters','topics']); returns an
// empty config when nothing is requested so responses stay flat by default.
// Token sets per the API: courses → subjects,chapters,topics; subjects → chapters,topics;
// chapters → topics (must include every ancestor level to expand a deeper one).
const withInclude = (include) => {
  const tokens = (Array.isArray(include) ? include : String(include ?? '').split(','))
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return tokens.length ? { params: { include: tokens.join(',') } } : {};
};

// Fetch a single hierarchy entity by id, optionally expanding children via ?include=.
// Returns { data, error } where data is the unwrapped entity (or null on failure).
const getEntityById = async (endpoint, include) => {
  try {
    const { data, error, success } = await get(endpoint, withInclude(include));
    if (!success) return { data: null, error };
    return { data: data?.data ?? data ?? null, error: null };
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return { data: null, error: error.message || `Failed to fetch ${endpoint}` };
  }
};

// Shared wrapper for simple create/update/delete operations.
// Returns { data, error } — never throws, per project convention.
const crudOp = async (fn, errorMsg) => {
  try {
    const { data, error, success } = await fn();
    return { data, error: success ? null : error };
  } catch (error) {
    console.error(errorMsg, error);
    return { data: null, error: error.message || errorMsg };
  }
};

export const courseService = {
  // Shared advanced-search implementation used by all get* methods.
  // `include` (string | string[]) opts into nested children via the `?include=` query
  // param (e.g. 'subjects,chapters,topics'). Omitted by default → flat responses.
  async searchEntityAdvanced(endpoint, criteria = {}, pagination = { page: 0, size: 20 }, { include } = {}) {
    try {
      const payload = {
        criteria,
        pagination: {
          page: pagination.page || 0,
          size: pagination.size || 20
        },
        sorting: {
          field: 'createdAt',
          direction: 'desc'
        }
      };

      const config = withInclude(include);
      const response = await post(endpoint, payload, config);
      const data = response?.data?.data || response?.data || response;
      const content = data?.content || data?.courses || data?.subjects || data?.chapters || data?.topics || data || [];
      // Total lives in `totalCount` for these endpoints (not totalElements/totalPages).
      const totalElements = data?.totalCount ?? data?.totalElements ?? data?.total ?? content.length;
      const totalPages = data?.totalPages || Math.ceil(totalElements / payload.pagination.size);
      const currentPage = data?.number !== undefined ? data.number : pagination.page || 0;
      const hasMore = currentPage < totalPages - 1;

      return {
        data: content,
        pagination: { currentPage, totalPages, totalElements, hasMore, size: payload.pagination.size },
        error: null
      };
    } catch (error) {
      console.warn(`Failed to search ${endpoint}:`, error);
      return {
        data: [],
        pagination: { currentPage: 0, totalPages: 0, totalElements: 0, hasMore: false, size: 20 },
        error: null
      };
    }
  },

  // Course operations
  async getCourses(pagination = { page: 0, size: 20 }, { include } = {}) {
    return this.searchEntityAdvanced('/courses/search/advanced', {}, pagination, { include });
  },

  // Single course by id. `include` opts into the nested subtree (subjects,chapters,topics).
  async getCourseById(courseId, { include } = {}) {
    return getEntityById(`/courses/${courseId}`, include);
  },

  async createCourse(courseData) {
    return crudOp(() => post('/courses', withInstituteScope(courseData)), 'Error creating course');
  },

  async updateCourse(courseId, courseData) {
    return crudOp(() => put(`/courses/${courseId}`, courseData), 'Error updating course');
  },

  async deleteCourse(courseId) {
    return crudOp(() => del(`/courses/${courseId}`), 'Error deleting course');
  },

  // Subject operations
  async getSubjects(courseId = null, pagination = { page: 0, size: 20 }, { include } = {}) {
    const criteria = courseId ? { courseId } : {};
    return this.searchEntityAdvanced('/subjects/search/advanced', criteria, pagination, { include });
  },

  // Single subject by id. `include` opts into nested children (chapters,topics).
  async getSubjectById(subjectId, { include } = {}) {
    return getEntityById(`/subjects/${subjectId}`, include);
  },

  async createSubject(subjectData) {
    return crudOp(() => post('/subjects', withInstituteScope(subjectData)), 'Error creating subject');
  },

  async updateSubject(subjectId, subjectData) {
    return crudOp(() => put(`/subjects/${subjectId}`, subjectData), 'Error updating subject');
  },

  async deleteSubject(subjectId) {
    return crudOp(() => del(`/subjects/${subjectId}`), 'Error deleting subject');
  },

  // Chapter operations
  async getChapters(subjectId = null, pagination = { page: 0, size: 20 }, { include } = {}) {
    const criteria = subjectId ? { subjectId } : {};
    return this.searchEntityAdvanced('/chapters/search/advanced', criteria, pagination, { include });
  },

  // Single chapter by id. `include` opts into nested children (topics).
  async getChapterById(chapterId, { include } = {}) {
    return getEntityById(`/chapters/${chapterId}`, include);
  },

  async createChapter(chapterData) {
    return crudOp(() => post('/chapters', withInstituteScope(chapterData)), 'Error creating chapter');
  },

  async updateChapter(chapterId, chapterData) {
    return crudOp(() => put(`/chapters/${chapterId}`, chapterData), 'Error updating chapter');
  },

  async deleteChapter(chapterId) {
    return crudOp(() => del(`/chapters/${chapterId}`), 'Error deleting chapter');
  },

  // Topic operations
  async getTopics(chapterId = null, pagination = { page: 0, size: 20 }) {
    const criteria = chapterId ? { chapterId } : {};
    return this.searchEntityAdvanced('/topics/search/advanced', criteria, pagination);
  },

  // Fetch a single topic by id (GET /topics/{id}). Used by the standalone topic
  // materials page on direct load / refresh, when no topic object was passed in state.
  async getTopic(topicId) {
    try {
      const { data, error, success } = await get(`/topics/${topicId}`);
      if (!success) return { data: null, error };
      return { data: data?.data ?? data ?? null, error: null };
    } catch (error) {
      console.error('Error fetching topic:', error);
      return { data: null, error: error.message || 'Failed to fetch topic' };
    }
  },

  async createTopic(topicData) {
    return crudOp(() => post('/topics', withInstituteScope(topicData)), 'Error creating topic');
  },

  async updateTopic(topicId, topicData) {
    return crudOp(() => put(`/topics/${topicId}`, topicData), 'Error updating topic');
  },

  async deleteTopic(topicId) {
    return crudOp(() => del(`/topics/${topicId}`), 'Error deleting topic');
  },

  // Bulk-create subjects, chapters and topics from a single denormalized CSV file.
  // Backend scopes the target institute from the X-Institute-Id header. We attach it
  // explicitly here (not only via the apiClient interceptor) so the upload doesn't depend
  // on the interceptor's runtime conditions. For SUPER_ADMIN it carries the switcher's
  // selected institute; other roles (scopedId null) fall back to their JWT institute.
  // The response may carry row-level failures in an `errors[]` array even on HTTP 200.
  async bulkUploadCurriculum(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const scopedId = getActiveInstituteId();
      const headers = { 'Content-Type': 'multipart/form-data' };
      if (scopedId != null) headers['X-Institute-Id'] = String(scopedId);

      const response = await post('/curriculum/bulk-upload', formData, { headers });

      return {
        data: response?.data || { message: 'File uploaded successfully' },
        error: null,
      };
    } catch (error) {
      console.error('Curriculum bulk upload error:', error);
      return {
        data: null,
        error: error.response?.data?.message || 'Failed to upload curriculum file',
      };
    }
  }
};
