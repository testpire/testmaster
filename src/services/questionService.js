import { get, post, put, del, getActiveInstituteId } from '../lib/apiClient';
import { courseService } from './courseService';

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

      // Ensure criteria is never completely empty - some backends require at least one field
      let hasCriteria = false;

      // Add filters to criteria (instituteId is extracted from JWT token on backend)
      if (searchParams.difficulty && searchParams.difficulty.trim() !== '') {
        payload.criteria.difficultyLevel = searchParams.difficulty.trim();
        hasCriteria = true;
      }
      if (searchParams.subjectId && searchParams.subjectId !== '') {
        payload.criteria.subjectId = parseInt(searchParams.subjectId);
        hasCriteria = true;
      }
      if (searchParams.chapterId && searchParams.chapterId !== '') {
        payload.criteria.chapterId = parseInt(searchParams.chapterId);
        hasCriteria = true;
      }
      if (searchParams.topicId && searchParams.topicId !== '') {
        payload.criteria.topicId = parseInt(searchParams.topicId);
        hasCriteria = true;
      }

      // If no criteria provided, we still need to send the request (institute filtering happens on backend via JWT)


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

  // Keep the old method for backward compatibility, but use the new search internally
  async getQuestions(filters = {}) {
    return await this.searchQuestions(filters);
  },

  async createQuestion(questionData) {
    try {
      // For SUPER_ADMIN, force instituteId to the selected institute so the body agrees
      // with the X-Institute-Id header; other roles keep their own payload value.
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

  // Use courseService methods for common search APIs  
  async getSubjects(pagination = { page: 0, size: 100 }) {
    // For dropdowns, use larger page size to get all options
    return await courseService.getSubjects(null, pagination);
  },

  async getChaptersBySubject(subjectId, pagination = { page: 0, size: 100 }) {
    // For dropdowns, use larger page size to get all options
    return await courseService.getChapters(subjectId, pagination);
  },

  async getTopicsByChapter(chapterId, pagination = { page: 0, size: 100 }) {
    // For dropdowns, use larger page size to get all options
    return await courseService.getTopics(chapterId, pagination);
  },

  // Keep searchTopics for backward compatibility if needed elsewhere
  async searchTopics(params = {}) {
    const pagination = { page: 0, size: 100 }; // For dropdowns
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