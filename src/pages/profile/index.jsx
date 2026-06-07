import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { newAuthService } from '../../services/newAuthService';
import { newUserService } from '../../services/newUserService';
import { courseService } from '../../services/courseService';
import { CLASS_OPTIONS } from '../../utils/classOptions';
import EnrollmentEditor, { toEnrollmentPayload } from '../../components/enrollment/EnrollmentEditor';

// Editable fields per role (keys map to UpdateStudentRequestDto / UpdateTeacherRequestDto)
const STUDENT_FIELDS = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'rollNumber', label: 'Roll Number' },
  { key: 'currentClass', label: 'Current Class', type: 'select', options: CLASS_OPTIONS },
  { key: 'address', label: 'Address' },
  { key: 'bloodGroup', label: 'Blood Group' },
  { key: 'parentName', label: 'Parent Name' },
  { key: 'parentPhone', label: 'Parent Phone' },
  { key: 'parentEmail', label: 'Parent Email' },
  { key: 'emergencyContact', label: 'Emergency Contact' },
];

const TEACHER_FIELDS = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'department', label: 'Department' },
  { key: 'subject', label: 'Subject' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'experienceYears', label: 'Experience (years)', type: 'number' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'bio', label: 'Bio', type: 'textarea' },
];

const Profile = () => {
  const { user, userProfile } = useAuth();
  const baseProfile = userProfile || user || {};
  const role = (baseProfile.role || '').toUpperCase();
  const isEditable = role === 'STUDENT' || role === 'TEACHER';
  const fields = role === 'TEACHER' ? TEACHER_FIELDS : STUDENT_FIELDS;

  const [form, setForm] = useState({});
  const [enrollments, setEnrollments] = useState([]); // student course+batch rows
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(isEditable);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isStudent = role === 'STUDENT';

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      // Always have the base auth profile as a fallback
      let resolved = baseProfile;
      try {
        const { data } = await newAuthService.getProfile();
        resolved = data?.user || data || baseProfile;
      } catch (_) { /* fall back to context profile */ }

      if (isEditable) {
        const res = role === 'TEACHER'
          ? await newUserService.getMyTeacherProfile()
          : await newUserService.getMyStudentProfile();
        if (res?.data) resolved = { ...resolved, ...res.data };
      }

      // Students manage their own course/batch enrollments — load courses + seed rows.
      if (isStudent) {
        const { data: courseData } = await courseService.getCourses({ page: 0, size: 100 });
        if (mounted) setCourses(Array.isArray(courseData) ? courseData : []);
        const rows = Array.isArray(resolved?.enrollments)
          ? resolved.enrollments.map((en) => ({
              courseId: en.courseId ?? '',
              batchId: en.batchId ?? '',
              courseName: en.courseName,
              batchName: en.batchName
            }))
          : [];
        if (mounted) setEnrollments(rows);
      }

      if (mounted) {
        setForm(resolved || {});
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    // Only send the editable keys for this role
    const payload = {};
    fields.forEach(({ key, type }) => {
      let v = form[key];
      if (v === undefined || v === null || v === '') return;
      if (type === 'number' || type === 'select') v = parseInt(v, 10);
      payload[key] = v;
    });

    // Students persist their course/batch enrollments alongside the profile fields.
    if (isStudent) {
      payload.enrollments = toEnrollmentPayload(enrollments);
    }

    const res = role === 'TEACHER'
      ? await newUserService.updateMyTeacherProfile(payload)
      : await newUserService.updateMyStudentProfile(payload);

    setSaving(false);
    if (res.error) {
      setError(res.error.message || 'Failed to update profile');
      return;
    }
    setSuccess('Profile updated successfully.');
  };

  return (
    <PageLayout title="Profile">
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground">View and manage your account details</p>
        </div>

        {/* Account summary (always read-only) */}
        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon name="User" size={28} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {[baseProfile.firstName, baseProfile.lastName].filter(Boolean).join(' ') || baseProfile.username}
              </h2>
              <p className="text-sm text-muted-foreground">{baseProfile.email || baseProfile.username}</p>
              <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-muted text-foreground">
                {baseProfile.role}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm flex items-center space-x-2">
            <Icon name="AlertCircle" size={16} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm flex items-center space-x-2">
            <Icon name="CheckCircle" size={16} />
            <span>{success}</span>
          </div>
        )}

        {!isEditable ? (
          <div className="bg-card rounded-lg border border-border p-6">
            <p className="text-sm text-muted-foreground">
              Your account details are managed by your administrator. Contact them to update your information.
            </p>
          </div>
        ) : loading ? (
          <div className="bg-card rounded-lg border border-border p-6 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground text-sm">Loading profile...</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map(({ key, label, type, options }) => (
                <div key={key} className={type === 'textarea' ? 'md:col-span-2' : ''}>
                  <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
                  {type === 'textarea' ? (
                    <textarea
                      value={form[key] ?? ''}
                      onChange={(e) => handleChange(key, e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  ) : type === 'select' ? (
                    <select
                      value={form[key] ?? ''}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Select</option>
                      {options.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={type === 'number' ? 'number' : 'text'}
                      value={form[key] ?? ''}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  )}
                </div>
              ))}
            </div>

            {isStudent && (
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground mb-1">My Courses & Batches</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Add the courses you're enrolled in and pick your batch for each.
                </p>
                <EnrollmentEditor
                  courses={courses}
                  value={enrollments}
                  onChange={setEnrollments}
                  disabled={saving}
                />
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Profile;
