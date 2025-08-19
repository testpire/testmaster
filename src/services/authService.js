import { supabase } from '../lib/supabase';

export const authService = {
  // Sign in with email and password (renamed to match AuthContext expectations)
  async signInWithPassword(email, password) {
    try {
      const { data, error } = await supabase?.auth?.signInWithPassword({
        email: email?.toLowerCase()?.trim(),
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Keep original signIn method for backward compatibility
  async signIn(email, password) {
    return this.signInWithPassword(email, password);
  },

  // Sign up new user
  async signUp(email, password, userData = {}) {
    try {
      const { data, error } = await supabase?.auth?.signUp({
        email: email?.toLowerCase()?.trim(),
        password,
        options: {
          data: {
            full_name: userData?.fullName || '',
            role: userData?.role || 'student',
            phone_number: userData?.phoneNumber || '',
            parent_phone: userData?.parentPhone || '',
          },
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Sign out
  async signOut() {
    try {
      const { error } = await supabase?.auth?.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // Get current session
  async getSession() {
    try {
      const { data, error } = await supabase?.auth?.getSession();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get current user
  async getCurrentUser() {
    try {
      const { data, error } = await supabase?.auth?.getUser();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get user profile (missing method that AuthContext expects)
  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.select('*')
        ?.eq('id', userId)
        ?.single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Update user profile (missing method that AuthContext expects)
  async updateUserProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.update(updates)
        ?.eq('id', userId)
        ?.select()
        ?.single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Reset password
  async resetPassword(email) {
    try {
      const { error } = await supabase?.auth?.resetPasswordForEmail(email?.toLowerCase()?.trim());
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // Update password
  async updatePassword(newPassword) {
    try {
      const { data, error } = await supabase?.auth?.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Update user profile (auth metadata)
  async updateProfile(updates) {
    try {
      const { data, error } = await supabase?.auth?.updateUser({
        data: updates,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};