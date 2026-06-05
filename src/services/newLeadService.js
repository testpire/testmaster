import { get, post, put, del } from '../lib/apiClient';

// Lead Management service — backs the capture → nurture → convert-to-student flow.
// Talks to the TestPire REST API (`/api/leads`). Every method returns the standard
// `{ data, error }` envelope (list calls also return `pagination`) and never throws.
//
// Lead lifecycle (status enum): NEW → CONTACTED → INTERESTED → DEMO_SCHEDULED → ENROLLED,
// with terminal off-ramps LOST / NOT_INTERESTED. Once converted, a lead carries
// `convertedUserId` + `enrolledCourseId` and cannot be converted again.

const DEFAULT_PAGINATION = {
  currentPage: 0,
  totalPages: 0,
  totalElements: 0,
  hasMore: false,
  size: 20
};

export const newLeadService = {
  // List leads via the typed GET /api/leads endpoint (supports filtering + paging through
  // query params). Returns the same pagination shape the rest of the app consumes.
  async getLeads(filters = {}) {
    const page = filters.page ?? 0;
    const size = filters.size ?? 20;

    try {
      // Only send params that are actually set, so empty filters don't over-constrain.
      const params = { page, size };
      if (filters.status) params.status = filters.status;
      if (filters.source) params.source = filters.source;
      if (filters.assignedTo) params.assignedTo = filters.assignedTo;
      if (filters.interestedCourseId) params.interestedCourseId = filters.interestedCourseId;
      if (typeof filters.converted === 'boolean') params.converted = filters.converted;
      if (filters.searchText && filters.searchText.trim() !== '') {
        params.searchText = filters.searchText.trim();
      }
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.sortDirection) params.sortDirection = filters.sortDirection;

      const { data, error, success } = await get('/leads', { params });

      if (!success) {
        return { data: [], pagination: { ...DEFAULT_PAGINATION, size }, error };
      }

      // Defensively unwrap: body may be LeadListResponseDto directly or wrapped in { data: ... }.
      const body = data?.data ?? data ?? {};
      const leads = Array.isArray(body)
        ? body
        : body.leads || body.content || body.data || [];
      const totalElements =
        body.totalCount ?? body.totalElements ?? body.total ?? leads.length;
      const currentPage = body.page ?? body.number ?? page;
      const totalPages = body.totalPages ?? (Math.ceil(totalElements / size) || 0);
      const hasMore = (currentPage + 1) * size < totalElements;

      return {
        data: leads,
        pagination: { currentPage, totalPages, totalElements, hasMore, size },
        error: null
      };
    } catch (error) {
      return {
        data: [],
        pagination: { ...DEFAULT_PAGINATION, size },
        error: { message: error?.message || 'Failed to load leads' }
      };
    }
  },

  async getLead(id) {
    try {
      const { data, error, success } = await get(`/leads/${id}`);
      if (!success) return { data: null, error };
      return { data: data?.data ?? data, error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to load lead' } };
    }
  },

  async createLead(leadData) {
    try {
      const { data, error, success } = await post('/leads', leadData);
      if (!success) return { data: null, error };
      return { data: data?.data ?? data, error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to create lead' } };
    }
  },

  async updateLead(id, leadData) {
    try {
      const { data, error, success } = await put(`/leads/${id}`, leadData);
      if (!success) return { data: null, error };
      return { data: data?.data ?? data, error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to update lead' } };
    }
  },

  async deleteLead(id) {
    try {
      const { data, error, success } = await del(`/leads/${id}`);
      if (!success) return { data: null, error };
      return { data: data?.data ?? data ?? true, error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to delete lead' } };
    }
  },

  // Convert a lead into an actual student user. Creates the student + enrolls them in
  // `enrolledCourseId`; the lead is then marked converted (convertedUserId set).
  async convertLead(id, conversionData) {
    try {
      const { data, error, success } = await post(`/leads/${id}/convert`, conversionData);
      if (!success) return { data: null, error };
      return { data: data?.data ?? data, error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to convert lead' } };
    }
  }
};

export default newLeadService;
