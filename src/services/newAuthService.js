import { post, get, postUnauthenticated, setAuthToken } from '../lib/apiClient';

export const newAuthService = {
  // User login
  async login(username, password) {
    try {
      const { data, error, success } = await postUnauthenticated('/auth/login', {
        username,
        password,
      });

      // Network / non-2xx failure
      if (!success || !data) {
        return { data: null, error: error || { message: 'Login failed' } };
      }

      const token = data.token || data.accessToken || data.access_token;

      // Happy path: a token was issued
      if (token) {
        setAuthToken(token);
        return { data, error: null };
      }

      // Cognito challenge (e.g. NEW_PASSWORD_REQUIRED on first login):
      // no token yet, but a challengeName + session are returned.
      if (data.challengeName) {
        return {
          data,
          challenge: {
            name: data.challengeName,
            session: data.session,
            username,
          },
          error: null,
        };
      }

      // Backend returns HTTP 200 with accessToken=null and a message on
      // bad credentials — surface that message as an error.
      return {
        data: null,
        error: { message: data.message || 'Invalid username or password' },
      };
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

  // Step 1 of password reset: request a confirmation code (Cognito emails it)
  async forgotPassword(username) {
    try {
      const { data, error, success } = await postUnauthenticated('/auth/forgot-password', {
        username,
      });

      if (success) {
        return { data: data || { message: 'Confirmation code sent' }, error: null };
      }
      return { data: null, error: error || { message: 'Failed to send reset code' } };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Step 2 of password reset: confirm the code and set a new password
  async confirmForgotPassword(username, confirmationCode, newPassword) {
    try {
      const { data, error, success } = await postUnauthenticated('/auth/confirm-forgot-password', {
        username,
        confirmationCode,
        newPassword,
      });

      if (success) {
        return { data: data || { message: 'Password reset successful' }, error: null };
      }
      return { data: null, error: error || { message: 'Failed to reset password' } };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Respond to the NEW_PASSWORD_REQUIRED challenge on first login
  async setPassword(username, session, newPassword) {
    try {
      const { data, error, success } = await postUnauthenticated('/auth/set-password', {
        username,
        session,
        newPassword,
      });

      if (success && data) {
        const token = data.token || data.accessToken || data.access_token;
        if (token) {
          setAuthToken(token);
        }
        return { data, error: null };
      }
      return { data: null, error: error || { message: 'Failed to set password' } };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Reset password (compatibility alias)
  async resetPassword(username) {
    return this.forgotPassword(username);
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
