import React, { useState, useEffect } from 'react';
import { newUserService } from '../../../services/newUserService';
import { newInstituteService } from '../../../services/newInstituteService';
import { courseService } from '../../../services/courseService';
import { newBatchService } from '../../../services/newBatchService';
import { CLASS_OPTIONS } from '../../../utils/classOptions';
import StudentEnrollmentFields from '../../../components/enrollment/StudentEnrollmentFields';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';
import { cn } from '../../../utils/cn';

// ---- Small presentational helpers ---------------------------------------
// These keep the form markup declarative and consistent with the app's design
// tokens (border-input, ring, foreground, …) instead of repeating inline styles.

const FIELD_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const FieldLabel = ({ htmlFor, required, children }) => (
  <label htmlFor={htmlFor} className="text-sm font-medium leading-none text-foreground">
    {children}
    {required && <span className="text-destructive ml-1">*</span>}
  </label>
);

const SelectField = ({ label, required, className, children, ...props }) => (
  <div className="space-y-2">
    {label && <FieldLabel required={required}>{label}</FieldLabel>}
    <select className={cn(FIELD_CLASS, className)} {...props}>
      {children}
    </select>
  </div>
);

const TextareaField = ({ label, required, rows = 3, className, ...props }) => (
  <div className="space-y-2">
    {label && <FieldLabel required={required}>{label}</FieldLabel>}
    <textarea
      rows={rows}
      className={cn(
        'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y',
        className
      )}
      {...props}
    />
  </div>
);

// A titled group of fields with an icon badge. Sections after the first are
// separated by a subtle divider (handled by the parent container).
const Section = ({ icon, title, description, children }) => (
  <section className="space-y-4">
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-foreground leading-tight">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
    {children}
  </section>
);

// Responsive two-column grid that collapses to one column on narrow screens.
const TwoCol = ({ children }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
);

