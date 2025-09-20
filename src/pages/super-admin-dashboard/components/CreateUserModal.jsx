import React, { useState, useEffect } from 'react';
import { newUserService } from '../../../services/newUserService';
import { newInstituteService } from '../../../services/newInstituteService';

const CreateUserModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  userRole = 'STUDENT', 
  defaultInstituteId = '',
  defaultInstitute = null,
  editMode = false,
  existingUser = null 
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    phone: '',
    instituteId: defaultInstituteId,
    role: userRole,
    // Teacher-specific fields
    department: '',
    subject: '',
    qualification: '',
    experienceYears: 0,
    specialization: '',
    bio: '',
    enabled: true,
    // Student-specific fields
    course: '',
    yearOfStudy: 1,
    rollNumber: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    address: '',
    dateOfBirth: '',
    bloodGroup: '',
    emergencyContact: ''
  });
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingInstitutes, setLoadingInstitutes] = useState(false);
  const [error, setError] = useState('');

  // Load institutes when modal opens
  useEffect(() => {
    if (isOpen) {
      loadInstitutes();
    }
  }, [isOpen]);

  // Update form data when props change
  useEffect(() => {
    if (editMode && existingUser) {
      // Populate form with existing user data for editing
      setFormData({
        firstName: existingUser.firstName || '',
        lastName: existingUser.lastName || '',
        email: existingUser.email || '',
        username: existingUser.username || '',
        password: '', // Don't populate password for security
        phone: existingUser.phone || '',
        instituteId: existingUser.instituteId || defaultInstituteId,
        role: existingUser.role || userRole,
        // Teacher-specific fields
        department: existingUser.department || '',
        subject: existingUser.subject || '',
        qualification: existingUser.qualification || '',
        experienceYears: existingUser.experienceYears || 0,
        specialization: existingUser.specialization || '',
        bio: existingUser.bio || '',
        enabled: existingUser.enabled !== undefined ? existingUser.enabled : true,
        // Student-specific fields
        course: existingUser.course || '',
        yearOfStudy: existingUser.yearOfStudy || 1,
        rollNumber: existingUser.rollNumber || '',
        parentName: existingUser.parentName || '',
        parentPhone: existingUser.parentPhone || '',
        parentEmail: existingUser.parentEmail || '',
        address: existingUser.address || '',
        dateOfBirth: existingUser.dateOfBirth ? existingUser.dateOfBirth.split('T')[0] : '', // Format for date input
        bloodGroup: existingUser.bloodGroup || '',
        emergencyContact: existingUser.emergencyContact || ''
      });
    } else {
      // Default form for creating new user
      setFormData(prev => ({
        ...prev,
        instituteId: defaultInstituteId,
        role: userRole,
        // Reset teacher-specific fields
        department: '',
        subject: '',
        qualification: '',
        experienceYears: 0,
        specialization: '',
        bio: '',
        enabled: true,
        // Reset student-specific fields
        course: '',
        yearOfStudy: 1,
        rollNumber: '',
        parentName: '',
        parentPhone: '',
        parentEmail: '',
        address: '',
        dateOfBirth: '',
        bloodGroup: '',
        emergencyContact: ''
      }));
    }
  }, [defaultInstituteId, userRole, defaultInstitute, isOpen, editMode, existingUser]);

  const loadInstitutes = async () => {
    setLoadingInstitutes(true);
    try {
      const { data, error } = await newInstituteService.getInstitutes();
      if (data && !error) {
        setInstitutes(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load institutes:', err);
    } finally {
      setLoadingInstitutes(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!formData.firstName.trim() || !formData.email.trim()) {
      setError('First name and email are required');
      setLoading(false);
      return;
    }

    // Password is required for new users, optional for updates
    if (!editMode && !formData.password.trim()) {
      setError('Password is required for new users');
      setLoading(false);
      return;
    }

    if (!formData.instituteId) {
      setError('Please select an institute');
      setLoading(false);
      return;
    }

    try {
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        username: formData.username || formData.email,
        phone: formData.phone,
        instituteId: formData.instituteId,
        role: formData.role
      };

      // Only include password if it's provided (for new users or password changes)
      if (formData.password.trim()) {
        userData.password = formData.password;
      }

      let result;
      if (editMode && existingUser) {
        // Update existing user
        result = await newUserService.updateUser(existingUser.id, userData);
      } else {
        // Create new user
        result = await newUserService.createUserProfile(userData);
      }

      const { data, error } = result;
      if (error) {
        setError(error.message || `Failed to ${editMode ? 'update' : 'create'} ${userRole.toLowerCase()}`);
      } else {
        onSuccess(data);
        onClose();
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          username: '',
          password: '',
          phone: '',
          instituteId: defaultInstituteId,
          role: userRole,
          // Reset teacher-specific fields
          department: '',
          subject: '',
          qualification: '',
          experienceYears: 0,
          specialization: '',
          bio: '',
          enabled: true,
          // Reset student-specific fields
          course: '',
          yearOfStudy: 1,
          rollNumber: '',
          parentName: '',
          parentPhone: '',
          parentEmail: '',
          address: '',
          dateOfBirth: '',
          bloodGroup: '',
          emergencyContact: ''
        });
      }
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(`An unexpected error occurred: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(''); // Clear error when user starts typing
  };

  const generatePassword = () => {
    const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
    handleInputChange('password', password);
  };

  if (!isOpen) {
    return null;
  }

  const modalTitle = editMode 
    ? (userRole === 'TEACHER' ? 'Edit Teacher' : 
       userRole === 'INST_ADMIN' ? 'Edit Institute Admin' : 
       'Edit Student')
    : (userRole === 'TEACHER' ? 'Create New Teacher' : 
       userRole === 'INST_ADMIN' ? 'Create New Institute Admin' : 
       'Create New Student');

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
        maxWidth: '500px',
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
            {modalTitle}
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
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

            {/* Email - not shown for teacher/student updates */}
            {!((userRole === 'TEACHER' || userRole === 'STUDENT') && editMode) && (
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
            )}

            {/* Username - not shown for teacher/student updates */}
            {!((userRole === 'TEACHER' || userRole === 'STUDENT') && editMode) && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Username (optional)
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
                  placeholder="Leave blank to use email"
                  disabled={loading}
                />
              </div>
            )}

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

            {/* Institute Selection */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                Institute *
              </label>
              {defaultInstituteId ? (
                // Show institute name as read-only when defaultInstituteId is provided (for institute admins)
                <div style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  backgroundColor: '#f9fafb',
                  color: '#374151',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>
                    {(() => {
                      // First try to use the defaultInstitute prop if provided
                      if (defaultInstitute && defaultInstitute.name) {
                        return `${defaultInstitute.name} (${defaultInstitute.code || defaultInstitute.instituteCode || 'N/A'})`;
                      }
                      
                      // Fallback to finding in institutes array
                      const selectedInstitute = institutes.find(inst => inst.id === formData.instituteId);
                      return selectedInstitute ? 
                        `${selectedInstitute.name} (${selectedInstitute.code})` : 
                        loadingInstitutes ? 'Loading institute...' : 'Institute Auto-Selected';
                    })()}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    Auto-assigned
                  </span>
                </div>
              ) : (
                // Show dropdown for super admins
                <select
                  value={formData.instituteId}
                  onChange={(e) => handleInputChange('instituteId', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                  disabled={loading || loadingInstitutes}
                >
                  <option value="">
                    {loadingInstitutes ? 'Loading institutes...' : 'Select an institute'}
                  </option>
                  {institutes.map((institute) => (
                    <option key={institute.id} value={institute.id}>
                      {institute.name} ({institute.code})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Password - not shown for teacher/student updates */}
            {!((userRole === 'TEACHER' || userRole === 'STUDENT') && editMode) && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    disabled={loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#3b82f6',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Generate
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Password"
                  disabled={loading}
                />
              </div>
            )}

            {/* Teacher-specific fields */}
            {userRole === 'TEACHER' && (
              <>
                {/* Department */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Department"
                    disabled={loading}
                  />
                </div>

                {/* Subject */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Subject"
                    disabled={loading}
                  />
                </div>

                {/* Qualification and Experience */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '6px'
                    }}>
                      Qualification
                    </label>
                    <input
                      type="text"
                      value={formData.qualification}
                      onChange={(e) => handleInputChange('qualification', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                      placeholder="e.g., M.Sc., B.Tech."
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
                      Experience (years)
                    </label>
                    <input
                      type="number"
                      value={formData.experienceYears}
                      onChange={(e) => handleInputChange('experienceYears', parseInt(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                      placeholder="0"
                      min="0"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Specialization */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Specialization
                  </label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => handleInputChange('specialization', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Area of specialization"
                    disabled={loading}
                  />
                </div>

                {/* Bio */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      boxSizing: 'border-box',
                      minHeight: '80px',
                      resize: 'vertical'
                    }}
                    placeholder="Brief bio or introduction"
                    disabled={loading}
                  />
                </div>

                {/* Enabled/Active Status - only show in edit mode */}
                {editMode && (
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={formData.enabled}
                        onChange={(e) => handleInputChange('enabled', e.target.checked)}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer'
                        }}
                        disabled={loading}
                      />
                      Active Teacher Account
                    </label>
                  </div>
                )}
              </>
            )}

            {/* Student-specific fields */}
            {userRole === 'STUDENT' && (
              <>
                {/* Course and Year of Study */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '6px'
                    }}>
                      Course
                    </label>
                    <input
                      type="text"
                      value={formData.course}
                      onChange={(e) => handleInputChange('course', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                      placeholder="e.g., Computer Science"
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
                      Year of Study
                    </label>
                    <select
                      value={formData.yearOfStudy}
                      onChange={(e) => handleInputChange('yearOfStudy', parseInt(e.target.value))}
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
                      {[1,2,3,4,5,6,7,8,9,10].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Roll Number */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Roll Number
                  </label>
                  <input
                    type="text"
                    value={formData.rollNumber}
                    onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Student roll number"
                    disabled={loading}
                  />
                </div>

                {/* Parent Information */}
                <div>
                  <h4 style={{ 
                    fontSize: '0.95rem', 
                    fontWeight: '600', 
                    color: '#374151', 
                    margin: '0 0 12px 0',
                    paddingTop: '8px' 
                  }}>
                    Parent/Guardian Information
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '6px'
                      }}>
                        Parent Name
                      </label>
                      <input
                        type="text"
                        value={formData.parentName}
                        onChange={(e) => handleInputChange('parentName', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
                        placeholder="Parent/Guardian name"
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
                        Parent Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.parentPhone}
                        onChange={(e) => handleInputChange('parentPhone', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
                        placeholder="Parent phone number"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '6px'
                    }}>
                      Parent Email
                    </label>
                    <input
                      type="email"
                      value={formData.parentEmail}
                      onChange={(e) => handleInputChange('parentEmail', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                      placeholder="parent@email.com"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Personal Information */}
                <div>
                  <h4 style={{ 
                    fontSize: '0.95rem', 
                    fontWeight: '600', 
                    color: '#374151', 
                    margin: '0 0 12px 0',
                    paddingTop: '8px' 
                  }}>
                    Personal Information
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '6px'
                      }}>
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
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
                        Blood Group
                      </label>
                      <select
                        value={formData.bloodGroup}
                        onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
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
                        <option value="">Select blood group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '6px'
                    }}>
                      Address
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        boxSizing: 'border-box',
                        minHeight: '60px',
                        resize: 'vertical'
                      }}
                      placeholder="Full address"
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
                      Emergency Contact
                    </label>
                    <input
                      type="tel"
                      value={formData.emergencyContact}
                      onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                      placeholder="Emergency contact number"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Enabled/Active Status - only show in edit mode */}
                {editMode && (
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={formData.enabled}
                        onChange={(e) => handleInputChange('enabled', e.target.checked)}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer'
                        }}
                        disabled={loading}
                      />
                      Active Student Account
                    </label>
                  </div>
                )}
              </>
            )}

            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}>
                {error}
              </div>
            )}
          </div>

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
                backgroundColor: loading ? '#9ca3af' : userRole === 'TEACHER' ? '#059669' : userRole === 'INST_ADMIN' ? '#f59e0b' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading 
                ? (editMode ? 'Updating...' : 'Creating...') 
                : (editMode 
                    ? `Update ${userRole === 'TEACHER' ? 'Teacher' : userRole === 'INST_ADMIN' ? 'Institute Admin' : 'Student'}` 
                    : `Create ${userRole === 'TEACHER' ? 'Teacher' : userRole === 'INST_ADMIN' ? 'Institute Admin' : 'Student'}`
                  )
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;

