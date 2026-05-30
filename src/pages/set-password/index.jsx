import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { newAuthService } from '../../services/newAuthService';
import { getDashboardRoute } from '../../utils/roleBasedRouting';

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
  link: { color: '#3b82f6', textDecoration: 'none', fontWeight: '500' },
};

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
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', textAlign: 'center' }}>
            Session expired
          </h1>
          <p style={{ color: '#6b7280', textAlign: 'center', margin: '1rem 0' }}>
            Please sign in again to set your new password.
          </p>
          <div style={{ textAlign: 'center' }}>
            <Link to="/login" style={styles.link}>Back to sign in</Link>
          </div>
        </div>
      </div>
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
    // setPassword stored the token; route to the role dashboard
    const role = data?.user?.role || data?.role || 'STUDENT';
    navigate(getDashboardRoute(role));
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', margin: '0 0 0.5rem 0' }}>
            Set New Password
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Welcome! Please set a new password to continue.
          </p>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
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
            {loading ? 'Saving...' : 'Set Password & Continue'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
          <Link to="/login" style={styles.link}>Back to sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default SetPassword;
