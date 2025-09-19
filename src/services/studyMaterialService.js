// Legacy study material service - replaced by placeholderServices.js
// This file is kept for backward compatibility

import { newStudyMaterialService } from './placeholderServices';

// Forward all calls to the new study material service
export const studyMaterialService = {
  // Get study materials with filters
  async getStudyMaterials(filters = {}) {
    return newStudyMaterialService.getStudyMaterials(filters);
  },

  // Get study material by ID
  async getStudyMaterial(materialId) {
    return newStudyMaterialService.getStudyMaterial(materialId);
  },

  // Create new study material
  async createStudyMaterial(materialData) {
    return newStudyMaterialService.createStudyMaterial(materialData);
  },

  // Update study material
  async updateStudyMaterial(materialId, updates) {
    return newStudyMaterialService.updateStudyMaterial(materialId, updates);
  },

  // Delete study material
  async deleteStudyMaterial(materialId) {
    return newStudyMaterialService.deleteStudyMaterial(materialId);
  },

  // Upload study material file
  async uploadStudyFile(file, materialType) {
    return newStudyMaterialService.uploadStudyFile(file, materialType);
  },

  // Get study materials by subject for student
  async getStudyMaterialsBySubject(subject, classLevel) {
    return newStudyMaterialService.getStudyMaterialsBySubject(subject, classLevel);
  },

  // Get study materials by chapter
  async getStudyMaterialsByChapter(chapterId) {
    return newStudyMaterialService.getStudyMaterialsByChapter(chapterId);
  },

  // Get study materials by topic
  async getStudyMaterialsByTopic(topicId) {
    return newStudyMaterialService.getStudyMaterialsByTopic(topicId);
  },

  // Get material types
  getMaterialTypes() {
    return newStudyMaterialService.getMaterialTypes();
  },

  // Search study materials
  async searchStudyMaterials(searchTerm, filters) {
    return newStudyMaterialService.searchStudyMaterials(searchTerm, filters);
  },
};