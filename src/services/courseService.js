import { get, post, put, del } from '../lib/apiClient';

export const courseService = {
  // Course operations
  async getCourses(instituteId) {
    try {
      const endpoint = instituteId ? `/course/institute/${instituteId}` : '/course';
      const response = await get(endpoint);
      const { data, error, success } = response || {};
      
      if (success && data) {
        let courses = [];
        if (data.courses && Array.isArray(data.courses)) {
          courses = data.courses;
        } else if (data.data && data.data.courses && Array.isArray(data.data.courses)) {
          courses = data.data.courses;
        } else if (Array.isArray(data)) {
          courses = data;
        } else if (data.data && Array.isArray(data.data)) {
          courses = data.data;
        } else if (typeof data === 'object' && data !== null) {
          courses = [data];
        }
        return { data: courses, error: null };
      }
      
      return { data: [], error: error || 'Failed to fetch courses' };
    } catch (error) {
      console.error('Error fetching courses:', error);
      return { data: [], error: error.message || 'Network error while fetching courses' };
    }
  },

  async createCourse(courseData) {
    try {
      const { data, error, success } = await post('/course', courseData);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error creating course:', error);
      return { data: null, error: error.message || 'Failed to create course' };
    }
  },

  async updateCourse(courseId, courseData) {
    try {
      const { data, error, success } = await put(`/course/${courseId}`, courseData);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error updating course:', error);
      return { data: null, error: error.message || 'Failed to update course' };
    }
  },

  async deleteCourse(courseId) {
    try {
      const { data, error, success } = await del(`/course/${courseId}`);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error deleting course:', error);
      return { data: null, error: error.message || 'Failed to delete course' };
    }
  },

  // Subject operations
  async getSubjects(courseId, instituteId) {
    try {
      let endpoint;
      if (courseId) {
        endpoint = `/subject/course/${courseId}`;
      } else if (instituteId) {
        endpoint = `/subject/institute/${instituteId}`;
      } else {
        endpoint = '/subject';
      }
      
      const response = await get(endpoint);
      const { data, error, success } = response || {};
      
      if (success && data) {
        let subjects = [];
        if (data.subjects && Array.isArray(data.subjects)) {
          subjects = data.subjects;
        } else if (data.data && data.data.subjects && Array.isArray(data.data.subjects)) {
          subjects = data.data.subjects;
        } else if (Array.isArray(data)) {
          subjects = data;
        } else if (data.data && Array.isArray(data.data)) {
          subjects = data.data;
        } else if (typeof data === 'object' && data !== null) {
          subjects = [data];
        }
        return { data: subjects, error: null };
      }
      
      return { data: [], error: error || 'Failed to fetch subjects' };
    } catch (error) {
      console.error('Error fetching subjects:', error);
      return { data: [], error: error.message || 'Network error while fetching subjects' };
    }
  },

  async createSubject(subjectData) {
    try {
      const { data, error, success } = await post('/subject', subjectData);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error creating subject:', error);
      return { data: null, error: error.message || 'Failed to create subject' };
    }
  },

  async updateSubject(subjectId, subjectData) {
    try {
      const { data, error, success } = await put(`/subject/${subjectId}`, subjectData);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error updating subject:', error);
      return { data: null, error: error.message || 'Failed to update subject' };
    }
  },

  async deleteSubject(subjectId) {
    try {
      const { data, error, success } = await del(`/subject/${subjectId}`);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error deleting subject:', error);
      return { data: null, error: error.message || 'Failed to delete subject' };
    }
  },

  // Chapter operations
  async getChapters(subjectId, instituteId) {
    try {
      let endpoint;
      if (subjectId) {
        endpoint = `/chapter/subject/${subjectId}`;
      } else if (instituteId) {
        endpoint = `/chapter/institute/${instituteId}`;
      } else {
        endpoint = '/chapter';
      }
      
      const response = await get(endpoint);
      const { data, error, success } = response || {};
      
      if (success && data) {
        let chapters = [];
        if (data.chapters && Array.isArray(data.chapters)) {
          chapters = data.chapters;
        } else if (data.data && data.data.chapters && Array.isArray(data.data.chapters)) {
          chapters = data.data.chapters;
        } else if (Array.isArray(data)) {
          chapters = data;
        } else if (data.data && Array.isArray(data.data)) {
          chapters = data.data;
        } else if (typeof data === 'object' && data !== null) {
          chapters = [data];
        }
        return { data: chapters, error: null };
      }
      
      return { data: [], error: error || 'Failed to fetch chapters' };
    } catch (error) {
      console.error('Error fetching chapters:', error);
      return { data: [], error: error.message || 'Network error while fetching chapters' };
    }
  },

  async createChapter(chapterData) {
    try {
      const { data, error, success } = await post('/chapter', chapterData);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error creating chapter:', error);
      return { data: null, error: error.message || 'Failed to create chapter' };
    }
  },

  async updateChapter(chapterId, chapterData) {
    try {
      const { data, error, success } = await put(`/chapter/${chapterId}`, chapterData);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error updating chapter:', error);
      return { data: null, error: error.message || 'Failed to update chapter' };
    }
  },

  async deleteChapter(chapterId) {
    try {
      const { data, error, success } = await del(`/chapter/${chapterId}`);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error deleting chapter:', error);
      return { data: null, error: error.message || 'Failed to delete chapter' };
    }
  },

  // Topic operations
  async getTopics(chapterId, instituteId) {
    try {
      let endpoint;
      if (chapterId) {
        endpoint = `/topic/chapter/${chapterId}`;
      } else if (instituteId) {
        endpoint = `/topic/institute/${instituteId}`;
      } else {
        endpoint = '/topic';
      }
      
      const response = await get(endpoint);
      const { data, error, success } = response || {};
      
      if (success && data) {
        let topics = [];
        if (data.topics && Array.isArray(data.topics)) {
          topics = data.topics;
        } else if (data.data && data.data.topics && Array.isArray(data.data.topics)) {
          topics = data.data.topics;
        } else if (Array.isArray(data)) {
          topics = data;
        } else if (data.data && Array.isArray(data.data)) {
          topics = data.data;
        } else if (typeof data === 'object' && data !== null) {
          topics = [data];
        }
        return { data: topics, error: null };
      }
      
      return { data: [], error: error || 'Failed to fetch topics' };
    } catch (error) {
      console.error('Error fetching topics:', error);
      return { data: [], error: error.message || 'Network error while fetching topics' };
    }
  },

  async createTopic(topicData) {
    try {
      const { data, error, success } = await post('/topic', topicData);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error creating topic:', error);
      return { data: null, error: error.message || 'Failed to create topic' };
    }
  },

  async updateTopic(topicId, topicData) {
    try {
      const { data, error, success } = await put(`/topic/${topicId}`, topicData);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error updating topic:', error);
      return { data: null, error: error.message || 'Failed to update topic' };
    }
  },

  async deleteTopic(topicId) {
    try {
      const { data, error, success } = await del(`/topic/${topicId}`);
      return { data, error: success ? null : error };
    } catch (error) {
      console.error('Error deleting topic:', error);
      return { data: null, error: error.message || 'Failed to delete topic' };
    }
  }
};