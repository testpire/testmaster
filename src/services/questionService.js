import { get, post, put, del, getActiveInstituteId } from '../lib/apiClient';
import { courseService } from './courseService';

// Map a full question (as returned by GET /questions/{id}) to the PUT request
// body, applying field overrides. Mirrors useQuestionForm.buildPayload so the
// update contract stays identical to the manual-edit modal, while additionally
// preserving fields the modal omits (e.g. correctIntegerAnswer). We re-send the
// whole resource so the update is safe whether the backend PUT is a partial
// update or a full replace.
function buildUpdatePayloadFromQuestion(q = {}, changes = {}) {
  const type = q?.questionType || q?.question_type || 'mcq';

  const hasTopicOverride = changes.topicId !== undefined && changes.topicId !== null && changes.topicId !== '';
  const resolvedTopicId = hasTopicOverride
    ? parseInt(changes.topicId)
    : (q?.topicId != null ? parseInt(q.topicId) : null);

  const difficultyLevel = String(
    changes.difficultyLevel || q?.difficultyLevel || q?.difficulty_level || 'EASY'
  ).toUpperCase();

  return {
    text: q?.text ?? q?.question_text ?? '',
    questionImagePath: q?.questionImagePath || '',
    difficultyLevel,
    topicId: resolvedTopicId,
    questionType: type,
    marks: parseInt(q?.marks) || 4,
    negativeMarks: parseFloat(q?.negativeMarks) || 0,
    textFormat: q?.textFormat || 'PLAIN',
    explanation: q?.explanation || '',
    ...(q?.instituteId != null && { instituteId: q.instituteId }),
    ...(q?.correctIntegerAnswer != null && { correctIntegerAnswer: q.correctIntegerAnswer }),
    ...(String(type).toLowerCase() === 'mcq' && {
      options: (Array.isArray(q?.options) ? q.options : []).map((opt, i) => ({
        text: opt?.text ?? opt?.option_text ?? '',
        optionImagePath: opt?.optionImagePath || '',
        isCorrect: opt?.isCorrect ?? opt?.is_correct ?? false,
        optionOrder: opt?.optionOrder ?? opt?.option_order ?? i + 1
      }))
    })
  };
}

