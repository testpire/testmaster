// Backup of original questionService for reference
import { get, post, put, del } from '../lib/apiClient';

export const questionService = {
  // Get all questions with optional filters - SIMPLIFIED VERSION
  async getQuestions(filters = {}) {
    try {
      let endpoint = '/questions';
      const params = new URLSearchParams();
      
      // Add filter parameters
      if (filters.difficulty && filters.difficulty.length > 0) {
        filters.difficulty.forEach(d => params.append('difficulty', d));
      }
      if (filters.instituteId) params.append('instituteId', filters.instituteId);
      
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }
      
      console.log('📡 Calling questions API:', endpoint);
      const response = await get(endpoint);
      console.log('📡 Raw API response:', response);
      
      // Handle your exact API response format
      if (response?.success && response?.data?.questions) {
        const questions = response.data.questions;
        console.log(`✅ Successfully parsed ${questions.length} questions`);
        console.log('✅ Sample question:', questions[0]);
        return { data: questions, error: null };
      }
      
      // Fallback error handling
      console.error('❌ API response format unexpected:', response);
      return { 
        data: [], 
        error: response?.message || 'Unexpected API response format' 
      };
      
    } catch (error) {
      console.error('❌ Error fetching questions:', error);
      return { data: [], error: error.message || 'Network error while fetching questions' };
    }
  }

  // ... other methods would go here
};
