import { get, post, put, del } from '../lib/apiClient';
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
      
      // Parse response
      const data = response?.data?.data || response?.data || response;
      const questions = data?.content || data?.questions || data || [];
      const totalElements = data?.totalElements || data?.total || questions.length;
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
        error: null 
      };
    }
  },

  // Keep the old method for backward compatibility, but use the new search internally
  async getQuestions(filters = {}) {
    return await this.searchQuestions(filters);
  },

  async createQuestion(questionData) {
    try {
      const response = await post('/questions', questionData);
      return { data: response?.data || null, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to create' };
    }
  },

  async deleteQuestion(questionId) {
    try {
      const response = await del(`/questions/${questionId}`);
      return { data: response?.data || null, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to delete' };
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

  async bulkUploadQuestions(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      // instituteId is now extracted from JWT token on backend

      const response = await post('/questions/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
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