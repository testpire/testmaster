// Service mapping from old Supabase services to new API services
// This file provides a single point to switch between old and new implementations

import { newAuthService } from './newAuthService';
import { newUserService } from './newUserService';
import { newInstituteService } from './newInstituteService';
import { newDashboardService } from './newDashboardService';
import { 
  newTestService, 
  newCourseService, 
  newBatchService, 
  newQuestionService, 
  newStudyMaterialService 
} from './placeholderServices';

// Flag to control which services to use
const USE_NEW_API = true; // Set to false to use old Supabase services

// Export the appropriate services based on the flag
export const authService = USE_NEW_API ? newAuthService : (await import('./authService')).authService;
export const userService = USE_NEW_API ? newUserService : (await import('./userService')).userService;
export const testService = USE_NEW_API ? newTestService : (await import('./testService')).testService;
export const courseService = USE_NEW_API ? newCourseService : (await import('./courseService')).courseService;
export const batchService = USE_NEW_API ? newBatchService : (await import('./batchService')).batchService;
export const questionService = USE_NEW_API ? newQuestionService : (await import('./questionService')).questionService;
export const studyMaterialService = USE_NEW_API ? newStudyMaterialService : (await import('./studyMaterialService')).studyMaterialService;

// New services that don't have old equivalents
export const instituteService = newInstituteService;
export const dashboardService = newDashboardService;
