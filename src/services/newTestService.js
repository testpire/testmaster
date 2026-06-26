import { get, post, put, del } from '../lib/apiClient';
import { unwrapOne, unwrapList } from '../utils/responseHelpers';
import { hasLatex } from '../components/MathText';

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

export const newTestService = {
  // ---------------------------------------------------------------------------
  // Staff — Test Management
  // ---------------------------------------------------------------------------

  // List all tests for the active institute (JWT / X-Institute-Id scoped).
  // Optional `type` ('TEST' | 'PRACTICE') filters server-side (GET /tests?type=).
  async listTests(type) {
    try {
      const { data, error, success } = await get('/tests', type ? { params: { type } } : undefined);
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

  // Create a test. CreateTestRequestDto: title (required), description, type
  // ('TEST' | 'PRACTICE' — PRACTICE is a Daily Practice Problem set: unlimited
  // attempts within the window with answers revealed for self-study),
  // durationMinutes, maxAttempts (null = unlimited, used for PRACTICE), passingMarks,
  // negativeMarking, shuffleQuestions, showAnswers, availableFrom, availableUntil,
  // instituteId (super-admin override; otherwise scoped from the JWT). totalMarks is
  // computed server-side from questions. NOTE: `type` is set at creation only —
  // UpdateTestRequestDto has no `type`, so it can't be changed afterwards.
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

  // Publish a test's results/solutions to students — what makes any ON_PUBLISH
  // reveal setting go live (stamps resultsPublishedAt). Staff-only, idempotent, and
  // distinct from publishTest() (which makes the test *takeable*; this makes results
  // *visible*). Returns the refreshed test when the backend echoes it.
  async publishResults(testId) {
    try {
      const { data, error, success } = await post(`/tests/${testId}/publish-results`, {});
      if (!success) return { data: null, error };
      return { data: unwrapOne(data) ?? true, error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to publish results' } };
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

  // Per-student test history for STAFF. The backend has no single endpoint for "all of
  // one student's attempts" addressable by staff (GET /student/tests/attempts is the
  // *current* user only), so we aggregate: list every test, pull each test's results
  // in parallel, and keep the row(s) matching this student. This is an N+1 fan-out
  // bounded by the number of tests in the institute; individual test failures are
  // tolerated (skipped, not fatal). Returns normalized rows the UI can render directly.
  async getResultsForStudent(studentId) {
    try {
      const sid = String(studentId);
      const { data: tests, error: listErr } = await this.listTests();
      if (listErr) return { data: [], error: listErr };
      if (!Array.isArray(tests) || tests.length === 0) return { data: [], error: null };

      const summaries = await Promise.all(
        tests.map((t) => this.getResults(t.id).then((r) => ({ test: t, summary: r.data })))
      );

      const items = [];
      for (const { test, summary } of summaries) {
        if (!summary) continue; // failed/empty test result — skip
        const totalMarks = summary.totalMarks ?? test.totalMarks ?? null;
        const passingMarks = summary.passingMarks ?? test.passingMarks ?? null;
        const rows = Array.isArray(summary.results) ? summary.results : [];

        for (const r of rows) {
          // The /tests/{id}/results row keys the student as `studentUserId`
          // (verified live); keep the older aliases as fallbacks.
          const rowSid = r.studentUserId ?? r.studentId ?? r.userId ?? '';
          if (String(rowSid) !== sid) continue;

          const score = r.marksObtained ?? r.score ?? r.totalScore ?? r.marks ?? null;
          const percentage =
            r.percentage != null
              ? Number(r.percentage)
              : score != null && totalMarks
              ? (Number(score) / Number(totalMarks)) * 100
              : null;
          const passed =
            typeof r.passed === 'boolean'
              ? r.passed
              : passingMarks != null && score != null
              ? Number(score) >= Number(passingMarks)
              : null;

          items.push({
            testId: test.id,
            testTitle: summary.testTitle || test.title || `Test #${test.id}`,
            totalMarks,
            passingMarks,
            attemptId: r.attemptId ?? r.id ?? null,
            score,
            percentage,
            passed,
            submittedAt: r.submittedAt || r.completedAt || r.attemptedAt || r.updatedAt || null,
          });
        }
      }

      return { data: items, error: null };
    } catch (error) {
      return { data: [], error: { message: error?.message || 'Failed to load test history' } };
    }
  },

  // Staff view of a single student's graded attempt — the per-question breakdown
  // (same shape as the student's GET /student/tests/attempts/{id}, but addressable
  // by staff for any student's attempt). NOTE: this endpoint is not yet exposed by
  // the backend; the UI degrades gracefully on a 404/"no static resource" error
  // until it lands. `skipAuthRedirect` keeps a missing endpoint from logging staff
  // out. The conventional path nests the attempt under its test.
  async getStaffAttempt(testId, attemptId) {
    try {
      const { data, error, success } = await get(
        `/tests/${testId}/attempts/${attemptId}`,
        { skipAuthRedirect: true }
      );
      if (!success) return { data: null, error };
      const attempt = unwrapOne(data);
      // The staff endpoint may omit textFormat or return 'PLAIN' on question objects
      // even when options contain LaTeX ($…$). Back-fill it via auto-detection so the
      // admin's Attempt Detail renders math identically to the student's result page.
      if (attempt?.questions) {
        attempt.questions = attempt.questions.map((q) => {
          if (q.textFormat && q.textFormat !== 'PLAIN') return q;
          const anyLatex =
            hasLatex(q.text) || (q.options || []).some((o) => hasLatex(o.text));
          return anyLatex ? { ...q, textFormat: 'LATEX' } : q;
        });
      }
      return { data: attempt, error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || 'Failed to load attempt' } };
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
  // Optional `type` ('TEST' | 'PRACTICE') narrows to regular tests or Daily Practice
  // Problems (GET /student/tests/available?type=). AvailableTestResponseDto carries
  // { testId, type, title, description, totalMarks, durationMinutes, maxAttempts
  // (null = unlimited), attemptsUsed, availableFrom, availableUntil, inProgressAttemptId }.
  async getAvailableTests(type) {
    try {
      const { data, error, success } = await get(
        '/student/tests/available',
        type ? { params: { type } } : undefined
      );
      if (!success) return { data: [], error };
      return { data: unwrapList(data, 'tests'), error: null };
    } catch (error) {
      return { data: [], error: { message: error?.message || 'Failed to load available tests' } };
    }
  },

  // List the calling student's own attempts (completed + in-progress), for the
  // "Results" tab. NOTE: this endpoint does not exist on the backend yet — until it
  // does it returns a soft error and the Results page falls back to deriving the
  // list from getAvailableTests(). `skipAuthRedirect` keeps the missing route from
  // logging the student out. Expected row shape:
  //   { attemptId, testId, testTitle, status, score, maxScore, submittedAt }
  async getMyAttempts() {
    try {
      const { data, error, success } = await get('/student/tests/attempts', {
        skipAuthRedirect: true
      });
      if (!success) return { data: [], error };
      return { data: unwrapList(data, 'attempts'), error: null };
    } catch (error) {
      return { data: [], error: { message: error?.message || 'Failed to load attempts' } };
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
  // Called as the student answers so progress survives a closed tab. The response
  // `data` is an AnswerFeedbackResponseDto: for a PRACTICE test with
  // solutionReveal=DURING_ATTEMPT it carries { feedbackAvailable: true, correct,
  // marksAwarded, correctOptionIds, explanation, textFormat } for instant feedback;
  // otherwise feedbackAvailable is false and the reveal fields are null (ignore them).
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
