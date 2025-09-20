import { get } from '../lib/apiClient';

export const newDashboardService = {
  // Get teacher dashboard - build from available endpoints
  async getTeacherDashboard(instituteId) {
    try {
      // Since there's no dedicated teacher dashboard endpoint, we'll aggregate data
      const [profileResult, studentsResult] = await Promise.all([
        get('/teachers/profile'),
        instituteId ? get(`/students/institute/${instituteId}`) : get('/students'),
      ]);

      const dashboardData = {
        profile: profileResult.success ? profileResult.data : null,
        students: studentsResult.success ? (studentsResult.data.students || studentsResult.data.data || studentsResult.data || []) : [],
      };

      return { data: dashboardData, error: null };
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
  async getStudentDashboard(instituteId) {
    try {
      // Since there's no dedicated student dashboard endpoint, we'll aggregate data
      const [profileResult, peersResult, teachersResult] = await Promise.all([
        get('/students/profile'),
        get('/students/peers'),
        instituteId ? get(`/teachers/institute/${instituteId}`) : get('/teachers'),
      ]);

      const dashboardData = {
        profile: profileResult.success ? profileResult.data : null,
        peers: peersResult.success ? (peersResult.data.students || peersResult.data.data || peersResult.data || []) : [],
        teachers: teachersResult.success ? (teachersResult.data.teachers || teachersResult.data.data || teachersResult.data || []) : [],
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
        // Backend may return wrapped structure { users: [...] }
        const users = data.users || data.data || (Array.isArray(data) ? data : [data]);
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
