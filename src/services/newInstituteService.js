import { get, post, put, del } from '../lib/apiClient';

export const newInstituteService = {
  // Get all institutes (Super Admin only)
  async getInstitutes(filters = {}) {
    try {
      let endpoint = '/institute';
      
      // Add search functionality if available
      if (filters.search) {
        endpoint = `/institute/search?searchTerm=${encodeURIComponent(filters.search)}`;
      }

      const { data, error, success } = await get(endpoint);
      
      if (success && data) {
        // Backend returns { institutes: [...] } or { data: [...] } structure
        const institutes = data.institutes || data.data || (Array.isArray(data) ? data : [data]);
        return { data: institutes, error: null };
      }
      
      return { data: [], error };
    } catch (error) {
      return { data: [], error };
    }
  },

  // Get institute by ID
  async getInstitute(instituteId) {
    try {
      const { data, error, success } = await get(`/institute/${instituteId}`);
      
      if (success && data) {
        return { data, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get institute by code
  async getInstituteByCode(code) {
    try {
      const { data, error, success } = await get(`/institute/code/${code}`);
      
      if (success && data) {
        return { data, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Create new institute (Super Admin only)
  async createInstitute(instituteData) {
    try {
      const createData = {
        name: instituteData.name,
        code: instituteData.code,
        address: instituteData.address,
        city: instituteData.city,
        state: instituteData.state,
        country: instituteData.country,
        postalCode: instituteData.postalCode,
        phone: instituteData.phone,
        email: instituteData.email,
        website: instituteData.website,
        description: instituteData.description,
      };

      const { data, error, success } = await post('/institute', createData);
      
      if (success && data) {
        return { data, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Update institute (Super Admin only)
  async updateInstitute(instituteId, updates) {
    try {
      const updateData = {
        name: updates.name,
        code: updates.code,
        address: updates.address,
        city: updates.city,
        state: updates.state,
        country: updates.country,
        postalCode: updates.postalCode,
        phone: updates.phone,
        email: updates.email,
        website: updates.website,
        description: updates.description,
      };

      const { data, error, success } = await put(`/institute/${instituteId}`, updateData);
      
      if (success && data) {
        return { data, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Delete institute (Super Admin only)
  async deleteInstitute(instituteId) {
    try {
      const { error, success } = await del(`/institute/${instituteId}`);
      
      if (success) {
        return { error: null };
      }
      
      return { error };
    } catch (error) {
      return { error };
    }
  },

  // Search institutes
  async searchInstitutes(searchTerm) {
    try {
      const { data, error, success } = await get(`/institute/search?searchTerm=${encodeURIComponent(searchTerm)}`);
      
      if (success && data) {
        // Backend returns { institutes: [...] } or { data: [...] } structure
        const institutes = data.institutes || data.data || (Array.isArray(data) ? data : [data]);
        return { data: institutes, error: null };
      }
      
      return { data: [], error };
    } catch (error) {
      return { data: [], error };
    }
  },

  // Get institute information (Student view)
  async getInstituteInfo() {
    try {
      const { data, error, success } = await get('/student/institute-info');
      
      if (success && data) {
        return { data, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  },
};
