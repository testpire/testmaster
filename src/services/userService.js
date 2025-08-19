import { supabase } from '../lib/supabase';

export const userService = {
  // Get user profile by ID
  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase?.from('user_profiles')?.select('*')?.eq('id', userId)?.single();

      if (error) {
        if (error?.message?.includes('Failed to fetch') || 
            error?.message?.includes('NetworkError') ||
            error?.name === 'TypeError' && error?.message?.includes('fetch')) {
          return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
        }
        throw error;
      }
      return { data, error: null };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
      }
      return { data: null, error };
    }
  },

  // Get all users with filters
  async getUsers(filters = {}) {
    try {
      let query = supabase?.from('user_profiles')?.select('*');

      // Apply filters
      if (filters?.role) {
        query = query?.eq('role', filters?.role);
      }
      if (filters?.isActive !== undefined) {
        query = query?.eq('is_active', filters?.isActive);
      }
      if (filters?.search) {
        query = query?.or(`full_name.ilike.%${filters?.search}%,email.ilike.%${filters?.search}%`);
      }
      if (filters?.limit) {
        query = query?.limit(filters?.limit);
      }

      // Always order by created_at for consistent results
      query = query?.order('created_at', { ascending: false });

      const { data, error } = await query;
      
      if (error) {
        if (error?.message?.includes('Failed to fetch') || 
            error?.message?.includes('NetworkError') ||
            error?.name === 'TypeError' && error?.message?.includes('fetch')) {
          return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
        }
        throw error;
      }
      return { data, error: null };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
      }
      return { data: null, error };
    }
  },

  // Update user profile
  async updateUserProfile(userId, updates) {
    try {
      const { data, error } = await supabase?.from('user_profiles')?.update({
          ...updates,
          updated_at: new Date()?.toISOString(),
        })?.eq('id', userId)?.select()?.single();

      if (error) {
        if (error?.message?.includes('Failed to fetch') || 
            error?.message?.includes('NetworkError') ||
            error?.name === 'TypeError' && error?.message?.includes('fetch')) {
          return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
        }
        throw error;
      }
      return { data, error: null };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
      }
      return { data: null, error };
    }
  },

  // Create user profile (admin only)
  async createUserProfile(userData) {
    try {
      // First create auth user
      const { data: authData, error: authError } = await supabase?.auth?.signUp({
        email: userData?.email,
        password: userData?.password,
        options: {
          data: {
            full_name: userData?.fullName,
            role: userData?.role,
            phone_number: userData?.phoneNumber,
            parent_phone: userData?.parentPhone
          },
        },
      });

      if (authError) {
        if (authError?.message?.includes('Failed to fetch') || 
            authError?.message?.includes('NetworkError') ||
            authError?.name === 'TypeError' && authError?.message?.includes('fetch')) {
          return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
        }
        throw authError;
      }
      return { data: authData, error: null };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
      }
      return { data: null, error };
    }
  },

  // Delete user (admin only)
  async deleteUser(userId) {
    try {
      const { error } = await supabase?.from('user_profiles')?.update({ is_active: false })?.eq('id', userId);

      if (error) {
        if (error?.message?.includes('Failed to fetch') || 
            error?.message?.includes('NetworkError') ||
            error?.name === 'TypeError' && error?.message?.includes('fetch')) {
          return { error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
        }
        throw error;
      }
      return { error: null };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return { error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
      }
      return { error };
    }
  },

  // Get students by batch
  async getStudentsByBatch(batchId) {
    try {
      const { data, error } = await supabase?.from('student_batches')?.select(`
          *,
          student:user_profiles!student_id(*),
          batch:batches!batch_id(*)
        `)?.eq('batch_id', batchId);

      if (error) {
        if (error?.message?.includes('Failed to fetch') || 
            error?.message?.includes('NetworkError') ||
            error?.name === 'TypeError' && error?.message?.includes('fetch')) {
          return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
        }
        throw error;
      }
      return { data, error: null };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
      }
      return { data: null, error };
    }
  },

  // Get teachers
  async getTeachers() {
    try {
      const { data, error } = await supabase?.from('user_profiles')?.select('*')?.eq('role', 'teacher')?.eq('is_active', true)?.order('full_name');

      if (error) {
        if (error?.message?.includes('Failed to fetch') || 
            error?.message?.includes('NetworkError') ||
            error?.name === 'TypeError' && error?.message?.includes('fetch')) {
          return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
        }
        throw error;
      }
      return { data, error: null };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
      }
      return { data: null, error };
    }
  },

  // Upload profile photo
  async uploadProfilePhoto(userId, file) {
    try {
      const fileExt = file?.name?.split('.')?.pop();
      const fileName = `${userId}/profile.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase?.storage?.from('profile-photos')?.upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        if (uploadError?.message?.includes('Failed to fetch') || 
            uploadError?.message?.includes('NetworkError') ||
            uploadError?.name === 'TypeError' && uploadError?.message?.includes('fetch')) {
          return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
        }
        throw uploadError;
      }

      const { data: urlData } = supabase?.storage?.from('profile-photos')?.getPublicUrl(fileName);

      // Update user profile with photo URL
      const { data, error } = await supabase?.from('user_profiles')?.update({ photo_url: urlData?.publicUrl })?.eq('id', userId)?.select()?.single();

      if (error) {
        if (error?.message?.includes('Failed to fetch') || 
            error?.message?.includes('NetworkError') ||
            error?.name === 'TypeError' && error?.message?.includes('fetch')) {
          return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
        }
        throw error;
      }
      return { data, error: null };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
      }
      return { data: null, error };
    }
  },
};