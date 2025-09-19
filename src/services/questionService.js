// Legacy question service - replaced by placeholderServices.js
// This file is kept for backward compatibility

import { newQuestionService } from './placeholderServices';

// Forward all calls to the new question service
export const questionService = {
  // Get questions with filters
  async getQuestions(filters = {}) {
    return newQuestionService.getQuestions(filters);
  },

  // Get question by ID
  async getQuestion(questionId) {
    return newQuestionService.getQuestion(questionId);
  },

  // Create new question
  async createQuestion(questionData) {
    return newQuestionService.createQuestion(questionData);
  },

  // Update question
  async updateQuestion(questionId, updates) {
    return newQuestionService.updateQuestion(questionId, updates);
  },

  // Delete question
  async deleteQuestion(questionId) {
    return newQuestionService.deleteQuestion(questionId);
  },

  // Get chapters by subject
  async getChaptersBySubject(subject, classLevel) {
    return newQuestionService.getChaptersBySubject(subject, classLevel);
  },

  // Get topics by chapter
  async getTopicsByChapter(chapterId) {
    return newQuestionService.getTopicsByChapter(chapterId);
  },

  // Create question option
  async createQuestionOption(questionId, optionData) {
    return newQuestionService.createQuestionOption(questionId, optionData);
  },

  // Update question option
  async updateQuestionOption(optionId, updates) {
    return newQuestionService.updateQuestionOption(optionId, updates);
  },

  // Delete question option
  async deleteQuestionOption(optionId) {
    return newQuestionService.deleteQuestionOption(optionId);
  },

  // Report question
  async reportQuestion(questionId, reportData) {
    return newQuestionService.reportQuestion(questionId, reportData);
  },

  // Get question statistics
  async getQuestionStats() {
    return newQuestionService.getQuestionStats();
  },

  // Get external question banks
  async getExternalQuestionBanks() {
    return newQuestionService.getExternalQuestionBanks();
  },

  // Create question bank import job
  async createQuestionBankImport(importData) {
    return newQuestionService.createQuestionBankImport(importData);
  },

  // Bulk import questions from CSV/JSON
  async bulkImportQuestions(questionsData, importSettings) {
    return newQuestionService.bulkImportQuestions(questionsData, importSettings);
  },

  // Parse CSV file for bulk import
  async parseQuestionsFile(file) {
    return newQuestionService.parseQuestionsFile(file);
  },

  // Get import history
  async getImportHistory(limit) {
    return newQuestionService.getImportHistory(limit);
  },

  // Upload question image
  async uploadQuestionImage(file) {
    return newQuestionService.uploadQuestionImage(file);
  },
};