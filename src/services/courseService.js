import { supabase } from '../lib/supabase';

export const courseService = {
  // Get all courses
  async getCourses(filters = {}) {
    try {
      let query = supabase?.from('courses')?.select(`
          *,
          created_by_user:user_profiles!created_by(full_name),
          batches:batches(count)
        `)?.order('created_at', { ascending: false });

      // Apply filters
      if (filters?.examType) {
        query = query?.eq('exam_type', filters?.examType);
      }
      if (filters?.isActive !== undefined) {
        query = query?.eq('is_active', filters?.isActive);
      }
      if (filters?.search) {
        query = query?.ilike('name', `%${filters?.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get course by ID
  async getCourse(courseId) {
    try {
      const { data, error } = await supabase?.from('courses')?.select(`
          *,
          created_by_user:user_profiles!created_by(full_name),
          batches:batches(
            id, name, start_date, end_date, max_students,
            teacher:user_profiles!teacher_id(full_name),
            student_count:student_batches(count)
          )
        `)?.eq('id', courseId)?.single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Create new course
  async createCourse(courseData) {
    try {
      const { data, error } = await supabase?.from('courses')?.insert([{
          name: courseData?.name,
          description: courseData?.description,
          exam_type: courseData?.examType,
          subjects: courseData?.subjects,
          duration_months: courseData?.durationMonths,
          created_by: courseData?.createdBy,
        }])?.select()?.single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Update course
  async updateCourse(courseId, updates) {
    try {
      const { data, error } = await supabase?.from('courses')?.update({
          ...updates,
          updated_at: new Date()?.toISOString(),
        })?.eq('id', courseId)?.select()?.single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Delete course
  async deleteCourse(courseId) {
    try {
      const { error } = await supabase?.from('courses')?.update({ is_active: false })?.eq('id', courseId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // Get subjects for a course
  getSubjectsForExam(examType) {
    const subjectMap = {
      jee: ['physics', 'chemistry', 'mathematics'],
      neet: ['physics', 'chemistry', 'biology'],
      cbse: ['physics', 'chemistry', 'mathematics', 'biology'],
      upsc: ['physics', 'chemistry', 'mathematics', 'biology'],
      ssc: ['physics', 'chemistry', 'mathematics', 'biology'],
      custom: ['physics', 'chemistry', 'mathematics', 'biology'],
    };

    return subjectMap?.[examType] || [];
  },
};