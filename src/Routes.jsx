import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import ProtectedSuperAdminRoutes from "./components/ProtectedSuperAdminRoutes";
import ProtectedManagementRoutes from "./components/ProtectedManagementRoutes";
import ProtectedTestManagementRoutes from "./components/ProtectedTestManagementRoutes";
import ProtectedRoute from "./components/ProtectedRoute";
import { MANAGEMENT_ROLES } from "./utils/roleBasedRouting";
import NotFound from "pages/NotFound";
import SimpleLogin from './pages/simple-login';
import SuperAdminDashboard from './pages/super-admin-dashboard';
import QuestionBank from './pages/question-bank';
import AddQuestions from './pages/add-questions';
import TestManagement from './pages/test-management';
import TestDetail from './pages/test-detail';
import StudentTests from './pages/student-tests';
import SelfTestHub from './pages/self-test';
import SelfTestBuilder from './pages/self-test-builder';
import StudentResults from './pages/student-results';
import TestResult from './pages/test-result';
import TestTaking from './pages/test-taking';
import StudentDashboard from './pages/student-dashboard';
import TeacherDashboard from './pages/teacher-dashboard';
import InstituteAdminDashboard from './pages/institute-admin-dashboard';
import SimpleSignup from './pages/simple-signup';
import TeacherManagement from './pages/teacher-management';
import StudentManagement from './pages/student-management';
import StudentProfile from './pages/student-profile';
import CourseManagement from './pages/course-management';
import TopicMaterials from './pages/topic-materials';
import ChapterMaterials from './pages/chapter-materials';
import CourseContent from './pages/course-content';
import InstituteManagement from './pages/institute-management';
import LeadManagement from './pages/lead-management';
import LeadProfile from './pages/lead-profile';
import ForgotPassword from './pages/forgot-password';
import SetPassword from './pages/set-password';
import Profile from './pages/profile';
import AccessControl from './pages/access-control';
import UserForm from './pages/user-form';
import StudyMaterials from './pages/study-materials';

const Routes = () => {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ErrorBoundary>
        <ScrollToTop />
        <RouterRoutes>
          {/* Auth */}
          <Route path="/" element={<SimpleLogin />} />
          <Route path="/login" element={<SimpleLogin />} />
          <Route path="/signup" element={<SimpleSignup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/set-password" element={<SetPassword />} />

          {/* Super Admin only routes */}
          <Route path="/super-admin-dashboard" element={<ProtectedSuperAdminRoutes><SuperAdminDashboard /></ProtectedSuperAdminRoutes>} />
          <Route path="/institute-management" element={<ProtectedSuperAdminRoutes><InstituteManagement /></ProtectedSuperAdminRoutes>} />

          {/* Management routes shared between SUPER_ADMIN and INST_ADMIN */}
          <Route path="/teacher-management" element={<ProtectedManagementRoutes><TeacherManagement /></ProtectedManagementRoutes>} />
          {/* Student management — usable by admins and teachers */}
          <Route path="/student-management" element={<ProtectedRoute allowedRoles={MANAGEMENT_ROLES}><StudentManagement /></ProtectedRoute>} />
          {/* Create/edit user form (page) — shared by all management pages */}
          <Route path="/user-form" element={<ProtectedRoute allowedRoles={MANAGEMENT_ROLES}><UserForm /></ProtectedRoute>} />
          <Route path="/student-profile/:studentId" element={<ProtectedRoute allowedRoles={MANAGEMENT_ROLES}><StudentProfile /></ProtectedRoute>} />
          <Route path="/lead-management" element={<ProtectedManagementRoutes><LeadManagement /></ProtectedManagementRoutes>} />
          <Route path="/lead-profile/:leadId" element={<ProtectedManagementRoutes><LeadProfile /></ProtectedManagementRoutes>} />
          <Route path="/course-management" element={<ProtectedManagementRoutes><CourseManagement /></ProtectedManagementRoutes>} />
          {/* Topic materials — usable by admins and teachers (e.g. while teaching) */}
          <Route path="/topic-materials/:topicId" element={<ProtectedRoute allowedRoles={MANAGEMENT_ROLES}><TopicMaterials /></ProtectedRoute>} />
          {/* Chapter materials — chapter-level counterpart of topic materials */}
          <Route path="/chapter-materials/:chapterId" element={<ProtectedRoute allowedRoles={MANAGEMENT_ROLES}><ChapterMaterials /></ProtectedRoute>} />
          {/* Teacher-facing read-only curriculum browser → topic materials */}
          <Route path="/course-content" element={<ProtectedRoute allowedRoles={MANAGEMENT_ROLES}><CourseContent /></ProtectedRoute>} />
          {/* Question bank — usable by admins and teachers */}
          <Route path="/question-bank" element={<ProtectedRoute allowedRoles={MANAGEMENT_ROLES}><QuestionBank /></ProtectedRoute>} />
          <Route path="/question-bank/add" element={<ProtectedRoute allowedRoles={MANAGEMENT_ROLES}><AddQuestions /></ProtectedRoute>} />
          <Route path="/access-control" element={<ProtectedManagementRoutes><AccessControl /></ProtectedManagementRoutes>} />

          {/* Test authoring — shared between SUPER_ADMIN, INST_ADMIN and TEACHER */}
          <Route path="/test-management" element={<ProtectedTestManagementRoutes><TestManagement /></ProtectedTestManagementRoutes>} />
          <Route path="/test-management/:testId" element={<ProtectedTestManagementRoutes><TestDetail /></ProtectedTestManagementRoutes>} />

          {/* Institute Admin and other roles (role-guarded) */}
          <Route path="/inst-admin-dashboard" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'INST_ADMIN', 'INSTITUTE_ADMIN', 'ADMIN']}><InstituteAdminDashboard /></ProtectedRoute>} />
          <Route path="/teacher-dashboard" element={<ProtectedRoute allowedRoles={['TEACHER']}><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/student-dashboard" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />

          {/* Student test-taking */}
          <Route path="/study-materials" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudyMaterials /></ProtectedRoute>} />
          <Route path="/my-tests" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentTests /></ProtectedRoute>} />
          {/* Self-tests — student-built practice. /self-test lists them; /new builds one. */}
          <Route path="/self-test" element={<ProtectedRoute allowedRoles={['STUDENT']}><SelfTestHub /></ProtectedRoute>} />
          <Route path="/self-test/new" element={<ProtectedRoute allowedRoles={['STUDENT']}><SelfTestBuilder /></ProtectedRoute>} />
          <Route path="/my-results" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentResults /></ProtectedRoute>} />
          <Route path="/test-result/:attemptId" element={<ProtectedRoute allowedRoles={['STUDENT']}><TestResult /></ProtectedRoute>} />
          <Route path="/test-taking/:attemptId" element={<ProtectedRoute allowedRoles={['STUDENT']}><TestTaking /></ProtectedRoute>} />

          {/* Shared — any authenticated user */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
