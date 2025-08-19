import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import LoginBackground from './components/LoginBackground';
import PlatformLogo from './components/PlatformLogo';
import LoginForm from './components/LoginForm';
import SecurityFeatures from './components/SecurityFeatures';
import { useAuth } from '../../contexts/AuthContext';

const LoginScreen = () => {
  const { signIn, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isRedirecting) {
      setIsRedirecting(true);
      const userRole = user?.user_metadata?.role;
      switch (userRole) {
        case 'super_admin':navigate('/super-admin-dashboard');
          break;
        case 'teacher':navigate('/course-and-batch-management-screen');
          break;
        case 'student':navigate('/student-dashboard');
          break;
        default:
          navigate('/student-dashboard');
      }
    }
  }, [user, navigate, isRedirecting]);

  const handleLogin = async (formData) => {
    try {
      // Use real Supabase authentication
      const { data, error: signInError } = await signIn(formData?.email, formData?.password);

      if (signInError) {
        // Handle specific Supabase authentication errors
        let errorMessage = signInError?.message;
        
        if (signInError?.message?.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (signInError?.message?.includes('Failed to fetch') || 
                   signInError?.message?.includes('NetworkError')) {
          errorMessage = 'Cannot connect to authentication service. Please check your internet connection and try again.';
        }
        
        return { success: false, error: errorMessage };
      }

      if (data?.user) {
        // Get user role from user_metadata or userProfile
        const userRole = data?.user?.user_metadata?.role || formData?.userRole || 'student';
        
        setIsRedirecting(true);
        return { success: true };
      }

      return { success: false, error: 'Authentication failed. Please try again.' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error?.message || 'Login failed. Please try again.' };
    }
  };

  const formatTime = (date) => {
    return date?.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Show loading state while redirecting
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <LoginBackground />
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Branding */}
          <div className="hidden lg:flex flex-col items-center justify-center text-center">
            <PlatformLogo size="large" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4 animate-fadeInUp">Welcome to TestPire</h1>
            <p className="text-xl text-gray-700 mb-8 leading-relaxed animate-fadeInUp" style={{ animationDelay: '0.2s' }}>The Ultimate Online Test Platform for Competitive Exams</p>
            <SecurityFeatures />
          </div>

          {/* Right side - Login Form */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20 animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
            <div className="lg:hidden text-center mb-6">
              <PlatformLogo />
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In to Your Account</h2>
              <p className="text-gray-600">Choose your login type and access your dashboard</p>
            </div>

            <LoginForm
              onLogin={handleLogin}
              isLoading={authLoading}
            />

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <Link
                  to="/signup"
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Create Account
                </Link>
              </p>
            </div>

            {/* System Status */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  System Online
                </span>
                <span>{formatTime(currentTime)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;