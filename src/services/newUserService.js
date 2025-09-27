import { get, post, put, patch, del } from '../lib/apiClient';

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

  // Get all users with filters - role-based (DEPRECATED: use getStudentsByBatch() or getTeachers() instead)
  async getUsers(filters = {}) {
    try {
      const role = filters.role || 'STUDENT';
      
      // Delegate to specific methods that use proper POST APIs
      if (role.toUpperCase() === 'TEACHER') {
        const { data, pagination, error } = await this.getTeachers({ page: 0, size: 1000 }); // Large size for backward compatibility
        return { data, error };
      } else if (role.toUpperCase() === 'STUDENT') {
        const { data, pagination, error } = await this.getStudentsByBatch(null, { page: 0, size: 1000 }); // Large size for backward compatibility
        return { data, error };
      } else {
        // For other roles, return empty (this was mainly used for students/teachers)
        return { data: [], error: null };
      }
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

  // Update teacher using TeacherController
  async updateTeacher(teacherId, teacherData) {
    try {
      console.log('updateTeacher called with:', { teacherId, teacherData });
      
      // Transform teacher data to match UpdateTeacherRequestDto format
      const updateData = {
        firstName: teacherData.firstName,
        lastName: teacherData.lastName,
        phone: teacherData.phone || '',
        department: teacherData.department || '',
        subject: teacherData.subject || '',
        qualification: teacherData.qualification || '',
        experienceYears: teacherData.experienceYears || 0,
        specialization: teacherData.specialization || '',
        bio: teacherData.bio || '',
        instituteId: teacherData.instituteId,
        enabled: teacherData.enabled !== undefined ? teacherData.enabled : true,
      };

      console.log('Calling PUT /teachers/{id} with:', { teacherId, updateData });

      const { data, error, success } = await put(`/teachers/${teacherId}`, updateData);
      
      console.log('TeacherController API response:', { data, error, success });
      
      if (success && data) {
        return { data, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      console.error('Error updating teacher:', error);
      return { data: null, error };
    }
  },

  // Update student using StudentController
  async updateStudent(studentId, studentData) {
    try {
      console.log('updateStudent called with:', { studentId, studentData });
      
      // Transform student data to match UpdateStudentRequestDto format
      const updateData = {
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        phone: studentData.phone || '',
        course: studentData.course || '',
        yearOfStudy: studentData.yearOfStudy || 1,
        rollNumber: studentData.rollNumber || '',
        parentName: studentData.parentName || '',
        parentPhone: studentData.parentPhone || '',
        parentEmail: studentData.parentEmail || '',
        address: studentData.address || '',
        dateOfBirth: studentData.dateOfBirth ? `${studentData.dateOfBirth}T00:00:00.000Z` : null,
        bloodGroup: studentData.bloodGroup || '',
        emergencyContact: studentData.emergencyContact || '',
        instituteId: studentData.instituteId,
        enabled: studentData.enabled !== undefined ? studentData.enabled : true,
      };

      console.log('Calling PUT /students/{id} with:', { studentId, updateData });

      const { data, error, success } = await put(`/students/${studentId}`, updateData);
      
      console.log('StudentController API response:', { data, error, success });
      
      if (success && data) {
        return { data, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      console.error('Error updating student:', error);
      return { data: null, error };
    }
  },

  // Update user (for CreateUserModal compatibility)
  async updateUser(userId, userData) {
    try {
      console.log('updateUser called with:', { userId, userData });
      
      // Determine role from userData
      const role = userData.role || 'STUDENT';
      
      // If it's a teacher, use the specific updateTeacher method
      if (role.toUpperCase() === 'TEACHER') {
        return await this.updateTeacher(userId, userData);
      }
      
      // If it's a student, use the specific updateStudent method
      if (role.toUpperCase() === 'STUDENT') {
        return await this.updateStudent(userId, userData);
      }
      
      // For other roles, use the generic user update
      const updateData = {
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: role.toUpperCase(),
        instituteId: userData.instituteId,
      };

      // Only include password if provided
      if (userData.password && userData.password.trim()) {
        updateData.password = userData.password;
      }

      console.log('Calling PUT API with:', { endpoint: `/users/${role.toUpperCase()}/${userId}`, updateData });

      const { data, error, success } = await put(`/users/${role.toUpperCase()}/${userId}`, updateData);
      
      console.log('API response:', { data, error, success });
      
      if (success && data) {
        return { data, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      console.error('Error updating user:', error);
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
      };

      // Include instituteId if provided (for super admin creating users for different institutes)
      if (userData.instituteId) {
        registerData.instituteId = userData.instituteId;
      }

      const role = userData.role?.toUpperCase() || 'STUDENT';
      let endpoint;
      let payload = { ...registerData };
      
      // Use specific endpoint based on role
      if (role === 'INST_ADMIN' || role === 'INSTITUTE_ADMIN') {
        endpoint = '/users/register';
        // For institute admin, include role in payload and ensure instituteId is provided
        payload.role = 'INST_ADMIN';
        if (!payload.instituteId) {
          return { data: null, error: 'Institute ID is required for institute admin creation' };
        }
      } else if (role === 'TEACHER') {
        endpoint = '/teachers';
      } else if (role === 'STUDENT') {
        endpoint = '/students';
      } else {
        endpoint = '/students'; // Default fallback
      }

      const { data, error, success } = await post(endpoint, payload);
      
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

  // Get students by batch - using students search API (instituteId from JWT token)
  async getStudentsByBatch(batchId = null, pagination = { page: 0, size: 20 }) {
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

      // Add batch filter if provided
      if (batchId) {
        payload.criteria.batchId = batchId;
      }
      
      const { data, error, success } = await post('/students/search/advanced', payload);
      
      if (success && data) {
        // Handle double-nested response: data.data.students or data.students  
        const nestedData = data.data || data;
        const students = nestedData.students || nestedData.content || nestedData.users || (Array.isArray(nestedData) ? nestedData : []);
        const totalElements = nestedData.totalCount || nestedData.totalElements || nestedData.total || students.length;
        const totalPages = nestedData.totalPages || Math.ceil(totalElements / payload.pagination.size);
        const currentPage = nestedData.page !== undefined ? nestedData.page : nestedData.number !== undefined ? nestedData.number : pagination.page || 0;
        const hasMore = currentPage < totalPages - 1;
        
        return { 
          data: students, 
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

  // Get teachers - using teachers search API (instituteId from JWT token)
  async getTeachers(pagination = { page: 0, size: 20 }) {
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
      
      const { data, error, success } = await post('/teachers/search/advanced', payload);
      
      if (success && data) {
        // Handle double-nested response: data.data.teachers or data.teachers
        const nestedData = data.data || data;
        const teachers = nestedData.teachers || nestedData.content || nestedData.users || (Array.isArray(nestedData) ? nestedData : []);
        const totalElements = nestedData.totalCount || nestedData.totalElements || nestedData.total || teachers.length;
        const totalPages = nestedData.totalPages || Math.ceil(totalElements / payload.pagination.size);
        const currentPage = nestedData.page !== undefined ? nestedData.page : nestedData.number !== undefined ? nestedData.number : pagination.page || 0;
        const hasMore = currentPage < totalPages - 1;
        
        return { 
          data: teachers, 
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
        // role is implied by the endpoint, no need to send it
      };

      // Include instituteId if provided (for super admin creating teachers for different institutes)
      if (teacherData.instituteId) {
        registerData.instituteId = teacherData.instituteId;
      }

      // Use teachers endpoint for creation
      const { data, error, success } = await post('/teachers', registerData);
      
      if (success && data) {
        // Backend may return user object directly or wrapped
        const userData = data.user || data;
        return { data: userData, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Register institute admin (super admin function)
  async registerInstituteAdmin(adminData) {
    try {
      const registerData = {
        username: adminData.username || adminData.email,
        email: adminData.email,
        password: adminData.password,
        firstName: adminData.fullName?.split(' ')[0] || adminData.firstName,
        lastName: adminData.fullName?.split(' ').slice(1).join(' ') || adminData.lastName,
        role: 'INST_ADMIN',
        instituteId: adminData.instituteId
      };

      if (!registerData.instituteId) {
        return { data: null, error: 'Institute ID is required for institute admin creation' };
      }

      const { data, error, success } = await post('/users/register', registerData);
      
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
        // role is implied by the endpoint, no need to send it
      };

      // Include instituteId if provided (for super admin creating students for different institutes)
      if (studentData.instituteId) {
        registerData.instituteId = studentData.instituteId;
      }

      // Use students endpoint for creation
      const { data, error, success } = await post('/students', registerData);
      
      if (success && data) {
        return { data, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get student peers
  async getStudentPeers(instituteId) {
    try {
      const { data, error, success } = await get('/students/peers');
      
      if (success && data) {
        const peers = Array.isArray(data) ? data : [data];
        return { data: peers, error: null };
      }
      
      return { data: [], error };
    } catch (error) {
      return { data: [], error };
    }
  },

  // Get institute teachers (by institute ID)
  async getInstituteTeachers(instituteId) {
    try {
      const endpoint = instituteId 
        ? `/teachers/institute/${instituteId}`
        : '/teachers';
        
      const { data, error, success } = await get(endpoint);
      
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
