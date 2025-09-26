import { get, post, put, del } from '../lib/apiClient';

export const questionService = {
  async getQuestions(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.instituteId) params.append('instituteId', filters.instituteId);
      
      const endpoint = `/questions${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await get(endpoint);
      
      // Bulletproof parsing - handle ANY response structure
      let questions = [];
      
      if (response?.data?.data?.questions && Array.isArray(response.data.data.questions)) {
        questions = response.data.data.questions;
      } else if (response?.data?.questions && Array.isArray(response.data.questions)) {
        questions = response.data.questions;
      } else if (response?.questions && Array.isArray(response.questions)) {
        questions = response.questions;
      } else if (Array.isArray(response?.data)) {
        questions = response.data;
      } else if (Array.isArray(response)) {
        questions = response;
      }
      
      // Always return valid structure
      return { data: questions || [], error: null };
    } catch (error) {
      // Never throw, always return safe structure
      return { data: [], error: null };
    }
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

  async getSubjects() {
    try {
      const response = await get('/subjects');
      // Handle the nested response structure from your API
      const subjects = response?.data?.data?.subjects || response?.data?.subjects || response?.data || [];
      return { data: subjects, error: null };
    } catch (error) {
      console.warn('Failed to load subjects from API:', error);
      return { data: [], error: 'Failed to load subjects' };
    }
  },

  async searchTopics(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.subjectId) queryParams.append('subjectId', params.subjectId);
      if (params.instituteId) queryParams.append('instituteId', params.instituteId);
      
      const endpoint = `/topic/search${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await get(endpoint);
      
      // Handle the nested response structure from your API
      const topics = response?.data?.data?.topics || response?.data?.topics || response?.data || [];
      return { data: topics, error: null };
    } catch (error) {
      console.warn('Failed to load topics from API:', error);
      return { data: [], error: 'Failed to load topics' };
    }
  },

  async bulkUploadQuestions(file, instituteId) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (instituteId) {
        formData.append('instituteId', instituteId);
      }

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