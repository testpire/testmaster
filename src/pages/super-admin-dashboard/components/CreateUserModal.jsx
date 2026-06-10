import React, { useState, useEffect } from 'react';
import { newUserService } from '../../../services/newUserService';
import { newInstituteService } from '../../../services/newInstituteService';
import { courseService } from '../../../services/courseService';
import { CLASS_OPTIONS } from '../../../utils/classOptions';
import EnrollmentEditor, { toEnrollmentPayload } from '../../../components/enrollment/EnrollmentEditor';
import Modal from '../../../components/ui/Modal';

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
    currentClass: '',
    rollNumber: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    address: '',
    dateOfBirth: '',
    bloodGroup: '',
    emergencyContact: '',
    // Multi-enrollment: rows of { courseId, batchId, courseName?, batchName? }
    enrollments: []
  });
  const [institutes, setInstitutes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingInstitutes, setLoadingInstitutes] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [error, setError] = useState('');

  // Load institutes when modal opens
  useEffect(() => {
    if (isOpen) {
      loadInstitutes();
    }
  }, [isOpen]);

  // Load courses for the student course dropdown (only needed for students)
  useEffect(() => {
    if (isOpen && userRole === 'STUDENT') {
      loadCourses();
    }
  }, [isOpen, userRole]);

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
        currentClass: existingUser.currentClass || '',
        rollNumber: existingUser.rollNumber || '',
        parentName: existingUser.parentName || '',
        parentPhone: existingUser.parentPhone || '',
        parentEmail: existingUser.parentEmail || '',
        address: existingUser.address || '',
        dateOfBirth: existingUser.dateOfBirth ? existingUser.dateOfBirth.split('T')[0] : '', // Format for date input
        bloodGroup: existingUser.bloodGroup || '',
        emergencyContact: existingUser.emergencyContact || '',
        // Hydrate enrollments from the student's EnrollmentResponseDto[] (carries names too).
        enrollments: Array.isArray(existingUser.enrollments)
          ? existingUser.enrollments.map((en) => ({
              courseId: en.courseId ?? '',
              batchId: en.batchId ?? '',
              courseName: en.courseName,
              batchName: en.batchName
            }))
          : []
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
        currentClass: '',
        rollNumber: '',
        parentName: '',
        parentPhone: '',
        parentEmail: '',
        address: '',
        dateOfBirth: '',
        bloodGroup: '',
        emergencyContact: '',
        enrollments: []
      }));
    }
  }, [defaultInstituteId, userRole, defaultInstitute, isOpen, editMode, existingUser]);

  const loadInstitutes = async () => {
    setLoadingInstitutes(true);
    try {
      const { data, pagination, error } = await newInstituteService.getInstitutes();
      if (data && !error) {
        setInstitutes(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to load institutes:', error);
        setInstitutes([]);
      }
    } catch (err) {
      console.error('Failed to load institutes:', err);
      setInstitutes([]);
    } finally {
      setLoadingInstitutes(false);
    }
  };

  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      // Courses are scoped to the active institute via the apiClient interceptor.
      const { data, error } = await courseService.getCourses({ page: 0, size: 100 });
      setCourses(!error && Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load courses:', err);
      setCourses([]);
    } finally {
      setLoadingCourses(false);
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

      // Carry role-specific fields through to the API. Without this the student
      // course/roll/parent details (and teacher details) were silently dropped on
      // both create and edit.
      if (formData.role === 'STUDENT') {
        const enrollments = toEnrollmentPayload(formData.enrollments);
        Object.assign(userData, {
          // Keep the legacy single `course` string in sync with the first enrollment
          // so screens that still read student.course keep working.
          course: formData.enrollments?.[0]?.courseName || formData.course || '',
          currentClass: formData.currentClass,
          rollNumber: formData.rollNumber,
          parentName: formData.parentName,
          parentPhone: formData.parentPhone,
          parentEmail: formData.parentEmail,
          address: formData.address,
          dateOfBirth: formData.dateOfBirth,
          bloodGroup: formData.bloodGroup,
          emergencyContact: formData.emergencyContact,
          enabled: formData.enabled,
          enrollments
        });
      } else if (formData.role === 'TEACHER') {
        Object.assign(userData, {
          department: formData.department,
          subject: formData.subject,
          qualification: formData.qualification,
          experienceYears: formData.experienceYears,
          specialization: formData.specialization,
          bio: formData.bio,
          enabled: formData.enabled
        });
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
          currentClass: '',
          rollNumber: '',
          parentName: '',
          parentPhone: '',
          parentEmail: '',
          address: '',
          dateOfBirth: '',
          bloodGroup: '',
          emergencyContact: '',
          enrollments: []
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

  const modalTitle = editMode
    ? (userRole === 'TEACHER' ? 'Edit Teacher' :
       userRole === 'INST_ADMIN' ? 'Edit Institute Admin' :
       'Edit Student')
    : (userRole === 'TEACHER' ? 'Create New Teacher' :
       userRole === 'INST_ADMIN' ? 'Create New Institute Admin' :
       'Create New Student');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg">
        {/* Form */}
        <form onSubmit={handleSubmit}>
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
                {/* Current Class */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '6px'
                    }}>
                      Current Class
                    </label>
                    <select
                      value={formData.currentClass}
                      onChange={(e) => handleInputChange('currentClass', e.target.value === '' ? '' : parseInt(e.target.value, 10))}
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
                      <option value="">Select class</option>
                      {CLASS_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Courses & Batches enrollment editor (a student may be enrolled in many) */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Courses & Batches
                  </label>
                  {loadingCourses ? (
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Loading courses...</p>
                  ) : (
                    <EnrollmentEditor
                      courses={courses}
                      value={formData.enrollments}
                      onChange={(rows) => handleInputChange('enrollments', rows)}
                      disabled={loading}
                    />
                  )}
                </div>

                {/* Roll Number */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
    </Modal>
  );
};

export default CreateUserModal;

