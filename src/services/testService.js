import { supabase } from '../lib/supabase';

export const testService = {
  // Get all tests
  async getTests(filters = {}) {
    try {
      let query = supabase?.from('tests')?.select(`
          *,
          created_by_user:user_profiles!created_by(full_name),
          question_count:test_questions(count),
          assignment_count:test_assignments(count)
        `)?.order('created_at', { ascending: false });

      // Apply filters
      if (filters?.createdBy) {
        query = query?.eq('created_by', filters?.createdBy);
      }
      if (filters?.status) {
        query = query?.eq('status', filters?.status);
      }
      if (filters?.examType) {
        query = query?.eq('exam_type', filters?.examType);
      }
      if (filters?.subjects?.length > 0) {
        query = query?.contains('subjects', filters?.subjects);
      }
      if (filters?.search) {
        query = query?.ilike('title', `%${filters?.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get test by ID
  async getTest(testId) {
    try {
      const { data, error } = await supabase?.from('tests')?.select(`
          *,
          created_by_user:user_profiles!created_by(*),
          test_questions:test_questions(
            id, question_number, marks,
            question:questions!question_id(*)
          ),
          assignments:test_assignments(
            id, assigned_at, due_date,
            batch:batches!batch_id(*),
            assigned_by_user:user_profiles!assigned_by(full_name)
          )
        `)?.eq('id', testId)?.single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Create new test
  async createTest(testData) {
    try {
      const { data, error } = await supabase?.from('tests')?.insert([{
          title: testData?.title,
          description: testData?.description,
          exam_type: testData?.examType,
          subjects: testData?.subjects,
          duration_minutes: testData?.durationMinutes,
          negative_marking: testData?.negativeMarking,
          instructions: testData?.instructions,
          is_randomized: testData?.isRandomized,
          created_by: testData?.createdBy,
        }])?.select()?.single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Update test
  async updateTest(testId, updates) {
    try {
      const { data, error } = await supabase?.from('tests')?.update({
          ...updates,
          updated_at: new Date()?.toISOString(),
        })?.eq('id', testId)?.select()?.single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Delete test
  async deleteTest(testId) {
    try {
      const { error } = await supabase?.from('tests')?.delete()?.eq('id', testId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // Add questions to test
  async addQuestionsToTest(testId, questionIds) {
    try {
      // Get current max question number
      const { data: existingQuestions } = await supabase?.from('test_questions')?.select('question_number')?.eq('test_id', testId)?.order('question_number', { ascending: false })?.limit(1);

      let nextQuestionNumber = (existingQuestions?.[0]?.question_number || 0) + 1;

      const testQuestions = questionIds?.map((questionId, index) => ({
        test_id: testId,
        question_id: questionId,
        question_number: nextQuestionNumber + index,
        marks: 4, // Default marks, can be customized
      }));

      const { data, error } = await supabase?.from('test_questions')?.insert(testQuestions)?.select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Remove question from test
  async removeQuestionFromTest(testId, questionId) {
    try {
      const { error } = await supabase?.from('test_questions')?.delete()?.eq('test_id', testId)?.eq('question_id', questionId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // Assign test to batches
  async assignTestToBatches(testId, batchIds, assignedBy, dueDate = null) {
    try {
      const assignments = batchIds?.map(batchId => ({
        test_id: testId,
        batch_id: batchId,
        assigned_by: assignedBy,
        due_date: dueDate,
      }));

      const { data, error } = await supabase?.from('test_assignments')?.insert(assignments)?.select(`
          *,
          batch:batches!batch_id(*),
          assigned_by_user:user_profiles!assigned_by(full_name)
        `);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get assigned tests for student
  async getAssignedTests(studentId) {
    try {
      const { data, error } = await supabase?.from('test_assignments')?.select(`
          *,
          test:tests!test_id(*),
          batch:batches!batch_id(*),
          submission:test_submissions(
            id, status, submitted_at, total_marks_obtained, percentage, rank_in_batch
          )
        `)?.eq('batch_id', 'IN', `(
          SELECT batch_id FROM student_batches WHERE student_id = '${studentId}'
        )`)?.order('assigned_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Start test attempt
  async startTestAttempt(testId, studentId) {
    try {
      const { data, error } = await supabase?.from('test_submissions')?.insert([{
          test_id: testId,
          student_id: studentId,
          status: 'in_progress',
          started_at: new Date()?.toISOString(),
        }])?.select()?.single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Submit test
  async submitTest(submissionId, answers) {
    try {
      // Insert all answers
      const answerInserts = answers?.map(answer => ({
        submission_id: submissionId,
        question_id: answer?.questionId,
        selected_option_id: answer?.selectedOptionId,
        integer_answer: answer?.integerAnswer,
        text_answer: answer?.textAnswer,
        time_spent_seconds: answer?.timeSpent,
        answered_at: new Date()?.toISOString(),
      }));

      const { error: answersError } = await supabase?.from('student_answers')?.insert(answerInserts);

      if (answersError) throw answersError;

      // Update submission status
      const { data, error } = await supabase?.from('test_submissions')?.update({
          status: 'submitted',
          submitted_at: new Date()?.toISOString(),
        })?.eq('id', submissionId)?.select()?.single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get test results
  async getTestResults(testId, filters = {}) {
    try {
      let query = supabase?.from('test_submissions')?.select(`
          *,
          student:user_profiles!student_id(*),
          test:tests!test_id(title, total_marks),
          answers:student_answers(count)
        `)?.eq('test_id', testId)?.order('percentage', { ascending: false });

      if (filters?.status) {
        query = query?.eq('status', filters?.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Publish test
  async publishTest(testId) {
    try {
      const { data, error } = await supabase?.from('tests')?.update({
          status: 'published',
          updated_at: new Date()?.toISOString(),
        })?.eq('id', testId)?.select()?.single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};