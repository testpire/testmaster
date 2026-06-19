import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { newAuthService } from '../../services/newAuthService';
import AuthShell from '../../components/auth/AuthShell';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: request code, 2: confirm + new password
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const requestCode = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!username.trim()) {
      setError('Please enter your username or email');
      return;
    }
    setLoading(true);
    const { error } = await newAuthService.forgotPassword(username.trim());
    setLoading(false);
    if (error) {
      setError(error.message || 'Failed to send reset code');
      return;
    }
    setInfo('A confirmation code has been sent to your registered email.');
    setStep(2);
  };

  const confirmReset = async (e) => {
    e.preventDefault();
    setError('');
    if (!code.trim()) {
      setError('Please enter the confirmation code');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    const { error } = await newAuthService.confirmForgotPassword(username.trim(), code.trim(), newPassword);
    setLoading(false);
    if (error) {
      setError(error.message || 'Failed to reset password');
      return;
    }
    navigate('/login', { state: { message: 'Password reset successful. Please sign in.' } });
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle={step === 1 ? 'Enter your username to receive a reset code.' : 'Enter the code from your email and a new password.'}
      footer={<Link to="/login" className="font-medium text-primary hover:underline underline-offset-4">Back to sign in</Link>}
    >
      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
          <Icon name="AlertCircle" size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {info && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-success/30 bg-success/10 p-3.5 text-sm text-foreground">
          <Icon name="CheckCircle2" size={16} className="mt-0.5 flex-shrink-0 text-success" />
          <span>{info}</span>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={requestCode} className="space-y-5">
          <Input
            label="Username / Email"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username or email"
            disabled={loading}
          />
          <Button type="submit" size="lg" fullWidth loading={loading}>
            {loading ? 'Sending…' : 'Send reset code'}
          </Button>
        </form>
      ) : (
        <form onSubmit={confirmReset} className="space-y-4">
          <Input
            label="Confirmation code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter the code from your email"
            disabled={loading}
          />
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
            {loading ? 'Resetting…' : 'Reset password'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            fullWidth
            onClick={() => { setStep(1); setError(''); setInfo(''); }}
          >
            Back
          </Button>
        </form>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;
