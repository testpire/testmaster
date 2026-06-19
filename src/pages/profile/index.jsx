import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { newAuthService } from '../../services/newAuthService';
import { newUserService } from '../../services/newUserService';
import { CLASS_OPTIONS } from '../../utils/classOptions';
import { formatTimetable } from '../../utils/timetable';
import { courseService } from '../../services/courseService';

const STUDENT_FIELDS = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'rollNumber', label: 'Roll Number' },
  { key: 'currentClass', label: 'Current Class' },
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

const CLASS_LABEL = Object.fromEntries(CLASS_OPTIONS.map(({ value, label }) => [String(value), label]));

const Profile = () => {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const baseProfile = userProfile || user || {};
  const role = (baseProfile.role || '').toUpperCase();
  const isStudent = role === 'STUDENT';
  const isTeacher = role === 'TEACHER';

  const [form, setForm] = useState({});
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(isStudent || isTeacher);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Mirror NavigationHeader's logout: clear session, then route to login.
  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      // Redirect regardless — the session is cleared client-side either way.
      navigate('/login', { replace: true });
    }
  };

  useEffect(() => {
    if (!isStudent && !isTeacher) return;
    let mounted = true;
    const load = async () => {
      let resolved = baseProfile;
      try {
        const { data } = await newAuthService.getProfile();
        resolved = data?.user || data || baseProfile;
      } catch (_) { /* fall back to context profile */ }

      const res = isTeacher
        ? await newUserService.getMyTeacherProfile()
        : await newUserService.getMyStudentProfile();
      if (res?.data) resolved = { ...resolved, ...res.data };

      if (isStudent) {
        // Courses and batches are independent now: courseEnrollments[] (with fee) and
        // batchMemberships[] (with timetable). Merge into one display list for the
        // read-only "My Courses & Batches" panel.
        const courseRows = (Array.isArray(resolved?.courseEnrollments) ? resolved.courseEnrollments : [])
          .map((en) => ({ kind: 'course', name: en.courseName || `Course #${en.courseId}`, fee: en.fee }));
        const batchRows = (Array.isArray(resolved?.batchMemberships) ? resolved.batchMemberships : [])
          .map((m) => ({ kind: 'batch', name: m.batchName || `Batch #${m.batchId}`, timetable: m.timetable }));
        if (mounted) setEnrollments([...courseRows, ...batchRows]);

        // Teacher-only: also load courses for the enrollment editor
      } else if (isTeacher) {
        const { data: courseData } = await courseService.getCourses({ page: 0, size: 100 });
        if (mounted) setCourses(Array.isArray(courseData) ? courseData : []);
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
    const fields = TEACHER_FIELDS;
    const payload = {};
    fields.forEach(({ key, type }) => {
      let v = form[key];
      if (v === undefined || v === null || v === '') return;
      if (type === 'number') v = parseInt(v, 10);
      payload[key] = v;
    });
    const res = await newUserService.updateMyTeacherProfile(payload);
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
          <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">My profile</h1>
          <p className="text-muted-foreground mt-1.5">
            {isStudent ? 'Your account details' : 'View and manage your account details'}
          </p>
        </div>

        {/* Account summary (always read-only) */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon name="User" size={28} className="text-primary" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  {[baseProfile.firstName, baseProfile.lastName].filter(Boolean).join(' ') || baseProfile.username}
                </h2>
                <p className="text-sm text-muted-foreground">{baseProfile.email || baseProfile.username}</p>
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-muted text-foreground">
                  {baseProfile.role}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              iconName="LogOut"
              onClick={handleSignOut}
              loading={isSigningOut}
              className="flex-shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
            >
              {isSigningOut ? 'Signing out…' : 'Sign Out'}
            </Button>
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

        {/* Student: view-only profile */}
        {isStudent && (
          loading ? (
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground text-sm">Loading profile...</p>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STUDENT_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
                    <p className="text-sm text-foreground">
                      {key === 'currentClass'
                        ? CLASS_LABEL[String(form[key])] || form[key] || '—'
                        : form[key] || '—'}
                    </p>
                  </div>
                ))}
              </div>

              {enrollments.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-semibold text-foreground mb-3">My Courses &amp; Batches</p>
                  <div className="space-y-2">
                    {enrollments.map((en, i) => {
                      const slots = en.kind === 'batch' ? formatTimetable(en.timetable) : [];
                      return (
                        <div key={i} className="flex items-center flex-wrap gap-x-3 gap-y-1 text-sm text-foreground">
                          <span className="flex items-center gap-2">
                            <Icon name={en.kind === 'batch' ? 'Users' : 'BookOpen'} size={14} className="text-muted-foreground shrink-0" />
                            <span>{en.name}</span>
                          </span>
                          {en.kind === 'course' && en.fee != null && (
                            <span className="text-muted-foreground">· ₹{Number(en.fee).toLocaleString('en-IN')}</span>
                          )}
                          {slots.map((slot, si) => (
                            <span key={si} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Icon name="Clock" size={12} />{slot}
                            </span>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground pt-2">
                To update your enrollment or profile details, contact your administrator.
              </p>
            </div>
          )
        )}

        {/* Teacher: editable profile */}
        {isTeacher && (
          loading ? (
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground text-sm">Loading profile...</p>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TEACHER_FIELDS.map(({ key, label, type }) => (
                  <div key={key} className={type === 'textarea' ? 'md:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
                    {type === 'textarea' ? (
                      <textarea
                        value={form[key] ?? ''}
                        onChange={(e) => handleChange(key, e.target.value)}
                        rows={3}
                        className="w-full px-3.5 py-2 border border-input rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/70 focus:border-primary transition-colors"
                      />
                    ) : (
                      <input
                        type={type === 'number' ? 'number' : 'text'}
                        value={form[key] ?? ''}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="w-full px-3.5 py-2 border border-input rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/70 focus:border-primary transition-colors"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )
        )}

        {/* Other roles */}
        {!isStudent && !isTeacher && (
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">
              Your account details are managed by your administrator. Contact them to update your information.
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Profile;
