// Legacy course service - replaced by placeholderServices.js
// This file is kept for backward compatibility

import { newCourseService } from './placeholderServices';

// Forward all calls to the new course service
export const courseService = {
  // Get all courses
  async getCourses(filters = {}) {
    return newCourseService.getCourses(filters);
  },

  // Get course by ID
  async getCourse(courseId) {
    return newCourseService.getCourse(courseId);
  },

  // Create new course
  async createCourse(courseData) {
    return newCourseService.createCourse(courseData);
  },

  // Update course
  async updateCourse(courseId, updates) {
    return newCourseService.updateCourse(courseId, updates);
  },

  // Delete course
  async deleteCourse(courseId) {
    return newCourseService.deleteCourse(courseId);
  },

  // Get subjects for a course
  getSubjectsForExam(examType) {
    return newCourseService.getSubjectsForExam(examType);
  },
};