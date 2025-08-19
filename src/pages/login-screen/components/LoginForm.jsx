import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';

const LoginForm = ({ onLogin, isLoading }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    userRole: 'student',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const userRoleOptions = [
    { value: 'student', label: 'Student' },
    { value: 'teacher', label: 'Teacher' },
    { value: 'super_admin', label: 'Super Admin' }
  ];

  // Demo credentials for quick access
  const demoCredentials = {
    'super_admin': { email: 'admin@testpire.com', password: 'admin123' },
    'teacher': { email: 'teacher1@testpire.com', password: 'teacher123' },
    'student': { email: 'student1@testpire.com', password: 'student123' }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(formData?.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData?.password?.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData?.password?.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData?.userRole) {
      newErrors.userRole = 'Please select your role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors?.[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: ''
      }));
    }

    // Clear general errors when user makes changes
    if (errors?.general) {
      setErrors((prev) => ({
        ...prev,
        general: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Use real Supabase authentication instead of mock validation
      const result = await onLogin({
        email: formData?.email,
        password: formData?.password,
        userRole: formData?.userRole
      });

      if (!result?.success) {
        throw new Error(result?.error || 'Authentication failed. Please check your credentials and try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({
        general: error?.message || 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    alert('Password reset functionality will be implemented soon. Please contact your administrator at support@testpire.com');
  };

  const handleQuickLogin = (role) => {
    const credentials = demoCredentials?.[role];
    if (credentials) {
      setFormData({
        ...formData,
        email: credentials?.email,
        password: credentials?.password,
        userRole: role
      });
      // Clear any existing errors
      setErrors({});
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* General Error Message */}
      {errors?.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-fadeInUp">
          <div className="flex items-start space-x-3">
            <Icon name="AlertCircle" size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 font-medium">Authentication Failed</p>
              <p className="text-sm text-red-700 mt-1">{errors?.general}</p>
            </div>
          </div>
        </div>
      )}

      {/* User Role Selection */}
      <Select
        label="Select Your Role"
        options={userRoleOptions}
        value={formData?.userRole}
        onChange={(value) => handleInputChange('userRole', value)}
        error={errors?.userRole}
        required
      />

      {/* Email Input */}
      <Input
        label="Email Address"
        type="email"
        placeholder="Enter your email address"
        value={formData?.email}
        onChange={(e) => handleInputChange('email', e?.target?.value)}
        error={errors?.email}
        required
        className="mb-4"
        autoComplete="email"
      />

      {/* Password Input */}
      <div className="relative">
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
          value={formData?.password}
          onChange={(e) => handleInputChange('password', e?.target?.value)}
          error={errors?.password}
          required
          className="mb-4"
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 transition-colors"
          tabIndex={-1}
        >
          <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={20} />
        </button>
      </div>

      {/* Remember Me and Forgot Password */}
      <div className="flex items-center justify-between">
        <Checkbox
          label="Remember me"
          checked={formData?.rememberMe}
          onChange={(e) => handleInputChange('rememberMe', e?.target?.checked)}
        />
        <button
          type="button"
          onClick={handleForgotPassword}
          className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
        >
          Forgot Password?
        </button>
      </div>

      {/* Login Button */}
      <Button
        type="submit"
        variant="default"
        fullWidth
        loading={loading || isLoading}
        iconName="LogIn"
        iconPosition="right"
        className="mt-6"
        disabled={loading || isLoading}
      >
        {loading || isLoading ? 'Signing In...' : 'Sign In'}
      </Button>

      {/* Quick Login Buttons */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
          <Icon name="Zap" size={16} className="mr-2" />
          Quick Demo Access
        </h4>
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin('student')}
            className="text-left p-2 rounded bg-white border border-blue-200 hover:bg-blue-50 transition-colors"
          >
            <div className="text-xs font-medium text-blue-800">Student Demo</div>
            <div className="text-xs text-blue-600">student1@testpire.com</div>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('teacher')}
            className="text-left p-2 rounded bg-white border border-blue-200 hover:bg-blue-50 transition-colors"
          >
            <div className="text-xs font-medium text-blue-800">Teacher Demo</div>
            <div className="text-xs text-blue-600">teacher1@testpire.com</div>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('super_admin')}
            className="text-left p-2 rounded bg-white border border-blue-200 hover:bg-blue-50 transition-colors"
          >
            <div className="text-xs font-medium text-blue-800">Admin Demo</div>
            <div className="text-xs text-blue-600">admin@testpire.com</div>
          </button>
        </div>
      </div>

      {/* Demo Credentials Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-800 mb-2 flex items-center">
          <Icon name="Info" size={16} className="mr-2" />
          Demo Credentials
        </h4>
        <div className="space-y-1 text-xs text-gray-600">
          <div>
            <span className="font-medium">Student:</span> student1@testpire.com / student123
          </div>
          <div>
            <span className="font-medium">Teacher:</span> teacher1@testpire.com / teacher123
          </div>
          <div>
            <span className="font-medium">Admin:</span> admin@testpire.com / admin123
          </div>
        </div>
      </div>
    </form>
  );
};

export default LoginForm;