import { get, post, put, patch, del } from '../lib/apiClient';
import { fetchAllPages } from '../utils/pagination';

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
        // Page through all teachers (backend caps page size at 100) for the full list.
        const { data, error } = await fetchAllPages((pg) => this.getTeachers(pg));
        return { data, error };
      } else if (role.toUpperCase() === 'STUDENT') {
        // Page through all students (backend caps page size at 100) for the full list.
        const { data, error } = await fetchAllPages((pg) => this.getStudentsByBatch(null, pg));
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

  // Admin: directly set a user's Cognito password — fallback for when Cognito's
  // invite/reset email never arrives. permanent=true makes the password
  // immediately usable (hard reset); permanent=false forces the user to change it
  // at next login (Cognito FORCE_CHANGE_PASSWORD → NEW_PASSWORD_REQUIRED, which the
  // app's set-password flow already handles). Endpoint is keyed by user id, not role.
  async setUserPassword(userId, newPassword, permanent = false) {
    try {
      const { data, error, success } = await post(`/users/${userId}/set-password`, {
        newPassword,
        permanent,
      });

      // Response is ApiResponseDtoVoid — data may be null even on success, so key
      // the result on `success`, not on a truthy payload.
      if (success) {
        return { data: data ?? null, error: null };
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
        currentClass: studentData.currentClass ? parseInt(studentData.currentClass, 10) : null,
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

      // Course enrollments + batch memberships are independent id sets (UpdateStudentRequestDto:
      // courseIds[], batchIds[]). Only send each when the caller supplied it, so a partial
      // update doesn't wipe the student's existing courses or batches.
      if (Array.isArray(studentData.courseIds)) {
        updateData.courseIds = studentData.courseIds.map(Number).filter((n) => !Number.isNaN(n));
      }
      if (Array.isArray(studentData.batchIds)) {
        updateData.batchIds = studentData.batchIds.map(Number).filter((n) => !Number.isNaN(n));
      }

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

      // Forward student-specific fields (course, roll number, parent/personal
      // details) so they are persisted on create — matching updateStudent.
      if (role === 'STUDENT') {
        payload.phone = userData.phone || '';
        payload.course = userData.course || '';
        payload.currentClass = userData.currentClass ? parseInt(userData.currentClass, 10) : null;
        payload.rollNumber = userData.rollNumber || '';
        payload.parentName = userData.parentName || '';
        payload.parentPhone = userData.parentPhone || '';
        payload.parentEmail = userData.parentEmail || '';
        payload.address = userData.address || '';
        payload.dateOfBirth = userData.dateOfBirth ? `${userData.dateOfBirth}T00:00:00.000Z` : null;
        payload.bloodGroup = userData.bloodGroup || '';
        payload.emergencyContact = userData.emergencyContact || '';

        // Course enrollments and batch memberships are independent now (a student has a
        // set of courses — each with its own fee — and a separate set of batches — each
        // with its own timetable). Send them as plain id arrays per CreateStudentRequestDto.
        if (Array.isArray(userData.courseIds)) {
          payload.courseIds = userData.courseIds.map(Number).filter((n) => !Number.isNaN(n));
        }
        if (Array.isArray(userData.batchIds)) {
          payload.batchIds = userData.batchIds.map(Number).filter((n) => !Number.isNaN(n));
        }
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

  // Fetch a single student's full record (StudentResponseDto), including embedded
  // enrollments[] (course/batch). instituteId is scoped from the JWT / X-Institute-Id
  // header, so a student outside the active institute resolves to a 403/404 the caller
  // handles. Response may be bare or nested ({ data: {...} }); unwrap defensively.
  async getStudentById(studentId) {
    try {
      const { data, error, success } = await get(`/students/${studentId}`);
      if (!success) return { data: null, error };
      const student = data?.data || data?.student || data;
      return { data: student, error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to load student' } };
    }
  },

  // Search students with optional course/batch filtering via the advanced-search
  // endpoint (POST /students/search/advanced). StudentCriteriaDto supports courseId
  // and batchId (integer ids), so filtering is a single server-side call — pass either,
  // both, or neither. instituteId is scoped from the JWT / X-Institute-Id header.
  async searchStudents({ courseId = null, batchId = null } = {}, pagination = { page: 0, size: 20 }) {
    try {
      const criteria = {};
      if (courseId) criteria.courseId = Number(courseId);
      if (batchId) criteria.batchId = Number(batchId);

      const payload = {
        criteria,
        pagination: {
          page: pagination.page || 0,
          size: pagination.size || 20,
        },
        sorting: { field: 'createdAt', direction: 'desc' },
      };

      const { data, error, success } = await post('/students/search/advanced', payload);

      if (success && data) {
        // Handle double-nested response: data.data.students or data.students
        const nestedData = data.data || data;
        const students = nestedData.students || nestedData.content || nestedData.users || (Array.isArray(nestedData) ? nestedData : []);
        // `totalCount` is the grand total of matching students (the standard field
        // for this endpoint, confirmed against live data). Fall back defensively to
        // the other common keys so a backend shape change can't zero out the count.
        const requestedSize = payload.pagination.size;
        const currentPage = nestedData.page !== undefined ? nestedData.page : nestedData.number !== undefined ? nestedData.number : pagination.page || 0;
        const totalElements = Number(
          nestedData.totalCount ?? nestedData.totalElements ?? nestedData.total ?? nestedData.size ?? students.length
        ) || 0;
        const totalPages = totalElements ? Math.ceil(totalElements / requestedSize) : 1;
        // More pages remain only until we've covered the grand total. Base this on the
        // REQUESTED page (always known) rather than the response's page field (flaky on
        // this endpoint), and guard with "a full page came back" so a missing/zero total
        // can't loop forever.
        const hasMore = students.length >= requestedSize && (payload.pagination.page + 1) * requestedSize < totalElements;

        return {
          data: students,
          pagination: {
            currentPage,
            totalPages,
            totalElements,
            hasMore,
            size: requestedSize,
          },
          error: null,
        };
      }

      return { data: [], pagination: { currentPage: 0, totalPages: 0, totalElements: 0, hasMore: false, size: 20 }, error };
    } catch (error) {
      return { data: [], pagination: { currentPage: 0, totalPages: 0, totalElements: 0, hasMore: false, size: 20 }, error };
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
        // `totalCount` is the grand total of teachers (the standard field, confirmed
        // against live data). Keep `size` in the fallback chain — the dashboards
        // historically read the total from it — so this can't regress those counts.
        const requestedSize = payload.pagination.size;
        const currentPage = nestedData.page !== undefined ? nestedData.page : nestedData.number !== undefined ? nestedData.number : pagination.page || 0;
        const totalElements = Number(
          nestedData.totalCount ?? nestedData.totalElements ?? nestedData.total ?? nestedData.size ?? teachers.length
        ) || 0;
        const totalPages = totalElements ? Math.ceil(totalElements / requestedSize) : 1;
        // Base hasMore on the requested page (always known), not the flaky response page.
        const hasMore = teachers.length >= requestedSize && (payload.pagination.page + 1) * requestedSize < totalElements;

        return {
          data: teachers,
          pagination: {
            currentPage,
            totalPages,
            totalElements,
            hasMore,
            size: requestedSize
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

  // Get institute admins - uses GET /users/INST_ADMIN.
  // For SUPER_ADMIN the apiClient injects X-Institute-Id, so the backend
  // scopes the list to the active institute; INST_ADMIN is scoped by JWT.
  async getInstituteAdmins() {
    try {
      const { data, error, success } = await get('/users/INST_ADMIN');

      if (success && data) {
        // Defensively normalize: the API wraps payloads as { message, success, data }
        // and may double-nest. Lists may arrive under several keys or as a bare array.
        const nestedData = data.data || data;
        const admins =
          nestedData.users ||
          nestedData.instituteAdmins ||
          nestedData.admins ||
          nestedData.content ||
          (Array.isArray(nestedData) ? nestedData : []);

        return { data: Array.isArray(admins) ? admins : [], error: null };
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

  // ---- Self-service profile (student/teacher edit their own profile) ----

  // Get the signed-in student's own profile
  async getMyStudentProfile() {
    try {
      const { data, error, success } = await get('/students/profile');
      if (success && data) {
        return { data: data.student || data.data || data, error: null };
      }
      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Update the signed-in student's own profile
  async updateMyStudentProfile(updates) {
    try {
      const { data, error, success } = await put('/students/profile', updates);
      if (success) {
        return { data: data?.student || data?.data || data || null, error: null };
      }
      return { data: null, error: error || { message: 'Failed to update profile' } };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to update profile' } };
    }
  },

  // Get the signed-in teacher's own profile
  async getMyTeacherProfile() {
    try {
      const { data, error, success } = await get('/teachers/profile');
      if (success && data) {
        return { data: data.teacher || data.data || data, error: null };
      }
      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Update the signed-in teacher's own profile
  async updateMyTeacherProfile(updates) {
    try {
      const { data, error, success } = await put('/teachers/profile', updates);
      if (success) {
        return { data: data?.teacher || data?.data || data || null, error: null };
      }
      return { data: null, error: error || { message: 'Failed to update profile' } };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to update profile' } };
    }
  },
};
