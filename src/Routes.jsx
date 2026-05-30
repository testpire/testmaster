import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import ProtectedSuperAdminRoutes from "./components/ProtectedSuperAdminRoutes";
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
import ForgotPassword from './pages/forgot-password';
import SetPassword from './pages/set-password';
import Profile from './pages/profile';

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

          {/* Super Admin Routes - These routes get the selected institute context */}
          <Route path="/super-admin-dashboard" element={<ProtectedSuperAdminRoutes><SuperAdminDashboard /></ProtectedSuperAdminRoutes>} />
          <Route path="/teacher-management" element={<ProtectedSuperAdminRoutes><TeacherManagement /></ProtectedSuperAdminRoutes>} />
          <Route path="/student-management" element={<ProtectedSuperAdminRoutes><StudentManagement /></ProtectedSuperAdminRoutes>} />
          <Route path="/course-management" element={<ProtectedSuperAdminRoutes><CourseManagement /></ProtectedSuperAdminRoutes>} />
          <Route path="/question-bank" element={<ProtectedSuperAdminRoutes><QuestionBank /></ProtectedSuperAdminRoutes>} />
          <Route path="/institute-management" element={<ProtectedSuperAdminRoutes><InstituteManagement /></ProtectedSuperAdminRoutes>} />

          {/* Institute Admin and other roles */}
          <Route path="/inst-admin-dashboard" element={<InstituteAdminDashboard />} />
          <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />

          {/* Shared */}
          <Route path="/profile" element={<Profile />} />

          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
