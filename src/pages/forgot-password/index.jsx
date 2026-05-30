import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { newAuthService } from '../../services/newAuthService';

// Shared inline styles to match simple-login / simple-signup aesthetic
const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    fontFamily: 'Arial, sans-serif',
  },
  card: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '400px',
    margin: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  primaryBtn: (disabled) => ({
    width: '100%',
    padding: '0.75rem',
    backgroundColor: disabled ? '#9ca3af' : '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background-color 0.2s',
  }),
  errorBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '0.75rem',
    borderRadius: '6px',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#16a34a',
    padding: '0.75rem',
    borderRadius: '6px',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
  link: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: '500',
  },
};

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
    const { error } = await newAuthService.confirmForgotPassword(
      username.trim(),
      code.trim(),
      newPassword
    );
    setLoading(false);
    if (error) {
      setError(error.message || 'Failed to reset password');
      return;
    }
    navigate('/login', {
      state: { message: 'Password reset successful. Please sign in.' },
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', margin: '0 0 0.5rem 0' }}>
            Reset Password
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            {step === 1
              ? 'Enter your username to receive a reset code'
              : 'Enter the code from your email and a new password'}
          </p>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}
        {info && <div style={styles.successBox}>{info}</div>}

        {step === 1 ? (
          <form onSubmit={requestCode}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={styles.label}>Username / Email</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
                placeholder="Enter your username or email"
                disabled={loading}
              />
            </div>
            <button type="submit" disabled={loading} style={styles.primaryBtn(loading)}>
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={confirmReset}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={styles.label}>Confirmation Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={styles.input}
                placeholder="Enter the code from your email"
                disabled={loading}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={styles.label}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={styles.input}
                placeholder="At least 8 characters"
                disabled={loading}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={styles.label}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={styles.input}
                placeholder="Re-enter new password"
                disabled={loading}
              />
            </div>
            <button type="submit" disabled={loading} style={styles.primaryBtn(loading)}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <button
              type="button"
              onClick={() => { setStep(1); setError(''); setInfo(''); }}
              style={{
                width: '100%',
                marginTop: '0.75rem',
                padding: '0.75rem',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          </form>
        )}

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
          <Link to="/login" style={styles.link}>Back to sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
