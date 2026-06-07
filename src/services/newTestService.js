import { get, post, put, del } from '../lib/apiClient';

// Test service — backs the full test lifecycle against the TestPire REST API:
//   • Staff (Test Management + Test Assignment): create/curate/publish tests, assign
//     them to a course / batch / student, and read results.
//   • Student (Test Taking): list available tests, start/resume an attempt, save
//     answers, and submit.
//
// Every method returns the standard `{ data, error }` envelope and never throws,
// matching the other new* services (see newBatchService.js). The backend wraps
// responses as `{ message, success, data }`; we unwrap `data` defensively because
// some payloads nest further (`data.tests`, `data.content`, bare array, …).
//
// Assignment uses *dynamic resolution* server-side: assigning a test to a COURSE
// reaches every batch and student in it, and to a BATCH every student in it — there
// is no client-side fan-out. Students see the union via GET /student/tests/available.

// Pull a list out of whatever shape the API returns.
const unwrapList = (data, key) => {
  const body = data?.data ?? data ?? {};
  if (Array.isArray(body)) return body;
  return body[key] || body.content || body.items || body.data || [];
};

// Pull a single object out of the response envelope.
const unwrapOne = (data) => data?.data ?? data ?? null;

export const newTestService = {
  // ---------------------------------------------------------------------------
  // Staff — Test Management
  // ---------------------------------------------------------------------------

  // List all tests for the active institute (JWT / X-Institute-Id scoped).
  async listTests() {
    try {
      const { data, error, success } = await get('/tests');
      if (!success) return { data: [], error };
      return { data: unwrapList(data, 'tests'), error: null };
    } catch (error) {
      return { data: [], error: { message: error?.message || 'Failed to load tests' } };
    }
  },

  async getTest(testId) {
    try {
      const { data, error, success } = await get(`/tests/${testId}`);
      if (!success) return { data: null, error };
      return { data: unwrapOne(data), error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to load test' } };
    }
  },

  // Create a test. CreateTestRequestDto: title (required), description,
  // durationMinutes, maxAttempts, passingMarks, negativeMarking, shuffleQuestions,
  // showAnswers, availableFrom, availableUntil, instituteId (super-admin override;
  // otherwise scoped from the JWT). totalMarks is computed server-side from questions.
  async createTest(body) {
    try {
      const { data, error, success } = await post('/tests', body);
      if (!success) return { data: null, error };
      return { data: unwrapOne(data), error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to create test' } };
    }
  },

  // Update test metadata (UpdateTestRequestDto: same fields as create minus
  // instituteId, plus `active`). Returns the refreshed test.
  async updateTest(testId, body) {
    try {
      const { data, error, success } = await put(`/tests/${testId}`, body);
      if (!success) return { data: null, error };
      return { data: unwrapOne(data), error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to update test' } };
    }
  },

  async deleteTest(testId) {
    try {
      const { data, error, success } = await del(`/tests/${testId}`);
      if (!success) return { data: null, error };
      return { data: unwrapOne(data) ?? true, error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to delete test' } };
    }
  },

  // Set/curate the test's questions in one call (AddTestQuestionsRequestDto).
  // `questions` is an array of TestQuestionItem: { questionId (required), marks,
  // negativeMarks, sortOrder }. This replaces the question set; returns the test
  // with the updated `questions[]` and recomputed `totalMarks`.
  async setQuestions(testId, questions) {
    try {
      const { data, error, success } = await post(`/tests/${testId}/questions`, { questions });
      if (!success) return { data: null, error };
      return { data: unwrapOne(data), error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to update questions' } };
    }
  },

  async removeQuestion(testId, questionId) {
    try {
      const { data, error, success } = await del(`/tests/${testId}/questions/${questionId}`);
      if (!success) return { data: null, error };
      return { data: unwrapOne(data) ?? true, error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to remove question' } };
    }
  },

  // Move a test from DRAFT → PUBLISHED so it becomes assignable/takeable.
  async publishTest(testId) {
    try {
      const { data, error, success } = await post(`/tests/${testId}/publish`, {});
      if (!success) return { data: null, error };
      return { data: unwrapOne(data), error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to publish test' } };
    }
  },

  // Results: { testId, testTitle, totalMarks, passingMarks, studentCount, results[] }.
  async getResults(testId) {
    try {
      const { data, error, success } = await get(`/tests/${testId}/results`);
      if (!success) return { data: null, error };
      return { data: unwrapOne(data), error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to load results' } };
    }
  },

  // ---------------------------------------------------------------------------
  // Staff — Test Assignment
  // ---------------------------------------------------------------------------

  async listAssignments(testId) {
    try {
      const { data, error, success } = await get(`/tests/${testId}/assignments`);
      if (!success) return { data: [], error };
      return { data: unwrapList(data, 'assignments'), error: null };
    } catch (error) {
      return { data: [], error: { message: error?.message || 'Failed to load assignments' } };
    }
  },

  // Assign a test (AssignTestRequestDto): targetType (COURSE|BATCH|STUDENT) +
  // targetId (both required), optional availableFrom / availableUntil window.
  async assignTest(testId, body) {
    try {
      const { data, error, success } = await post(`/tests/${testId}/assignments`, body);
      if (!success) return { data: null, error };
      return { data: unwrapOne(data), error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to assign test' } };
    }
  },

  async removeAssignment(testId, assignmentId) {
    try {
      const { data, error, success } = await del(`/tests/${testId}/assignments/${assignmentId}`);
      if (!success) return { data: null, error };
      return { data: unwrapOne(data) ?? true, error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to remove assignment' } };
    }
  },

  // ---------------------------------------------------------------------------
  // Student — Test Taking
  // ---------------------------------------------------------------------------

  // Tests assigned to the calling student (via their course/batch/direct assignment).
  async getAvailableTests() {
    try {
      const { data, error, success } = await get('/student/tests/available');
      if (!success) return { data: [], error };
      return { data: unwrapList(data, 'tests'), error: null };
    } catch (error) {
      return { data: [], error: { message: error?.message || 'Failed to load available tests' } };
    }
  },

  // Start a fresh attempt or resume the in-progress one for this test.
  async startAttempt(testId) {
    try {
      const { data, error, success } = await post(`/student/tests/${testId}/attempts`, {});
      if (!success) return { data: null, error };
      return { data: unwrapOne(data), error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to start attempt' } };
    }
  },

  // Fetch an attempt (questions for the student to answer + any saved answers).
  async getAttempt(attemptId) {
    try {
      const { data, error, success } = await get(`/student/tests/attempts/${attemptId}`);
      if (!success) return { data: null, error };
      return { data: unwrapOne(data), error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to load attempt' } };
    }
  },

  // Persist a single answer (SubmitAnswerRequestDto): { questionId, selectedOptionIds[] }.
  // Called as the student answers so progress survives a closed tab.
  async saveAnswer(attemptId, answer) {
    try {
      const { data, error, success } = await put(`/student/tests/attempts/${attemptId}/answers`, answer);
      if (!success) return { data: null, error };
      return { data: unwrapOne(data) ?? true, error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to save answer' } };
    }
  },

  // Submit the attempt for grading. SubmitAttemptRequestDto: { answers[] } — we send
  // the full answer set as a backstop even though answers are also saved incrementally.
  async submitAttempt(attemptId, answers = []) {
    try {
      const { data, error, success } = await post(`/student/tests/attempts/${attemptId}/submit`, { answers });
      if (!success) return { data: null, error };
      return { data: unwrapOne(data), error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to submit attempt' } };
    }
  }
};

export default newTestService;
