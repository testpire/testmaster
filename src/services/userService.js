// Legacy user service - replaced by newUserService.js
// This file is kept for backward compatibility

import { newUserService } from './newUserService';

// Forward all calls to the new user service
export const userService = {
  // Get user profile by ID
  async getUserProfile(userId) {
    return newUserService.getUserProfile(userId);
  },

  // Get all users with filters
  async getUsers(filters = {}) {
    return newUserService.getUsers(filters);
  },

  // Update user profile
  async updateUserProfile(userId, updates) {
    return newUserService.updateUserProfile(userId, updates);
  },

  // Create user profile (admin only)
  async createUserProfile(userData) {
    return newUserService.createUserProfile(userData);
  },

  // Delete user (admin only)
  async deleteUser(userId) {
    return newUserService.deleteUser(userId);
  },

  // Get students by batch
  async getStudentsByBatch(batchId) {
    return newUserService.getStudentsByBatch(batchId);
  },

  // Get teachers
  async getTeachers() {
    return newUserService.getTeachers();
  },

  // Upload profile photo
  async uploadProfilePhoto(userId, file) {
    return newUserService.uploadProfilePhoto(userId, file);
  },

  // Register teacher (admin function)
  async registerTeacher(teacherData) {
    return newUserService.registerTeacher(teacherData);
  },

  // Register student (admin function)
  async registerStudent(studentData) {
    return newUserService.registerStudent(studentData);
  },

  // Get student peers
  async getStudentPeers() {
    return newUserService.getStudentPeers();
  },

  // Get institute teachers (student view)
  async getInstituteTeachers() {
    return newUserService.getInstituteTeachers();
  },
};