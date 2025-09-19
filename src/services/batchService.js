// Legacy batch service - replaced by placeholderServices.js
// This file is kept for backward compatibility

import { newBatchService } from './placeholderServices';

// Forward all calls to the new batch service
export const batchService = {
  // Get all batches
  async getBatches(filters = {}) {
    return newBatchService.getBatches(filters);
  },

  // Get batch by ID
  async getBatch(batchId) {
    return newBatchService.getBatch(batchId);
  },

  // Create new batch
  async createBatch(batchData) {
    return newBatchService.createBatch(batchData);
  },

  // Update batch
  async updateBatch(batchId, updates) {
    return newBatchService.updateBatch(batchId, updates);
  },

  // Delete batch
  async deleteBatch(batchId) {
    return newBatchService.deleteBatch(batchId);
  },

  // Add student to batch
  async addStudentToBatch(studentId, batchId) {
    return newBatchService.addStudentToBatch(studentId, batchId);
  },

  // Remove student from batch
  async removeStudentFromBatch(studentId, batchId) {
    return newBatchService.removeStudentFromBatch(studentId, batchId);
  },

  // Move student between batches
  async moveStudentToBatch(studentId, fromBatchId, toBatchId) {
    return newBatchService.moveStudentToBatch(studentId, fromBatchId, toBatchId);
  },

  // Get batches for a teacher
  async getBatchesForTeacher(teacherId) {
    return newBatchService.getBatchesForTeacher(teacherId);
  },

  // Get batches for a student
  async getBatchesForStudent(studentId) {
    return newBatchService.getBatchesForStudent(studentId);
  },
};