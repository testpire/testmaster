import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { newInstituteService } from '../../services/newInstituteService';
import AuthShell from '../../components/auth/AuthShell';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const SimpleSignup = () => {
  const { signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    password: '',
    confirmPassword: '',
    instituteCode: '',
  });
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone_number.trim() || !formData.password.trim() || !formData.instituteCode.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setResolving(true);
      const { data: instituteData, error: instituteError } = await newInstituteService.getInstituteByCode(formData.instituteCode.trim());
      setResolving(false);

      if (instituteError || !instituteData) {
        setError('Invalid institute code. Please check with your institute and try again.');
        return;
      }

      const institute = instituteData.data || instituteData;
      const resolvedInstituteId = institute.id;
      if (!resolvedInstituteId) {
        setError('Could not resolve institute. Please contact support.');
        return;
      }

      const userData = {
        name: formData.name,
        username: formData.email,
        phone_number: formData.phone_number,
        role: 'STUDENT',
        instituteId: resolvedInstituteId,
      };

      const { error } = await signUp(formData.email, formData.password, userData);
      if (error) {
        setError(error.message || 'Registration failed');
      } else {
        navigate('/login');
      }
    } catch (err) {
      setResolving(false);
      setError('An unexpected error occurred');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const isSubmitting = loading || resolving;

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join your institute and start learning."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full name"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Enter your name"
          disabled={isSubmitting}
          autoComplete="name"
        />
        <Input
          label="Email address"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="Enter your email"
          disabled={isSubmitting}
          autoComplete="email"
        />
        <Input
          label="Phone number"
          type="tel"
          value={formData.phone_number}
          onChange={(e) => handleInputChange('phone_number', e.target.value)}
          placeholder="Enter your phone number"
          disabled={isSubmitting}
          autoComplete="tel"
        />
        <Input
          label="Institute code"
          required
          type="text"
          value={formData.instituteCode}
          onChange={(e) => handleInputChange('instituteCode', e.target.value)}
          placeholder="e.g. ACME2024"
          disabled={isSubmitting}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="Min 6 characters"
            disabled={isSubmitting}
            autoComplete="new-password"
          />
          <Input
            label="Confirm password"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            placeholder="Re-enter password"
            disabled={isSubmitting}
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
            <Icon name="AlertCircle" size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" size="lg" fullWidth loading={isSubmitting} className="!mt-6">
          {resolving ? 'Verifying institute…' : loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  );
};

export default SimpleSignup;