const FORM_ID = 'create-user-form';

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
    // Decoupled assignment: independent sets of course ids and batch ids.
    courseIds: [],
    batchIds: []
  });
  const [institutes, setInstitutes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingInstitutes, setLoadingInstitutes] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [error, setError] = useState('');

  // Load institutes when modal opens
  useEffect(() => {
    if (isOpen) {
      loadInstitutes();
    }
  }, [isOpen]);

  // Load courses + batches for the student assignment dropdowns (only needed for students)
  useEffect(() => {
    if (isOpen && userRole === 'STUDENT') {
      loadCourses();
      loadBatches();
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
        // Hydrate the independent course / batch sets from the student's response DTOs
        // (courseEnrollments[] / batchMemberships[]).
        courseIds: Array.isArray(existingUser.courseEnrollments)
          ? existingUser.courseEnrollments.map((en) => en.courseId).filter((id) => id != null)
          : [],
        batchIds: Array.isArray(existingUser.batchMemberships)
          ? existingUser.batchMemberships.map((m) => m.batchId).filter((id) => id != null)
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
        courseIds: [],
        batchIds: []
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

  const loadBatches = async () => {
    setLoadingBatches(true);
    try {
      // Batches are scoped to the active institute via the apiClient interceptor.
      const { data, error } = await newBatchService.getAllBatches();
      setBatches(!error && Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load batches:', err);
      setBatches([]);
    } finally {
      setLoadingBatches(false);
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
        const courseIds = (formData.courseIds || []).map(Number).filter((n) => !Number.isNaN(n));
        const batchIds = (formData.batchIds || []).map(Number).filter((n) => !Number.isNaN(n));
        // Keep the legacy single `course` string in sync with the first selected course
        // so screens that still read student.course keep working.
        const firstCourseName = courses.find((c) => Number(c.id) === courseIds[0])?.name;
        Object.assign(userData, {
          course: firstCourseName || formData.course || '',
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
          courseIds,
          batchIds
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
          courseIds: [],
          batchIds: []
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

  // ---- Derived display values -------------------------------------------
  const roleWord =
    userRole === 'TEACHER' ? 'Teacher' :
    userRole === 'INST_ADMIN' ? 'Institute Admin' :
    'Student';

  // Email / username / password are only editable while creating a teacher or
  // student (they're immutable account credentials once provisioned).
  const hideAccountFields = (userRole === 'TEACHER' || userRole === 'STUDENT') && editMode;

  // Submit button colour follows the role accent used elsewhere in the app.
  const submitVariant =
    userRole === 'TEACHER' ? 'success' :
    userRole === 'INST_ADMIN' ? 'warning' :
    'default';

  const modalTitle = `${editMode ? 'Edit' : 'Create New'} ${roleWord}`;
  const modalDescription = editMode
    ? `Update the ${roleWord.toLowerCase()}'s details below.`
    : `Fill in the details to add a new ${roleWord.toLowerCase()}.`;

  const footer = (
    <>
      <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button type="submit" form={FORM_ID} variant={submitVariant} loading={loading} disabled={loading}>
        {editMode ? `Update ${roleWord}` : `Create ${roleWord}`}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      description={modalDescription}
      size={userRole === 'STUDENT' ? 'xl' : 'lg'}
      footer={footer}
    >
      <form
        id={FORM_ID}
        onSubmit={handleSubmit}
        className="[&>section+section]:mt-6 [&>section+section]:border-t [&>section+section]:border-border [&>section+section]:pt-6"
      >
        {/* ---- Basic information (all roles) ---- */}
        <Section icon="User" title="Basic Information">
          <TwoCol>
            <Input
              label="First Name"
              required
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              placeholder="First name"
              disabled={loading}
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              placeholder="Last name"
              disabled={loading}
            />
          </TwoCol>

          {!hideAccountFields && (
            <TwoCol>
              <Input
                type="email"
                label="Email Address"
                required
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="email@example.com"
                disabled={loading}
              />
              <Input
                label="Username"
                description="Leave blank to use email"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="Optional"
                disabled={loading}
              />
            </TwoCol>
          )}

          <TwoCol>
            <Input
              type="tel"
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Phone number"
              disabled={loading}
            />

            {/* Institute */}
            <div className="space-y-2">
              <FieldLabel required>Institute</FieldLabel>
              {defaultInstituteId ? (
                <div className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-border bg-muted px-3 text-sm text-foreground">
                  <span className="truncate">
                    {(() => {
                      if (defaultInstitute && defaultInstitute.name) {
                        return `${defaultInstitute.name} (${defaultInstitute.code || defaultInstitute.instituteCode || 'N/A'})`;
                      }
                      const selectedInstitute = institutes.find((inst) => inst.id === formData.instituteId);
                      return selectedInstitute
                        ? `${selectedInstitute.name} (${selectedInstitute.code})`
                        : loadingInstitutes ? 'Loading institute...' : 'Institute Auto-Selected';
                    })()}
                  </span>
                  <span className="flex-shrink-0 text-xs text-muted-foreground">Auto-assigned</span>
                </div>
              ) : (
                <select
                  value={formData.instituteId}
                  onChange={(e) => handleInputChange('instituteId', e.target.value)}
                  className={FIELD_CLASS}
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
          </TwoCol>

          {!hideAccountFields && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="cu-password" required>Password</FieldLabel>
                <button
                  type="button"
                  onClick={generatePassword}
                  disabled={loading}
                  className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                >
                  Generate
                </button>
              </div>
              <input
                id="cu-password"
                type="text"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={FIELD_CLASS}
                placeholder="Password"
                disabled={loading}
              />
            </div>
          )}
        </Section>

        {/* ---- Teacher-specific ---- */}
        {userRole === 'TEACHER' && (
          <Section icon="Briefcase" title="Professional Details">
            <TwoCol>
              <Input
                label="Department"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                placeholder="Department"
                disabled={loading}
              />
              <Input
                label="Subject"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Subject"
                disabled={loading}
              />
            </TwoCol>

            <TwoCol>
              <Input
                label="Qualification"
                value={formData.qualification}
                onChange={(e) => handleInputChange('qualification', e.target.value)}
                placeholder="e.g., M.Sc., B.Tech."
                disabled={loading}
              />
              <Input
                type="number"
                label="Experience (years)"
                min="0"
                value={formData.experienceYears}
                onChange={(e) => handleInputChange('experienceYears', parseInt(e.target.value) || 0)}
                placeholder="0"
                disabled={loading}
              />
            </TwoCol>

            <Input
              label="Specialization"
              value={formData.specialization}
              onChange={(e) => handleInputChange('specialization', e.target.value)}
              placeholder="Area of specialization"
              disabled={loading}
            />

            <TextareaField
              label="Bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Brief bio or introduction"
              disabled={loading}
            />
          </Section>
        )}

        {/* ---- Student-specific ---- */}
        {userRole === 'STUDENT' && (
          <>
            <Section icon="GraduationCap" title="Academic Information">
              <TwoCol>
                <SelectField
                  label="Current Class"
                  value={formData.currentClass}
                  onChange={(e) =>
                    handleInputChange('currentClass', e.target.value === '' ? '' : parseInt(e.target.value, 10))
                  }
                  disabled={loading}
                >
                  <option value="">Select class</option>
                  {CLASS_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </SelectField>
                <Input
                  label="Roll Number"
                  value={formData.rollNumber}
                  onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                  placeholder="Student roll number"
                  disabled={loading}
                />
              </TwoCol>
            </Section>

            <Section
              icon="BookOpen"
              title="Courses & Batches"
              description="A student may be enrolled in multiple courses and batches."
            >
              <StudentEnrollmentFields
                courses={courses}
                batches={batches}
                loadingCourses={loadingCourses}
                loadingBatches={loadingBatches}
                value={{ courseIds: formData.courseIds, batchIds: formData.batchIds }}
                onChange={({ courseIds, batchIds }) => {
                  handleInputChange('courseIds', courseIds);
                  handleInputChange('batchIds', batchIds);
                }}
                disabled={loading}
              />
            </Section>

            <Section icon="Users" title="Parent / Guardian">
              <TwoCol>
                <Input
                  label="Parent Name"
                  value={formData.parentName}
                  onChange={(e) => handleInputChange('parentName', e.target.value)}
                  placeholder="Parent/Guardian name"
                  disabled={loading}
                />
                <Input
                  type="tel"
                  label="Parent Phone"
                  value={formData.parentPhone}
                  onChange={(e) => handleInputChange('parentPhone', e.target.value)}
                  placeholder="Parent phone number"
                  disabled={loading}
                />
              </TwoCol>
              <Input
                type="email"
                label="Parent Email"
                value={formData.parentEmail}
                onChange={(e) => handleInputChange('parentEmail', e.target.value)}
                placeholder="parent@email.com"
                disabled={loading}
              />
            </Section>

            <Section icon="IdCard" title="Personal Information">
              <TwoCol>
                <Input
                  type="date"
                  label="Date of Birth"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  disabled={loading}
                />
                <SelectField
                  label="Blood Group"
                  value={formData.bloodGroup}
                  onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
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
                </SelectField>
              </TwoCol>

              <TextareaField
                label="Address"
                rows={2}
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Full address"
                disabled={loading}
              />

              <Input
                type="tel"
                label="Emergency Contact"
                value={formData.emergencyContact}
                onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                placeholder="Emergency contact number"
                disabled={loading}
              />
            </Section>
          </>
        )}

        {/* ---- Status (edit only, teacher + student) ---- */}
        {editMode && (userRole === 'TEACHER' || userRole === 'STUDENT') && (
          <Section icon="ToggleRight" title="Account Status">
            <Checkbox
              label={`Active ${roleWord} Account`}
              description="Inactive accounts cannot sign in."
              checked={formData.enabled}
              onChange={(e) => handleInputChange('enabled', e.target.checked)}
              disabled={loading}
            />
          </Section>
        )}

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <Icon name="AlertCircle" size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default CreateUserModal;