export const questionService = {
  async searchQuestions(searchParams = {}) {
    try {
      // Prepare search payload for POST /questions/search/advanced
      const payload = {
        criteria: {},
        pagination: {
          page: searchParams.page || 0,
          size: searchParams.size || 20
        },
        sorting: {
          field: 'createdAt',
          direction: 'desc'
        }
      };

      // instituteId is extracted from the JWT on the backend; no need to include it here.
      if (searchParams.searchText && searchParams.searchText.trim() !== '') {
        payload.criteria.searchText = searchParams.searchText.trim();
      }
      if (searchParams.difficulty && searchParams.difficulty.trim() !== '') {
        payload.criteria.difficultyLevel = searchParams.difficulty.trim();
      }
      if (searchParams.subjectId && searchParams.subjectId !== '') {
        payload.criteria.subjectId = parseInt(searchParams.subjectId);
      }
      if (searchParams.chapterId && searchParams.chapterId !== '') {
        payload.criteria.chapterId = parseInt(searchParams.chapterId);
      }
      if (searchParams.topicId && searchParams.topicId !== '') {
        payload.criteria.topicId = parseInt(searchParams.topicId);
      }



      const response = await post('/questions/search/advanced', payload);
      
      // Parse response. The backend wraps as { message, success, data } and the
      // questions page is { questions: [...], totalCount: N } — note the total is
      // `totalCount` (not totalElements/totalPages), so it must be read explicitly
      // or pagination collapses to a single page.
      const data = response?.data?.data || response?.data || response;
      const questions = data?.content || data?.questions || data || [];
      const totalElements = data?.totalCount ?? data?.totalElements ?? data?.total ?? questions.length;
      const totalPages = data?.totalPages || Math.ceil(totalElements / payload.pagination.size);
      const currentPage = data?.number !== undefined ? data.number : searchParams.page || 0;
      const hasMore = currentPage < totalPages - 1;
      
      return { 
        data: questions,
        pagination: {
          currentPage,
          totalPages,
          totalElements,
          hasMore,
          size: payload.pagination.size
        },
        error: null 
      };
    } catch (error) {
      console.warn('Advanced search failed:', error);
      return { 
        data: [], 
        pagination: {
          currentPage: 0,
          totalPages: 0,
          totalElements: 0,
          hasMore: false,
          size: 20
        },
        // Surface the failure so callers *can* distinguish "no results" from "request
        // failed". data stays [] so the UI still degrades gracefully.
        error: { message: error?.message || 'Failed to search questions' }
      };
    }
  },

  // Kept for backward compatibility — delegates to searchQuestions.
  async getQuestions(filters = {}) {
    return await this.searchQuestions(filters);
  },

  async createQuestion(questionData) {
    try {
      const scopedId = getActiveInstituteId();
      const body = scopedId != null ? { ...questionData, instituteId: scopedId } : questionData;
      const { data, error, success } = await post('/questions', body);
      if (success) {
        return { data: data?.data || data || null, error: null };
      }
      return { data: null, error: error || { message: 'Failed to create question' } };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to create question' } };
    }
  },

  async updateQuestion(questionId, questionData) {
    try {
      const { data, error, success } = await put(`/questions/${questionId}`, questionData);
      if (success) {
        return { data: data?.data || data || null, error: null };
      }
      return { data: null, error: error || { message: 'Failed to update question' } };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to update question' } };
    }
  },

  // Update only a question's difficulty and/or topic without opening the full
  // editor. Re-fetches the complete question first and merges the change in, so
  // no other field (text, options, explanation) is lost — this holds whether the
  // backend PUT is a partial update or a full replace.
  // `changes` = { difficultyLevel?, topicId? }.
  async updateQuestionFields(questionId, changes = {}) {
    try {
      const { data: full, error: loadError } = await this.getQuestionById(questionId);
      if (loadError || !full) {
        return { data: null, error: loadError || { message: 'Failed to load question for update' } };
      }
      const payload = buildUpdatePayloadFromQuestion(full, changes);
      return await this.updateQuestion(questionId, payload);
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to update question' } };
    }
  },

  async getQuestionById(questionId) {
    try {
      const { data, error, success } = await get(`/questions/${questionId}`);
      if (success) {
        return { data: data?.data || data || null, error: null };
      }
      return { data: null, error: error || { message: 'Failed to load question' } };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to load question' } };
    }
  },

  async deleteQuestion(questionId) {
    try {
      const { data, error, success } = await del(`/questions/${questionId}`);
      if (success) {
        return { data: data || null, error: null };
      }
      return { data: null, error: error || { message: 'Failed to delete question' } };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to delete question' } };
    }
  },

  // Delegates to courseService — large page size to populate dropdowns fully.
  async getSubjects(pagination = { page: 0, size: 100 }) {
    return await courseService.getSubjects(null, pagination);
  },

  async getChaptersBySubject(subjectId, pagination = { page: 0, size: 100 }) {
    return await courseService.getChapters(subjectId, pagination);
  },

  async getTopicsByChapter(chapterId, pagination = { page: 0, size: 100 }) {
    return await courseService.getTopics(chapterId, pagination);
  },

  // A question only carries topicId/topicName (no subject/chapter), so resolving
  // its full Subject→Chapter→Topic path means walking up: topic -> chapterId,
  // chapter -> subjectId. Used to prefill the inline topic editor.
  async getTopicById(topicId) {
    return await courseService.getTopic(topicId);
  },

  async getChapterById(chapterId) {
    return await courseService.getChapterById(chapterId);
  },

  // Kept for backward compatibility.
  async searchTopics(params = {}) {
    const pagination = { page: 0, size: 100 };
    if (params.chapterId) {
      return await courseService.getTopics(params.chapterId, pagination);
    } else if (params.subjectId) {
      return await courseService.getChapters(params.subjectId, pagination);
    } else {
      return await courseService.getTopics(null, pagination);
    }
  },

  // Upload a question/option image to S3 via the backend.
  // Returns { key, url } — `key` is what gets stored on the question
  // (questionImagePath / optionImagePath), `url` is the public URL for preview.
  async uploadImage(file, topicId, isOption = false) {
    try {
      if (!topicId) {
        return { data: null, error: { message: 'A topic must be selected before uploading an image' } };
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('topicId', topicId);
      formData.append('option', isOption);

      const { data, error, success } = await post('/questions/images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (success) {
        const payload = data?.data || data || {};
        return { data: { key: payload.key, url: payload.url }, error: null };
      }
      return { data: null, error: error || { message: 'Failed to upload image' } };
    } catch (error) {
      return { data: null, error: { message: error?.response?.data?.message || error?.message || 'Failed to upload image' } };
    }
  },

  async bulkUploadQuestions(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Attach X-Institute-Id explicitly (not only via the interceptor) so the upload
      // doesn't depend on the interceptor's runtime conditions. SUPER_ADMIN → switcher's
      // selected institute; other roles (scopedId null) fall back to their JWT institute.
      const scopedId = getActiveInstituteId();
      const headers = { 'Content-Type': 'multipart/form-data' };
      if (scopedId != null) headers['X-Institute-Id'] = String(scopedId);

      const response = await post('/questions/bulk-upload', formData, { headers });
      
      return { 
        data: response?.data || { message: 'File uploaded successfully' }, 
        error: null 
      };
    } catch (error) {
      console.error('Bulk upload error:', error);
      return { 
        data: null, 
        error: error.response?.data?.message || 'Failed to upload file'
      };
    }
  }
};