import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
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
import SimpleSignup from './pages/simple-signup';
// New features will be added later

const Routes = () => {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ErrorBoundary>
        <ScrollToTop />
        <RouterRoutes>
          <Route path="/" element={<SimpleLogin />} />
          <Route path="/login" element={<SimpleLogin />} />
          <Route path="/login-original" element={<LoginScreen />} />
          <Route path="/signup" element={<SimpleSignup />} />
          <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
          <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          <Route path="/student-management-screen" element={<StudentManagementScreen />} />
          <Route path="/course-and-batch-management-screen" element={<CourseAndBatchManagementScreen />} />
          <Route path="/test-creation-screen" element={<TestCreationScreen />} />
          <Route path="/test-taking-interface" element={<TestTakingInterface />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/analytics-and-reports-screen" element={<AnalyticsAndReportsScreen />} />
          {/* New features will be added here later */}
          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;