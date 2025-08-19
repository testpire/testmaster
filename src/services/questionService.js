import { supabase } from '../lib/supabase';

export const questionService = {
  // Get questions with filters
  async getQuestions(filters = {}) {
    try {
      let query = supabase?.from('questions')?.select(`
          *,
          chapter:chapters!chapter_id(name),
          topic:topics!topic_id(name),
          created_by_user:user_profiles!created_by(full_name),
          options:question_options(*)
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
      if (filters?.difficultyLevel) {
        query = query?.eq('difficulty_level', filters?.difficultyLevel);
      }
      if (filters?.examType) {
        query = query?.eq('exam_type', filters?.examType);
      }
      if (filters?.classLevel) {
        query = query?.eq('class_level', filters?.classLevel);
      }
      if (filters?.questionType) {
        query = query?.eq('question_type', filters?.questionType);
      }
      if (filters?.isConceptual !== undefined) {
        query = query?.eq('is_conceptual', filters?.isConceptual);
      }
      if (filters?.isTheoretical !== undefined) {
        query = query?.eq('is_theoretical', filters?.isTheoretical);
      }
      if (filters?.isPyq !== undefined) {
        query = query?.eq('is_pyq', filters?.isPyq);
      }
      if (filters?.isActive !== undefined) {
        query = query?.eq('is_active', filters?.isActive);
      }
      if (filters?.search) {
        query = query?.ilike('question_text', `%${filters?.search}%`);
      }
      if (filters?.limit) {
        query = query?.limit(filters?.limit);
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

  // Get question by ID
  async getQuestion(questionId) {
    try {
      const { data, error } = await supabase?.from('questions')?.select(`
          *,
          chapter:chapters!chapter_id(*),
          topic:topics!topic_id(*),
          created_by_user:user_profiles!created_by(*),
          options:question_options(*),
          reports:question_reports(*)
        `)?.eq('id', questionId)?.single();

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

  // Create new question
  async createQuestion(questionData) {
    try {
      // Create question
      const { data: question, error: questionError } = await supabase?.from('questions')?.insert([{
          question_text: questionData?.questionText,
          question_type: questionData?.questionType,
          subject: questionData?.subject,
          chapter_id: questionData?.chapterId,
          topic_id: questionData?.topicId,
          difficulty_level: questionData?.difficultyLevel,
          exam_type: questionData?.examType,
          class_level: questionData?.classLevel,
          is_conceptual: questionData?.isConceptual || false,
          is_theoretical: questionData?.isTheoretical || false,
          is_pyq: questionData?.isPyq || false,
          marks: questionData?.marks || 1,
          negative_marks: questionData?.negativeMarks || 0,
          explanation: questionData?.explanation,
          solution_image_url: questionData?.solutionImageUrl,
          created_by: questionData?.createdBy,
        }])?.select()?.single();

      if (questionError) {
        if (questionError?.message?.includes('Failed to fetch') || 
            questionError?.message?.includes('NetworkError') ||
            questionError?.name === 'TypeError' && questionError?.message?.includes('fetch')) {
          return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
        }
        throw questionError;
      }

      // Create options if MCQ
      if (questionData?.questionType === 'mcq' && questionData?.options?.length > 0) {
        const options = questionData?.options?.map((option, index) => ({
          question_id: question?.id,
          option_text: option?.text,
          option_label: option?.label,
          is_correct: option?.isCorrect,
        }));

        const { error: optionsError } = await supabase?.from('question_options')?.insert(options);

        if (optionsError) {
          if (optionsError?.message?.includes('Failed to fetch') || 
              optionsError?.message?.includes('NetworkError') ||
              optionsError?.name === 'TypeError' && optionsError?.message?.includes('fetch')) {
            return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
          }
          throw optionsError;
        }
      }

      return { data: question, error: null };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
      }
      return { data: null, error };
    }
  },

  // Update question
  async updateQuestion(questionId, updates) {
    try {
      const { data, error } = await supabase?.from('questions')?.update({
          ...updates,
          updated_at: new Date()?.toISOString(),
        })?.eq('id', questionId)?.select()?.single();

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

  // Delete question
  async deleteQuestion(questionId) {
    try {
      const { error } = await supabase?.from('questions')?.update({ is_active: false })?.eq('id', questionId);

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

  // Get chapters by subject
  async getChaptersBySubject(subject, classLevel = null) {
    try {
      let query = supabase?.from('chapters')?.select('*')?.eq('subject', subject)?.eq('is_active', true)?.order('chapter_number');

      if (classLevel) {
        query = query?.eq('class_level', classLevel);
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

  // Get topics by chapter
  async getTopicsByChapter(chapterId) {
    try {
      const { data, error } = await supabase?.from('topics')?.select('*')?.eq('chapter_id', chapterId)?.eq('is_active', true)?.order('topic_number');

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

  // Create question option
  async createQuestionOption(questionId, optionData) {
    try {
      const { data, error } = await supabase?.from('question_options')?.insert([{
          question_id: questionId,
          option_text: optionData?.text,
          option_label: optionData?.label,
          is_correct: optionData?.isCorrect,
        }])?.select()?.single();

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

  // Update question option
  async updateQuestionOption(optionId, updates) {
    try {
      const { data, error } = await supabase?.from('question_options')?.update(updates)?.eq('id', optionId)?.select()?.single();

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

  // Delete question option
  async deleteQuestionOption(optionId) {
    try {
      const { error } = await supabase?.from('question_options')?.delete()?.eq('id', optionId);

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

  // Report question
  async reportQuestion(questionId, reportData) {
    try {
      const { data, error } = await supabase?.from('question_reports')?.insert([{
          question_id: questionId,
          reported_by: reportData?.reportedBy,
          test_submission_id: reportData?.testSubmissionId,
          report_text: reportData?.reportText,
          report_type: reportData?.reportType || 'wrong_question',
        }])?.select()?.single();

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

  // Get question statistics
  async getQuestionStats() {
    try {
      // Use a simple count query instead of RPC function
      const { data: totalQuestions, error: totalError } = await supabase?.from('questions')?.select('*', { count: 'exact', head: true });

      if (totalError) {
        if (totalError?.message?.includes('Failed to fetch') || 
            totalError?.message?.includes('NetworkError') ||
            totalError?.name === 'TypeError' && totalError?.message?.includes('fetch')) {
          return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
        }
        throw totalError;
      }

      const { data: bySubject, error: subjectError } = await supabase?.from('questions')?.select('subject')?.eq('is_active', true);

      if (subjectError) {
        console.error('Warning: Could not load subject stats:', subjectError);
      }

      // Calculate stats
      const stats = {
        total: totalQuestions?.length || 0,
        bySubject: (bySubject || [])?.reduce((acc, q) => {
          acc[q.subject] = (acc?.[q?.subject] || 0) + 1;
          return acc;
        }, {}),
        lastUpdated: new Date()?.toISOString()
      };

      return { data: stats, error: null };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
      }
      return { data: null, error };
    }
  },

  // NEW: Get external question banks
  async getExternalQuestionBanks() {
    try {
      const { data, error } = await supabase?.from('external_question_banks')?.select('*')?.eq('is_active', true)?.order('name');

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

  // NEW: Create question bank import job
  async createQuestionBankImport(importData) {
    try {
      const { data, error } = await supabase?.from('question_bank_imports')?.insert([{
          external_bank_id: importData?.externalBankId,
          import_type: importData?.importType || 'bulk',
          import_filters: importData?.filters || {},
          imported_by: importData?.importedBy,
          status: 'pending'
        }])?.select()?.single();

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

  // NEW: Bulk import questions from CSV/JSON
  async bulkImportQuestions(questionsData, importSettings) {
    try {
      const { importedBy, validateOnly = false } = importSettings;
      
      // Validate question data structure
      const validatedQuestions = [];
      const errors = [];

      for (let i = 0; i < questionsData?.length; i++) {
        const q = questionsData?.[i];
        
        // Basic validation
        if (!q?.question_text || !q?.subject || !q?.question_type) {
          errors?.push(`Row ${i + 1}: Missing required fields (question_text, subject, question_type)`);
          continue;
        }

        // Prepare question for insert
        const questionData = {
          question_text: q?.question_text,
          question_type: q?.question_type || 'mcq',
          subject: q?.subject,
          difficulty_level: q?.difficulty_level || 'moderate',
          exam_type: q?.exam_type || 'custom',
          class_level: q?.class_level || 12,
          is_conceptual: q?.is_conceptual || false,
          is_theoretical: q?.is_theoretical || false,
          is_pyq: q?.is_pyq || false,
          marks: q?.marks || 4,
          negative_marks: q?.negative_marks || 1,
          explanation: q?.explanation || '',
          created_by: importedBy
        };

        validatedQuestions?.push({
          questionData,
          options: q?.options || [],
          correctAnswer: q?.correct_answer
        });
      }

      // If validation only, return results
      if (validateOnly) {
        return {
          data: {
            totalQuestions: questionsData?.length,
            validQuestions: validatedQuestions?.length,
            errors: errors,
            preview: validatedQuestions?.slice(0, 3)
          },
          error: null
        };
      }

      // Import validated questions
      const importedQuestions = [];
      const failedQuestions = [];

      for (const validatedQ of validatedQuestions) {
        try {
          const { data: question, error: questionError } = await supabase?.from('questions')?.insert([validatedQ?.questionData])?.select()?.single();

          if (questionError) throw questionError;

          // Add options for MCQ questions
          if (validatedQ?.questionData?.question_type === 'mcq' && validatedQ?.options?.length > 0) {
            const options = validatedQ?.options?.map((option, index) => ({
              question_id: question?.id,
              option_text: option?.text || option,
              option_label: String.fromCharCode(65 + index), // A, B, C, D
              is_correct: index === (validatedQ?.correctAnswer || 0)
            }));

            const { error: optionsError } = await supabase?.from('question_options')?.insert(options);

            if (optionsError) throw optionsError;
          }

          importedQuestions?.push(question);
        } catch (error) {
          failedQuestions?.push({
            question: validatedQ?.questionData?.question_text?.substring(0, 50),
            error: error?.message
          });
        }
      }

      return {
        data: {
          totalImported: importedQuestions?.length,
          totalFailed: failedQuestions?.length,
          importedQuestions,
          failedQuestions,
          errors
        },
        error: null
      };

    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
      }
      return { data: null, error };
    }
  },

  // NEW: Parse CSV file for bulk import
  async parseQuestionsFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          let questions = [];

          if (file.type === 'application/json' || file.name?.endsWith('.json')) {
            // Parse JSON file
            questions = JSON.parse(content);
          } else if (file.type === 'text/csv' || file.name?.endsWith('.csv')) {
            // Parse CSV file
            const lines = content.split('\n');
            const headers = lines[0]?.split(',')?.map(h => h.trim());
            
            for (let i = 1; i < lines?.length; i++) {
              const line = lines[i]?.trim();
              if (!line) continue;

              const values = line.split(',')?.map(v => v.trim());
              const question = {};

              headers?.forEach((header, index) => {
                let value = values[index]?.replace(/^"|"$/g, ''); // Remove quotes
                
                // Convert boolean strings
                if (value === 'true') value = true;
                else if (value === 'false') value = false;
                // Convert number strings
                else if (!isNaN(value) && value !== '') {
                  value = parseInt(value) || parseFloat(value);
                }

                question[header] = value;
              });

              // Parse options if they exist (assumed to be in options_a, options_b, etc. format)
              const options = [];
              ['a', 'b', 'c', 'd']?.forEach(letter => {
                const optionKey = `option_${letter}`;
                if (question[optionKey]) {
                  options.push(question[optionKey]);
                  delete question[optionKey];
                }
              });
              
              if (options?.length > 0) {
                question.options = options;
              }

              questions.push(question);
            }
          } else {
            throw new Error('Unsupported file format. Please use JSON or CSV files.');
          }

          resolve({ data: questions, error: null });
        } catch (error) {
          resolve({ data: null, error: { message: `Failed to parse file: ${error.message}` } });
        }
      };

      reader.onerror = () => {
        resolve({ data: null, error: { message: 'Failed to read file' } });
      };

      reader.readAsText(file);
    });
  },

  // NEW: Get import history
  async getImportHistory(limit = 10) {
    try {
      const { data, error } = await supabase?.from('question_bank_imports')?.select(`
          *,
          external_bank:external_question_banks!external_bank_id(name),
          imported_by_user:user_profiles!imported_by(full_name)
        `)?.order('created_at', { ascending: false })?.limit(limit);

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

  // Upload question image
  async uploadQuestionImage(file) {
    try {
      const fileExt = file?.name?.split('.')?.pop();
      const fileName = `${Date.now()}_${Math.random()?.toString(36)?.substring(7)}.${fileExt}`;
      const filePath = `questions/${fileName}`;

      const { data, error } = await supabase?.storage?.from('question-images')?.upload(filePath, file);

      if (error) {
        if (error?.message?.includes('Failed to fetch') || 
            error?.message?.includes('NetworkError') ||
            error?.name === 'TypeError' && error?.message?.includes('fetch')) {
          return { data: null, error: { message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' } };
        }
        throw error;
      }

      const { data: urlData } = supabase?.storage?.from('question-images')?.getPublicUrl(filePath);

      return { data: { url: urlData?.publicUrl }, error: null };
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