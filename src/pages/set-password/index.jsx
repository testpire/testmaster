import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { newAuthService } from '../../services/newAuthService';
import { getDashboardRoute } from '../../utils/roleBasedRouting';
import AuthShell from '../../components/auth/AuthShell';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const SetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { username, session } = location.state || {};

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Guard: this page is only reachable from the login challenge flow
  if (!username || !session) {
    return (
      <AuthShell
        title="Session expired"
        subtitle="Please sign in again to set your new password."
        footer={<Link to="/login" className="font-medium text-primary hover:underline underline-offset-4">Back to sign in</Link>}
      >
        <Button size="lg" fullWidth onClick={() => navigate('/login')} iconName="ArrowLeft" iconPosition="left">
          Back to sign in
        </Button>
      </AuthShell>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    const { data, error } = await newAuthService.setPassword(username, session, newPassword);
    setLoading(false);
    if (error) {
      setError(error.message || 'Failed to set password');
      return;
    }
    const role = data?.user?.role || data?.role || 'STUDENT';
    navigate(getDashboardRoute(role));
  };

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Welcome! Choose a new password to continue."
      footer={<Link to="/login" className="font-medium text-primary hover:underline underline-offset-4">Back to sign in</Link>}
    >
      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
          <Icon name="AlertCircle" size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="New password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="At least 8 characters"
          disabled={loading}
          autoComplete="new-password"
        />
        <Input
          label="Confirm new password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter new password"
          disabled={loading}
          autoComplete="new-password"
        />
        <Button type="submit" size="lg" fullWidth loading={loading} className="!mt-6">
          {loading ? 'Saving…' : 'Set password & continue'}
        </Button>
      </form>
    </AuthShell>
  );
};

export default SetPassword;
