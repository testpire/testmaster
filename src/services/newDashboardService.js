import { get } from '../lib/apiClient';

export const newDashboardService = {
  // Get teacher dashboard
  async getTeacherDashboard() {
    try {
      const { data, error, success } = await get('/teacher/dashboard');
      
      if (success && data) {
        return { data, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get super admin dashboard
  async getSuperAdminDashboard() {
    try {
      const { data, error, success } = await get('/super-admin/dashboard');
      
      if (success && data) {
        return { data, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get student dashboard data - this might need to be built from multiple endpoints
  async getStudentDashboard() {
    try {
      // Since there's no dedicated student dashboard endpoint, we'll aggregate data
      const [profileResult, peersResult, teachersResult, instituteResult] = await Promise.all([
        get('/student/profile'),
        get('/student/peers'),
        get('/student/teachers'),
        get('/student/institute-info'),
      ]);

      const dashboardData = {
        profile: profileResult.success ? profileResult.data : null,
        peers: peersResult.success ? peersResult.data : [],
        teachers: teachersResult.success ? teachersResult.data : [],
        institute: instituteResult.success ? instituteResult.data : null,
      };

      return { data: dashboardData, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get all users (Super Admin only)
  async getAllUsers() {
    try {
      const { data, error, success } = await get('/super-admin/users');
      
      if (success && data) {
        const users = Array.isArray(data) ? data : [data];
        return { data: users, error: null };
      }
      
      return { data: [], error };
    } catch (error) {
      return { data: [], error };
    }
  },

  // Get user by ID (Super Admin)
  async getSuperAdminUser(userId) {
    try {
      const { data, error, success } = await get(`/super-admin/users/${userId}`);
      
      if (success && data) {
        return { data, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  },
};
