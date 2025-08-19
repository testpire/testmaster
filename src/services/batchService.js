import { supabase } from '../lib/supabase';

export const batchService = {
  // Get all batches
  async getBatches(filters = {}) {
    try {
      let query = supabase?.from('batches')?.select(`
          *,
          course:courses!course_id(*),
          teacher:user_profiles!teacher_id(id, full_name, email),
          created_by_user:user_profiles!created_by(full_name)
        `)?.order('created_at', { ascending: false });

      // Apply filters
      if (filters?.courseId) {
        query = query?.eq('course_id', filters?.courseId);
      }
      if (filters?.teacherId) {
        query = query?.eq('teacher_id', filters?.teacherId);
      }
      if (filters?.isActive !== undefined) {
        query = query?.eq('is_active', filters?.isActive);
      }
      if (filters?.search) {
        query = query?.ilike('name', `%${filters?.search}%`);
      }

      const { data, error } = await query;
      if (error) {
        if (error?.message?.includes('Failed to fetch') || 
            error?.message?.includes('NetworkError') ||
            error?.name === 'TypeError' && error?.message?.includes('fetch')) {
          return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
        }
        throw error;
      }

      // Add student count for each batch
      const enrichedData = await Promise.all(
        (data || [])?.map(async (batch) => {
          try {
            const { count: studentCount } = await supabase?.from('student_batches')?.select('*', { count: 'exact', head: true })?.eq('batch_id', batch?.id);
            
            return {
              ...batch,
              student_count: studentCount || 0
            };
          } catch (error) {
            console.error('Error getting student count for batch:', error);
            return {
              ...batch,
              student_count: 0
            };
          }
        })
      );

      return { data: enrichedData, error: null };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
      }
      return { data: null, error };
    }
  },

  // Get batch by ID
  async getBatch(batchId) {
    try {
      const { data, error } = await supabase?.from('batches')?.select(`
          *,
          course:courses!course_id(*),
          teacher:user_profiles!teacher_id(*),
          students:student_batches(
            id, enrolled_at,
            student:user_profiles!student_id(*)
          )
        `)?.eq('id', batchId)?.single();

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

  // Create new batch
  async createBatch(batchData) {
    try {
      const { data, error } = await supabase?.from('batches')?.insert([{
          name: batchData?.name,
          course_id: batchData?.courseId,
          teacher_id: batchData?.teacherId,
          start_date: batchData?.startDate,
          end_date: batchData?.endDate,
          max_students: batchData?.maxStudents,
          created_by: batchData?.createdBy,
        }])?.select(`
          *,
          course:courses!course_id(*),
          teacher:user_profiles!teacher_id(*)
        `)?.single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Update batch
  async updateBatch(batchId, updates) {
    try {
      const { data, error } = await supabase?.from('batches')?.update({
          ...updates,
          updated_at: new Date()?.toISOString(),
        })?.eq('id', batchId)?.select(`
          *,
          course:courses!course_id(*),
          teacher:user_profiles!teacher_id(*)
        `)?.single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Delete batch
  async deleteBatch(batchId) {
    try {
      const { error } = await supabase?.from('batches')?.update({ is_active: false })?.eq('id', batchId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // Add student to batch
  async addStudentToBatch(studentId, batchId) {
    try {
      const { data, error } = await supabase?.from('student_batches')?.insert([{
          student_id: studentId,
          batch_id: batchId,
        }])?.select(`
          *,
          student:user_profiles!student_id(*),
          batch:batches!batch_id(*)
        `)?.single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Remove student from batch
  async removeStudentFromBatch(studentId, batchId) {
    try {
      const { error } = await supabase?.from('student_batches')?.delete()?.eq('student_id', studentId)?.eq('batch_id', batchId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // Move student between batches
  async moveStudentToBatch(studentId, fromBatchId, toBatchId) {
    try {
      // Start transaction-like operation
      const { error: removeError } = await supabase?.from('student_batches')?.delete()?.eq('student_id', studentId)?.eq('batch_id', fromBatchId);

      if (removeError) throw removeError;

      const { data, error: addError } = await supabase?.from('student_batches')?.insert([{
          student_id: studentId,
          batch_id: toBatchId,
        }])?.select(`
          *,
          student:user_profiles!student_id(*),
          batch:batches!batch_id(*)
        `)?.single();

      if (addError) throw addError;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get batches for a teacher
  async getBatchesForTeacher(teacherId) {
    try {
      const { data, error } = await supabase?.from('batches')?.select(`
          *,
          course:courses!course_id(*)
        `)?.eq('teacher_id', teacherId)?.eq('is_active', true)?.order('name');

      if (error) {
        if (error?.message?.includes('Failed to fetch') || 
            error?.message?.includes('NetworkError') ||
            error?.name === 'TypeError' && error?.message?.includes('fetch')) {
          return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
        }
        throw error;
      }

      // Add student count for each batch
      const enrichedData = await Promise.all(
        (data || [])?.map(async (batch) => {
          try {
            const { count: studentCount } = await supabase?.from('student_batches')?.select('*', { count: 'exact', head: true })?.eq('batch_id', batch?.id);
            
            return {
              ...batch,
              student_count: studentCount || 0
            };
          } catch (error) {
            console.error('Error getting student count for batch:', error);
            return {
              ...batch,
              student_count: 0
            };
          }
        })
      );

      return { data: enrichedData, error: null };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
      }
      return { data: null, error };
    }
  },

  // Get batches for a student
  async getBatchesForStudent(studentId) {
    try {
      const { data, error } = await supabase?.from('student_batches')?.select(`
          *,
          batch:batches!batch_id(
            *,
            course:courses!course_id(*),
            teacher:user_profiles!teacher_id(full_name)
          )
        `)?.eq('student_id', studentId);

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