import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import ProtectedSuperAdminRoutes from "./components/ProtectedSuperAdminRoutes";
import NotFound from "pages/NotFound";
import StudentManagementScreen from './pages/student-management-screen';
import AnalyticsAndReportsScreen from './pages/analytics-and-reports-screen';
import LoginScreen from './pages/login-screen';
import SimpleLogin from './pages/simple-login';
import SuperAdminDashboard from './pages/super-admin-dashboard';
import CourseAndBatchManagementScreen from './pages/course-and-batch-management-screen';
import TestCreationScreen from './pages/test-creation-screen';
import TestTakingInterface from './pages/test-taking-interface';
import StudentDashboard from './pages/student-dashboard';
import TeacherDashboard from './pages/teacher-dashboard';
import InstituteAdminDashboard from './pages/institute-admin-dashboard';
import SimpleSignup from './pages/simple-signup';
import TeacherManagement from './pages/teacher-management';
import StudentManagement from './pages/student-management';
import CourseManagement from './pages/course-management';
import InstituteManagement from './pages/institute-management';
// New features will be added later

const Routes = () => {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ErrorBoundary>
        <ScrollToTop />
        <RouterRoutes>
          <Route path="/" element={<SimpleLogin />} />
          <Route path="/login" element={<SimpleLogin />} />
          <Route path="/login-screen" element={<SimpleLogin />} />
          <Route path="/login-original" element={<LoginScreen />} />
          <Route path="/signup" element={<SimpleSignup />} />
          
          {/* Super Admin Routes - These routes get the selected institute context */}
          <Route path="/super-admin-dashboard" element={<ProtectedSuperAdminRoutes><SuperAdminDashboard /></ProtectedSuperAdminRoutes>} />
          <Route path="/teacher-management" element={<ProtectedSuperAdminRoutes><TeacherManagement /></ProtectedSuperAdminRoutes>} />
          <Route path="/student-management" element={<ProtectedSuperAdminRoutes><StudentManagement /></ProtectedSuperAdminRoutes>} />
          <Route path="/course-management" element={<ProtectedSuperAdminRoutes><CourseManagement /></ProtectedSuperAdminRoutes>} />
          <Route path="/test-management" element={<ProtectedSuperAdminRoutes><TestCreationScreen /></ProtectedSuperAdminRoutes>} />
          <Route path="/institute-management" element={<ProtectedSuperAdminRoutes><InstituteManagement /></ProtectedSuperAdminRoutes>} />
          <Route path="/analytics-and-reports-screen" element={<ProtectedSuperAdminRoutes><AnalyticsAndReportsScreen /></ProtectedSuperAdminRoutes>} />
          
          {/* Institute Admin and other roles */}
          <Route path="/inst-admin-dashboard" element={<InstituteAdminDashboard />} />
          <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          
          {/* Legacy/fallback routes */}
          <Route path="/student-management-screen" element={<StudentManagementScreen />} />
          <Route path="/course-and-batch-management-screen" element={<CourseAndBatchManagementScreen />} />
          <Route path="/test-creation-screen" element={<TestCreationScreen />} />
          <Route path="/test-taking-interface" element={<TestTakingInterface />} />
          {/* New features will be added here later */}
          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;