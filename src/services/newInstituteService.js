import { get, post, put, del } from '../lib/apiClient';

export const newInstituteService = {
  // Get all institutes (Super Admin only)
  async getInstitutes(filters = {}, pagination = { page: 0, size: 20 }) {
    try {
      const payload = {
        criteria: {},
        pagination: {
          page: pagination.page || 0,
          size: pagination.size || 20
        },
        sorting: {
          field: 'createdAt',
          direction: 'desc'
        }
      };

      // Add search functionality if available
      if (filters.search && filters.search.trim() !== '') {
        payload.criteria.name = filters.search.trim();
      }

      const { data, error, success } = await post('/institutes/search/advanced', payload);
      
      if (success && data) {
        // Handle double-nested response: data.data.institutes or data.institutes
        const nestedData = data.data || data;
        const institutes = nestedData.institutes || nestedData.content || (Array.isArray(nestedData) ? nestedData : []);
        const totalElements = nestedData.totalCount || nestedData.totalElements || nestedData.total || institutes.length;
        const totalPages = nestedData.totalPages || Math.ceil(totalElements / payload.pagination.size);
        const currentPage = nestedData.page !== undefined ? nestedData.page : nestedData.number !== undefined ? nestedData.number : pagination.page || 0;
        const hasMore = currentPage < totalPages - 1;
        
        return { 
          data: institutes, 
          pagination: {
            currentPage,
            totalPages,
            totalElements,
            hasMore,
            size: payload.pagination.size
          },
          error: null 
        };
      }
      
      return { 
        data: [], 
        pagination: {
          currentPage: 0,
          totalPages: 0,
          totalElements: 0,
          hasMore: false,
          size: 20
        },
        error 
      };
    } catch (error) {
      return { 
        data: [], 
        pagination: {
          currentPage: 0,
          totalPages: 0,
          totalElements: 0,
          hasMore: false,
          size: 20
        },
        error 
      };
    }
  },

  // Get institute by ID
  async getInstitute(instituteId) {
    try {
      const { data, error, success } = await get(`/institutes/${instituteId}`);
      
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
      const { data, error, success } = await get(`/institutes/code/${code}`);
      
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

      const { data, error, success } = await post('/institutes', createData);
      
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

      const { data, error, success } = await put(`/institutes/${instituteId}`, updateData);
      
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
      const { error, success } = await del(`/institutes/${instituteId}`);
      
      if (success) {
        return { error: null };
      }
      
      return { error };
    } catch (error) {
      return { error };
    }
  },

  // Search institutes
  async searchInstitutes(searchTerm, pagination = { page: 0, size: 20 }) {
    try {
      const payload = {
        criteria: {},
        pagination: {
          page: pagination.page || 0,
          size: pagination.size || 20
        },
        sorting: {
          field: 'createdAt',
          direction: 'desc'
        }
      };

      // Add search term to criteria if provided
      if (searchTerm && searchTerm.trim() !== '') {
        payload.criteria.name = searchTerm.trim(); // Assuming institutes are searched by name
      }

      const { data, error, success } = await post('/institutes/search/advanced', payload);
      
      if (success && data) {
        // Handle double-nested response: data.data.institutes or data.institutes
        const nestedData = data.data || data;
        const institutes = nestedData.institutes || nestedData.content || (Array.isArray(nestedData) ? nestedData : []);
        const totalElements = nestedData.totalCount || nestedData.totalElements || nestedData.total || institutes.length;
        const totalPages = nestedData.totalPages || Math.ceil(totalElements / payload.pagination.size);
        const currentPage = nestedData.page !== undefined ? nestedData.page : nestedData.number !== undefined ? nestedData.number : pagination.page || 0;
        const hasMore = currentPage < totalPages - 1;
        
        return { 
          data: institutes, 
          pagination: {
            currentPage,
            totalPages,
            totalElements,
            hasMore,
            size: payload.pagination.size
          },
          error: null 
        };
      }
      
      return { 
        data: [], 
        pagination: {
          currentPage: 0,
          totalPages: 0,
          totalElements: 0,
          hasMore: false,
          size: 20
        },
        error 
      };
    } catch (error) {
      return { 
        data: [], 
        pagination: {
          currentPage: 0,
          totalPages: 0,
          totalElements: 0,
          hasMore: false,
          size: 20
        },
        error 
      };
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
