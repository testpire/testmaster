import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { getDashboardRoute, getRoleDisplayName } from '../../utils/roleBasedRouting';
import AuthShell from '../../components/auth/AuthShell';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const SimpleLogin = () => {
  const { signIn, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const notice = location.state?.message || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    try {
      const { data, error, challenge } = await signIn(credentials.username, credentials.password);
      if (error) {
        setError(error.message || 'Login failed');
      } else if (challenge) {
        // First-login: Cognito requires the user to set a new password
        navigate('/set-password', {
          state: { username: challenge.username, session: challenge.session },
        });
      } else {
        const userRole = data?.user?.role || data?.profile?.role || data?.role || 'STUDENT';
        const dashboardRoute = getDashboardRoute(userRole);
        const roleName = getRoleDisplayName(userRole);
        console.log('🚀 Login successful! User:', data?.user?.firstName || data?.profile?.firstName || 'Unknown', 'Role:', userRole, 'Redirecting to:', dashboardRoute);
        if (userRole !== 'STUDENT') console.log(`✅ Welcome ${roleName}!`);
        navigate(dashboardRoute);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  const handleInputChange = (field, value) => {
    setCredentials((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue to your learning space."
      footer={
        <>
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline underline-offset-4">
            Sign up
          </Link>
        </>
      }
    >
      {notice && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-success/30 bg-success/10 p-3.5 text-sm text-foreground">
          <Icon name="CheckCircle2" size={16} className="mt-0.5 flex-shrink-0 text-success" />
          <span>{notice}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Username"
          type="text"
          value={credentials.username}
          onChange={(e) => handleInputChange('username', e.target.value)}
          placeholder="Enter your username"
          disabled={loading}
          autoComplete="username"
        />
        <div>
          <Input
            label="Password"
            type="password"
            value={credentials.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="Enter your password"
            disabled={loading}
            autoComplete="current-password"
          />
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
              Forgot password?
            </Link>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
            <Icon name="AlertCircle" size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" size="lg" fullWidth loading={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  );
};

export default SimpleLogin;
