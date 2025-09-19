// Legacy auth service - replaced by newAuthService.js
// This file is kept for backward compatibility

import { newAuthService } from './newAuthService';

// Forward all calls to the new auth service
export const authService = {
  // Sign in with email and password (renamed to match AuthContext expectations)
  async signInWithPassword(email, password) {
    return newAuthService.signInWithPassword(email, password);
  },

  // Keep original signIn method for backward compatibility
  async signIn(email, password) {
    return newAuthService.signIn(email, password);
  },

  // Sign up new user
  async signUp(email, password, userData = {}) {
    return newAuthService.signUp(email, password, userData);
  },

  // Sign out
  async signOut() {
    return newAuthService.signOut();
  },

  // Get current session
  async getSession() {
    return newAuthService.getSession();
  },

  // Get current user
  async getCurrentUser() {
    return newAuthService.getCurrentUser();
  },

  // Get user profile (missing method that AuthContext expects)
  async getUserProfile(userId) {
    return newAuthService.getUserProfile(userId);
  },

  // Update user profile (missing method that AuthContext expects)
  async updateUserProfile(userId, updates) {
    return newAuthService.updateUserProfile(userId, updates);
  },

  // Reset password
  async resetPassword(email) {
    return newAuthService.resetPassword(email);
  },

  // Update password
  async updatePassword(newPassword) {
    return newAuthService.updatePassword(newPassword);
  },

  // Update user profile (auth metadata)
  async updateProfile(updates) {
    return newAuthService.updateProfile(updates);
  },
};