import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import ProtectedSuperAdminRoutes from "./components/ProtectedSuperAdminRoutes";
import ProtectedManagementRoutes from "./components/ProtectedManagementRoutes";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "pages/NotFound";
import SimpleLogin from './pages/simple-login';
import SuperAdminDashboard from './pages/super-admin-dashboard';
import QuestionBank from './pages/question-bank';
import StudentDashboard from './pages/student-dashboard';
import TeacherDashboard from './pages/teacher-dashboard';
import InstituteAdminDashboard from './pages/institute-admin-dashboard';
import SimpleSignup from './pages/simple-signup';
import TeacherManagement from './pages/teacher-management';
import StudentManagement from './pages/student-management';
import CourseManagement from './pages/course-management';
import InstituteManagement from './pages/institute-management';
import LeadManagement from './pages/lead-management';
import ForgotPassword from './pages/forgot-password';
import SetPassword from './pages/set-password';
import Profile from './pages/profile';
import AccessControl from './pages/access-control';

const Routes = () => {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ErrorBoundary>
        <ScrollToTop />
        <RouterRoutes>
          {/* Auth */}
          <Route path="/" element={<SimpleLogin />} />
          <Route path="/login" element={<SimpleLogin />} />
          <Route path="/login-screen" element={<SimpleLogin />} />
          <Route path="/signup" element={<SimpleSignup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/set-password" element={<SetPassword />} />

          {/* Super Admin only routes */}
          <Route path="/super-admin-dashboard" element={<ProtectedSuperAdminRoutes><SuperAdminDashboard /></ProtectedSuperAdminRoutes>} />
          <Route path="/institute-management" element={<ProtectedSuperAdminRoutes><InstituteManagement /></ProtectedSuperAdminRoutes>} />

          {/* Management routes shared between SUPER_ADMIN and INST_ADMIN */}
          <Route path="/teacher-management" element={<ProtectedManagementRoutes><TeacherManagement /></ProtectedManagementRoutes>} />
          <Route path="/student-management" element={<ProtectedManagementRoutes><StudentManagement /></ProtectedManagementRoutes>} />
          <Route path="/lead-management" element={<ProtectedManagementRoutes><LeadManagement /></ProtectedManagementRoutes>} />
          <Route path="/course-management" element={<ProtectedManagementRoutes><CourseManagement /></ProtectedManagementRoutes>} />
          <Route path="/question-bank" element={<ProtectedManagementRoutes><QuestionBank /></ProtectedManagementRoutes>} />
          <Route path="/access-control" element={<ProtectedManagementRoutes><AccessControl /></ProtectedManagementRoutes>} />

          {/* Institute Admin and other roles (role-guarded) */}
          <Route path="/inst-admin-dashboard" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'INST_ADMIN', 'INSTITUTE_ADMIN', 'ADMIN']}><InstituteAdminDashboard /></ProtectedRoute>} />
          <Route path="/teacher-dashboard" element={<ProtectedRoute allowedRoles={['TEACHER']}><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/student-dashboard" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />

          {/* Shared — any authenticated user */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
