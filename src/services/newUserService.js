import { get, post, put, del } from '../lib/apiClient';

export const newUserService = {
  // Get user profile by ID
  async getUserProfile(userId) {
    try {
      // Note: This might need role-specific endpoint based on user type
      const { data, error, success } = await get(`/users/STUDENT/${userId}`);
      
      if (success && data) {
        return { data, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get all users with filters - role-based
  async getUsers(filters = {}) {
    try {
      const role = filters.role || 'STUDENT';
      let endpoint = `/users/${role.toUpperCase()}`;
      
      // Add search functionality if available
      if (filters.search) {
        endpoint = `/users/${role.toUpperCase()}/search?searchTerm=${encodeURIComponent(filters.search)}`;
      }

      const { data, error, success } = await get(endpoint);
      
      if (success && data) {
        // Transform data to match expected format
        const users = Array.isArray(data) ? data : [data];
        return { data: users, error: null };
      }
      
      return { data: [], error };
    } catch (error) {
      return { data: [], error };
    }
  },

  // Update user profile
  async updateUserProfile(userId, updates) {
    try {
      // Determine role from updates or default to STUDENT
      const role = updates.role || 'STUDENT';
      
      // Transform updates to match API format
      const updateData = {
        username: updates.username,
        email: updates.email,
        firstName: updates.full_name?.split(' ')[0] || updates.firstName,
        lastName: updates.full_name?.split(' ').slice(1).join(' ') || updates.lastName,
        role: role.toUpperCase(),
        instituteId: updates.instituteId || updates.institute_id,
      };

      const { data, error, success } = await put(`/users/${role.toUpperCase()}/${userId}`, updateData);
      
      if (success && data) {
        return { data, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Create user profile (admin only)
  async createUserProfile(userData) {
    try {
      const registerData = {
        username: userData.username || userData.email,
        email: userData.email,
        password: userData.password,
        firstName: userData.fullName?.split(' ')[0] || userData.firstName,
        lastName: userData.fullName?.split(' ').slice(1).join(' ') || userData.lastName,
        role: userData.role?.toUpperCase() || 'STUDENT',
        instituteId: userData.instituteId,
      };

      const { data, error, success } = await post('/users/register', registerData);
      
      if (success && data) {
        return { data, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Delete user (admin only) - soft delete
  async deleteUser(userId, role = 'STUDENT') {
    try {
      const { error, success } = await del(`/users/${role.toUpperCase()}/${userId}`);
      
      if (success) {
        return { error: null };
      }
      
      return { error };
    } catch (error) {
      return { error };
    }
  },

  // Get students by batch - using student operations
  async getStudentsByBatch(batchId) {
    try {
      // This might need to be implemented differently based on available endpoints
      // For now, get all students and filter client-side if needed
      const { data, error, success } = await get('/inst-admin/students');
      
      if (success && data) {
        // Filter by batch if batchId is provided
        const students = Array.isArray(data) ? data : [data];
        const filteredStudents = batchId 
          ? students.filter(student => student.batchId === batchId)
          : students;
          
        return { data: filteredStudents, error: null };
      }
      
      return { data: [], error };
    } catch (error) {
      return { data: [], error };
    }
  },

  // Get teachers
  async getTeachers() {
    try {
      const { data, error, success } = await get('/inst-admin/teachers');
      
      if (success && data) {
        const teachers = Array.isArray(data) ? data : [data];
        return { data: teachers, error: null };
      }
      
      return { data: [], error };
    } catch (error) {
      return { data: [], error };
    }
  },

  // Upload profile photo - placeholder (needs file upload endpoint)
  async uploadProfilePhoto(userId, file) {
    try {
      // This needs to be implemented when file upload endpoint is available
      return { 
        data: null, 
        error: { message: 'Profile photo upload not yet implemented' } 
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Register teacher (admin function)
  async registerTeacher(teacherData) {
    try {
      const registerData = {
        username: teacherData.username || teacherData.email,
        email: teacherData.email,
        password: teacherData.password,
        firstName: teacherData.fullName?.split(' ')[0] || teacherData.firstName,
        lastName: teacherData.fullName?.split(' ').slice(1).join(' ') || teacherData.lastName,
        role: 'TEACHER',
        instituteId: teacherData.instituteId,
      };

      const { data, error, success } = await post('/inst-admin/register/teacher', registerData);
      
      if (success && data) {
        return { data, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Register student (admin function)
  async registerStudent(studentData) {
    try {
      const registerData = {
        username: studentData.username || studentData.email,
        email: studentData.email,
        password: studentData.password,
        firstName: studentData.fullName?.split(' ')[0] || studentData.firstName,
        lastName: studentData.fullName?.split(' ').slice(1).join(' ') || studentData.lastName,
        role: 'STUDENT',
        instituteId: studentData.instituteId,
      };

      const { data, error, success } = await post('/inst-admin/register/student', registerData);
      
      if (success && data) {
        return { data, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get student peers
  async getStudentPeers() {
    try {
      const { data, error, success } = await get('/student/peers');
      
      if (success && data) {
        const peers = Array.isArray(data) ? data : [data];
        return { data: peers, error: null };
      }
      
      return { data: [], error };
    } catch (error) {
      return { data: [], error };
    }
  },

  // Get institute teachers (student view)
  async getInstituteTeachers() {
    try {
      const { data, error, success } = await get('/student/teachers');
      
      if (success && data) {
        const teachers = Array.isArray(data) ? data : [data];
        return { data: teachers, error: null };
      }
      
      return { data: [], error };
    } catch (error) {
      return { data: [], error };
    }
  },
};
