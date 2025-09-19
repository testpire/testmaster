import React, { useState, useEffect } from 'react';
import { newUserService } from '../../../services/newUserService';

const UserActionModal = ({ isOpen, onClose, user, institutes, actionType, onSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phone: '',
    instituteId: '',
    role: ''
  });
  const [selectedInstituteId, setSelectedInstituteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize form data when user or modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        username: user.username || '',
        phone: user.phone || '',
        instituteId: user.instituteId || '',
        role: user.role || ''
      });
      setSelectedInstituteId(user.instituteId || '');
      setError('');
    }
  }, [isOpen, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      let message;

      switch (actionType) {
        case 'edit':
          // Validate required fields
          if (!formData.firstName.trim() || !formData.email.trim()) {
            setError('First name and email are required');
            setLoading(false);
            return;
          }

          const updateData = {
            ...formData,
            fullName: `${formData.firstName} ${formData.lastName}`.trim()
          };

          result = await newUserService.updateUserProfile(user.id, updateData);
          message = 'User updated successfully';
          break;

        case 'move':
          if (!selectedInstituteId) {
            setError('Please select an institute');
            setLoading(false);
            return;
          }

          result = await newUserService.updateUserProfile(user.id, { 
            instituteId: selectedInstituteId 
          });
          message = 'User moved to new institute successfully';
          break;

        case 'delete':
          result = await newUserService.deleteUser(user.id);
          message = 'User deleted successfully';
          break;

        default:
          setError('Unknown action type');
          setLoading(false);
          return;
      }

      if (result.error) {
        setError(result.error.message || `Failed to ${actionType} user`);
      } else {
        onSuccess(message);
      }
    } catch (err) {
      console.error(`Error during ${actionType}:`, err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  if (!isOpen || !user) return null;

  const getModalTitle = () => {
    switch (actionType) {
      case 'edit': return `Edit ${user.role === 'TEACHER' ? 'Teacher' : 'Student'}`;
      case 'move': return `Move ${user.role === 'TEACHER' ? 'Teacher' : 'Student'}`;
      case 'delete': return `Delete ${user.role === 'TEACHER' ? 'Teacher' : 'Student'}`;
      default: return 'User Action';
    }
  };

  const getActionButtonText = () => {
    if (loading) {
      switch (actionType) {
        case 'edit': return 'Updating...';
        case 'move': return 'Moving...';
        case 'delete': return 'Deleting...';
        default: return 'Processing...';
      }
    }
    switch (actionType) {
      case 'edit': return 'Update User';
      case 'move': return 'Move User';
      case 'delete': return 'Delete User';
      default: return 'Confirm';
    }
  };

  const getActionButtonColor = () => {
    if (loading) return '#9ca3af';
    switch (actionType) {
      case 'edit': return '#3b82f6';
      case 'move': return '#059669';
      case 'delete': return '#dc2626';
      default: return '#3b82f6';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: actionType === 'delete' ? '400px' : '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#111827',
            margin: 0
          }}>
            {getModalTitle()}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {actionType === 'delete' ? (
            // Delete Confirmation
            <div style={{ textAlign: 'center' }}>
              <div style={{
                backgroundColor: '#fef2f2',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <p style={{ 
                  fontSize: '1rem',
                  color: '#dc2626',
                  margin: '0 0 12px 0',
                  fontWeight: '500'
                }}>
                  Are you sure you want to delete this user?
                </p>
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: '#6b7280',
                  margin: 0
                }}>
                  <strong>{user.firstName} {user.lastName}</strong><br />
                  {user.email}<br />
                  {user.role}
                </p>
              </div>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginBottom: '20px'
              }}>
                This action cannot be undone. All user data will be permanently removed.
              </p>
            </div>
          ) : actionType === 'move' ? (
            // Move Institute Selection
            <div>
              <div style={{ marginBottom: '20px' }}>
                <p style={{ 
                  fontSize: '1rem',
                  color: '#374151',
                  margin: '0 0 12px 0'
                }}>
                  Moving: <strong>{user.firstName} {user.lastName}</strong>
                </p>
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: '#6b7280',
                  margin: '0 0 20px 0'
                }}>
                  {user.email} ({user.role})
                </p>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Select New Institute *
                </label>
                <select
                  value={selectedInstituteId}
                  onChange={(e) => setSelectedInstituteId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                  disabled={loading}
                >
                  <option value="">Select an institute</option>
                  {institutes.filter(inst => inst.id !== user.instituteId).map((institute) => (
                    <option key={institute.id} value={institute.id}>
                      {institute.name} ({institute.code || institute.instituteCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            // Edit Form
            <div style={{ display: 'grid', gap: '20px' }}>
              {/* Name Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                    placeholder="First name"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Last name"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                  placeholder="email@example.com"
                  disabled={loading}
                />
              </div>

              {/* Username */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Username"
                  disabled={loading}
                />
              </div>

              {/* Phone */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Phone number"
                  disabled={loading}
                />
              </div>

              {/* Role (read-only) */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Role
                </label>
                <input
                  type="text"
                  value={formData.role}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    backgroundColor: '#f9fafb',
                    color: '#6b7280'
                  }}
                  disabled
                />
              </div>
            </div>
          )}

          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '0.875rem',
              marginTop: '20px'
            }}>
              {error}
            </div>
          )}

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '24px'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: getActionButtonColor(),
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {getActionButtonText()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserActionModal;
