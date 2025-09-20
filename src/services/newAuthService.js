import { post, get, postUnauthenticated, setAuthToken } from '../lib/apiClient';

export const newAuthService = {
  // User login
  async login(username, password) {
    try {
      const { data, error, success } = await postUnauthenticated('/auth/login', {
        username,
        password,
      });

      if (success && data) {
        // Assuming the API returns a token in the response
        const token = data.token || data.accessToken || data.access_token;
        if (token) {
          setAuthToken(token);
        }
        
        return { data, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // User registration - Student self-registration
  async registerStudent(userData) {
    try {
      const registerData = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        firstName: userData.name?.split(' ')[0] || userData.name || '',
        lastName: userData.name?.split(' ').slice(1).join(' ') || '',
        role: userData.role || 'STUDENT',
        phoneNumber: userData.phone_number,
        instituteId: userData.instituteId || '1', // Default institute ID if not provided
      };

      const { data, error, success } = await postUnauthenticated('/auth/register/student', registerData);
      
      if (success && data) {
        return { data, error: null };
      }
      
      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get user profile
  async getProfile() {
    try {
      console.log('🔄 Requesting user profile...');
      const { data, error, success } = await get('/auth/profile');
      
      if (success && data) {
        console.log('✅ Profile retrieved successfully');
        return { data, error: null };
      }
      
      console.log('❌ Profile request failed:', error);
      return { data: null, error };
    } catch (error) {
      console.error('❌ Profile request exception:', error);
      // Don't let profile errors crash the app
      return { data: null, error: error.message || 'Profile request failed' };
    }
  },

  // Logout
  async logout() {
    try {
      const token = localStorage.getItem('authToken');
      const { error, success } = await post('/auth/logout', null, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Clear token regardless of API response
      setAuthToken(null);
      
      if (success) {
        return { error: null };
      }
      
      return { error };
    } catch (error) {
      // Clear token even if logout API fails
      setAuthToken(null);
      return { error };
    }
  },

  // Get current session (compatibility method)
  async getSession() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        return { data: { session: null }, error: null };
      }

      const { data, error } = await this.getProfile();
      
      if (data && !error) {
        // The API returns { user: { ... } }, so we need data.user
        const userProfile = data.user || data;
        return { 
          data: { 
            session: { 
              user: userProfile,
              access_token: token,
            } 
          }, 
          error: null 
        };
      }
      
      return { data: { session: null }, error };
    } catch (error) {
      return { data: { session: null }, error };
    }
  },

  // Get current user (compatibility method)
  async getCurrentUser() {
    return this.getProfile();
  },

  // Get user profile by ID (compatibility method - using current profile)
  async getUserProfile(userId) {
    return this.getProfile();
  },

  // Update user profile (compatibility method - placeholder)
  async updateUserProfile(userId, updates) {
    // This will need to be implemented based on available endpoints
    // For now, return the current profile
    return this.getProfile();
  },

  // Reset password (placeholder - needs implementation based on available endpoints)
  async resetPassword(email) {
    // This needs to be implemented when password reset endpoint is available
    return { error: { message: 'Password reset not yet implemented' } };
  },

  // Update password (placeholder - needs implementation based on available endpoints)
  async updatePassword(newPassword) {
    // This needs to be implemented when update password endpoint is available
    return { error: { message: 'Password update not yet implemented' } };
  },

  // Update profile metadata (placeholder)
  async updateProfile(updates) {
    // This needs to be implemented when profile update endpoint is available
    return { error: { message: 'Profile update not yet implemented' } };
  },

  // Compatibility methods for existing code
  async signInWithPassword(email, password) {
    return this.login(email, password);
  },

  async signIn(email, password) {
    return this.login(email, password);
  },

  async signUp(email, password, userData = {}) {
    return this.registerStudent({
      username: userData.username || email,
      email,
      password,
      firstName: userData.fullName?.split(' ')[0] || userData.firstName || '',
      lastName: userData.fullName?.split(' ').slice(1).join(' ') || userData.lastName || '',
      instituteId: userData.instituteId || '1', // Default institute ID
      ...userData,
    });
  },

  async signOut() {
    return this.logout();
  },
};
