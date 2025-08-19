import { supabase } from '../lib/supabase';

export const studyMaterialService = {
  // Get study materials with filters
  async getStudyMaterials(filters = {}) {
    try {
      let query = supabase?.from('study_materials')?.select(`
          *,
          chapter:chapters!chapter_id(name),
          topic:topics!topic_id(name),
          uploaded_by_user:user_profiles!uploaded_by(full_name)
        `)?.order('created_at', { ascending: false });

      // Apply filters
      if (filters?.subject) {
        query = query?.eq('subject', filters?.subject);
      }
      if (filters?.chapterId) {
        query = query?.eq('chapter_id', filters?.chapterId);
      }
      if (filters?.topicId) {
        query = query?.eq('topic_id', filters?.topicId);
      }
      if (filters?.materialType) {
        query = query?.eq('material_type', filters?.materialType);
      }
      if (filters?.classLevel) {
        query = query?.eq('class_level', filters?.classLevel);
      }
      if (filters?.isPublic !== undefined) {
        query = query?.eq('is_public', filters?.isPublic);
      }
      if (filters?.search) {
        query = query?.or(`title.ilike.%${filters?.search}%,description.ilike.%${filters?.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get study material by ID
  async getStudyMaterial(materialId) {
    try {
      const { data, error } = await supabase?.from('study_materials')?.select(`
          *,
          chapter:chapters!chapter_id(*),
          topic:topics!topic_id(*),
          uploaded_by_user:user_profiles!uploaded_by(*)
        `)?.eq('id', materialId)?.single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Create new study material
  async createStudyMaterial(materialData) {
    try {
      const { data, error } = await supabase?.from('study_materials')?.insert([{
          title: materialData?.title,
          description: materialData?.description,
          subject: materialData?.subject,
          chapter_id: materialData?.chapterId,
          topic_id: materialData?.topicId,
          material_type: materialData?.materialType,
          file_url: materialData?.fileUrl,
          youtube_url: materialData?.youtubeUrl,
          content: materialData?.content,
          class_level: materialData?.classLevel,
          uploaded_by: materialData?.uploadedBy,
          is_public: materialData?.isPublic !== undefined ? materialData?.isPublic : true,
        }])?.select()?.single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Update study material
  async updateStudyMaterial(materialId, updates) {
    try {
      const { data, error } = await supabase?.from('study_materials')?.update({
          ...updates,
          updated_at: new Date()?.toISOString(),
        })?.eq('id', materialId)?.select()?.single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Delete study material
  async deleteStudyMaterial(materialId) {
    try {
      const { error } = await supabase?.from('study_materials')?.delete()?.eq('id', materialId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // Upload study material file
  async uploadStudyFile(file, materialType = 'document') {
    try {
      const fileExt = file?.name?.split('.')?.pop();
      const fileName = `${Date.now()}_${Math.random()?.toString(36)?.substring(7)}.${fileExt}`;
      const filePath = `${materialType}/${fileName}`;

      const { data, error } = await supabase?.storage?.from('study-materials')?.upload(filePath, file);

      if (error) throw error;

      // Get signed URL for private bucket
      const { data: urlData, error: urlError } = await supabase?.storage?.from('study-materials')?.createSignedUrl(filePath, 3600 * 24 * 365); // 1 year expiry

      if (urlError) throw urlError;

      return { data: { url: urlData?.signedUrl, path: filePath }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get study materials by subject for student
  async getStudyMaterialsBySubject(subject, classLevel = null) {
    try {
      let query = supabase?.from('study_materials')?.select(`
          *,
          chapter:chapters!chapter_id(name),
          topic:topics!topic_id(name)
        `)?.eq('subject', subject)?.eq('is_public', true)?.order('created_at', { ascending: false });

      if (classLevel) {
        query = query?.eq('class_level', classLevel);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get study materials by chapter
  async getStudyMaterialsByChapter(chapterId) {
    try {
      const { data, error } = await supabase?.from('study_materials')?.select(`
          *,
          topic:topics!topic_id(name),
          uploaded_by_user:user_profiles!uploaded_by(full_name)
        `)?.eq('chapter_id', chapterId)?.eq('is_public', true)?.order('material_type', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get study materials by topic
  async getStudyMaterialsByTopic(topicId) {
    try {
      const { data, error } = await supabase?.from('study_materials')?.select(`
          *,
          chapter:chapters!chapter_id(name),
          uploaded_by_user:user_profiles!uploaded_by(full_name)
        `)?.eq('topic_id', topicId)?.eq('is_public', true)?.order('material_type', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get material types
  getMaterialTypes() {
    return [
      { value: 'notes', label: 'Notes' },
      { value: 'formula', label: 'Formula Sheet' },
      { value: 'video', label: 'Video Tutorial' },
      { value: 'document', label: 'Document' },
      { value: 'practice', label: 'Practice Questions' },
      { value: 'reference', label: 'Reference Material' },
    ];
  },

  // Search study materials
  async searchStudyMaterials(searchTerm, filters = {}) {
    try {
      let query = supabase?.from('study_materials')?.select(`
          *,
          chapter:chapters!chapter_id(name),
          topic:topics!topic_id(name),
          uploaded_by_user:user_profiles!uploaded_by(full_name)
        `)?.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)?.eq('is_public', true)?.order('created_at', { ascending: false });

      if (filters?.subject) {
        query = query?.eq('subject', filters?.subject);
      }
      if (filters?.materialType) {
        query = query?.eq('material_type', filters?.materialType);
      }
      if (filters?.classLevel) {
        query = query?.eq('class_level', filters?.classLevel);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};