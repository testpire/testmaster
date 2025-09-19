// Legacy test service - replaced by placeholderServices.js
// This file is kept for backward compatibility

import { newTestService } from './placeholderServices';

// Forward all calls to the new test service
export const testService = {
  // Get all tests
  async getTests(filters = {}) {
    return newTestService.getTests(filters);
  },

  // Get test by ID
  async getTest(testId) {
    return newTestService.getTest(testId);
  },

  // Create new test
  async createTest(testData) {
    return newTestService.createTest(testData);
  },

  // Update test
  async updateTest(testId, updates) {
    return newTestService.updateTest(testId, updates);
  },

  // Delete test
  async deleteTest(testId) {
    return newTestService.deleteTest(testId);
  },

  // Add questions to test
  async addQuestionsToTest(testId, questionIds) {
    return newTestService.addQuestionsToTest(testId, questionIds);
  },

  // Remove question from test
  async removeQuestionFromTest(testId, questionId) {
    return newTestService.removeQuestionFromTest(testId, questionId);
  },

  // Assign test to batches
  async assignTestToBatches(testId, batchIds, assignedBy, dueDate) {
    return newTestService.assignTestToBatches(testId, batchIds, assignedBy, dueDate);
  },

  // Get assigned tests for student
  async getAssignedTests(studentId) {
    return newTestService.getAssignedTests(studentId);
  },

  // Start test attempt
  async startTestAttempt(testId, studentId) {
    return newTestService.startTestAttempt(testId, studentId);
  },

  // Submit test
  async submitTest(submissionId, answers) {
    return newTestService.submitTest(submissionId, answers);
  },

  // Get test results
  async getTestResults(testId, filters) {
    return newTestService.getTestResults(testId, filters);
  },

  // Publish test
  async publishTest(testId) {
    return newTestService.publishTest(testId);
  },
};