import { get, post, put, del } from '../lib/apiClient';

export const courseService = {
  // Helper method to search specific entity types
  async searchEntityAdvanced(endpoint, criteria = {}, pagination = { page: 0, size: 20 }) {
    try {
      const payload = {
        criteria: criteria,
        pagination: {
          page: pagination.page || 0,
          size: pagination.size || 20
        },
        sorting: {
          field: 'createdAt',
          direction: 'desc'
        }
      };

      const response = await post(endpoint, payload);
      const data = response?.data?.data || response?.data || response;
      const content = data?.content || data?.courses || data?.subjects || data?.chapters || data?.topics || data || [];
      const totalElements = data?.totalElements || data?.total || content.length;
      const totalPages = data?.totalPages || Math.ceil(totalElements / payload.pagination.size);
      const currentPage = data?.number !== undefined ? data.number : pagination.page || 0;
      const hasMore = currentPage < totalPages - 1;
      
      return { 
        data: content, 
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
      console.warn(`Failed to search ${endpoint}:`, error);
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

  // Course operations
  async getCourses(pagination = { page: 0, size: 20 }) {
    return await this.searchEntityAdvanced('/courses/search/advanced', {}, pagination);
  },

  async createCourse(courseData) {
    try {
      const { data, error, success } = await post('/courses', courseData);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error creating course:', error);
      return { data: null, error: error.message || 'Failed to create course' };
    }
  },

  async updateCourse(courseId, courseData) {
    try {
      const { data, error, success } = await put(`/courses/${courseId}`, courseData);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error updating course:', error);
      return { data: null, error: error.message || 'Failed to update course' };
    }
  },

  async deleteCourse(courseId) {
    try {
      const { data, error, success } = await del(`/courses/${courseId}`);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error deleting course:', error);
      return { data: null, error: error.message || 'Failed to delete course' };
    }
  },

  // Subject operations
  async getSubjects(courseId = null, pagination = { page: 0, size: 20 }) {
    const criteria = {};
    if (courseId) {
      criteria.courseId = courseId;
    }
    return await this.searchEntityAdvanced('/subjects/search/advanced', criteria, pagination);
  },

  async createSubject(subjectData) {
    try {
      const { data, error, success } = await post('/subjects', subjectData);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error creating subject:', error);
      return { data: null, error: error.message || 'Failed to create subject' };
    }
  },

  async updateSubject(subjectId, subjectData) {
    try {
      const { data, error, success } = await put(`/subjects/${subjectId}`, subjectData);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error updating subject:', error);
      return { data: null, error: error.message || 'Failed to update subject' };
    }
  },

  async deleteSubject(subjectId) {
    try {
      const { data, error, success } = await del(`/subjects/${subjectId}`);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error deleting subject:', error);
      return { data: null, error: error.message || 'Failed to delete subject' };
    }
  },

  // Chapter operations
  async getChapters(subjectId = null, pagination = { page: 0, size: 20 }) {
    const criteria = {};
    if (subjectId) {
      criteria.subjectId = subjectId;
    }
    return await this.searchEntityAdvanced('/chapters/search/advanced', criteria, pagination);
  },

  async createChapter(chapterData) {
    try {
      const { data, error, success } = await post('/chapters', chapterData);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error creating chapter:', error);
      return { data: null, error: error.message || 'Failed to create chapter' };
    }
  },

  async updateChapter(chapterId, chapterData) {
    try {
      const { data, error, success } = await put(`/chapters/${chapterId}`, chapterData);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error updating chapter:', error);
      return { data: null, error: error.message || 'Failed to update chapter' };
    }
  },

  async deleteChapter(chapterId) {
    try {
      const { data, error, success } = await del(`/chapters/${chapterId}`);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error deleting chapter:', error);
      return { data: null, error: error.message || 'Failed to delete chapter' };
    }
  },

  // Topic operations
  async getTopics(chapterId = null, pagination = { page: 0, size: 20 }) {
    const criteria = {};
    if (chapterId) {
      criteria.chapterId = chapterId;
    }
    return await this.searchEntityAdvanced('/topics/search/advanced', criteria, pagination);
  },

  async createTopic(topicData) {
    try {
      const { data, error, success } = await post('/topics', topicData);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error creating topic:', error);
      return { data: null, error: error.message || 'Failed to create topic' };
    }
  },

  async updateTopic(topicId, topicData) {
    try {
      const { data, error, success } = await put(`/topics/${topicId}`, topicData);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error updating topic:', error);
      return { data: null, error: error.message || 'Failed to update topic' };
    }
  },

  async deleteTopic(topicId) {
    try {
      const { data, error, success } = await del(`/topics/${topicId}`);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error deleting topic:', error);
      return { data: null, error: error.message || 'Failed to delete topic' };
    }
  }
};