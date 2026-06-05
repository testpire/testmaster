import React, { useState, useEffect } from 'react';
import { newLeadService } from '../../../services/newLeadService';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

// Convert a nurtured lead into an actual student user (POST /leads/{id}/convert).
// enrolledCourseId is the only required input here; yearOfStudy and rollNumber are
// auto-assigned by the backend. The rest is optional student profile data.
const ConvertLeadModal = ({ isOpen, onClose, onSuccess, lead = null, courses = [] }) => {
  const [form, setForm] = useState({
    enrolledCourseId: '',
    email: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    address: '',
    dateOfBirth: '',
    bloodGroup: '',
    emergencyContact: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Prefill the enrolled course with what the lead was interested in, plus their email.
  useEffect(() => {
    if (!isOpen || !lead) return;
    setForm((prev) => ({
      ...prev,
      enrolledCourseId: lead.interestedCourseId ?? '',
      email: lead.email || ''
    }));
    setError('');
  }, [isOpen, lead]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.enrolledCourseId) {
      setError('Enrolled course is required');
      return;
    }

    // yearOfStudy and rollNumber are auto-assigned by the backend on conversion.
    const payload = {
      enrolledCourseId: Number(form.enrolledCourseId)
    };
    if (form.email.trim()) payload.email = form.email.trim();
    if (form.parentName.trim()) payload.parentName = form.parentName.trim();
    if (form.parentPhone.trim()) payload.parentPhone = form.parentPhone.trim();
    if (form.parentEmail.trim()) payload.parentEmail = form.parentEmail.trim();
    if (form.address.trim()) payload.address = form.address.trim();
    if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
    if (form.bloodGroup.trim()) payload.bloodGroup = form.bloodGroup.trim();
    if (form.emergencyContact.trim()) payload.emergencyContact = form.emergencyContact.trim();

    try {
      setLoading(true);
      const { error: convertError } = await newLeadService.convertLead(lead.id, payload);
      if (convertError) {
        setError(convertError.message || 'Failed to convert lead');
        return;
      }
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !lead) return null;

  const leadName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'this lead';
  const inputCls =
    'w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50';

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg border border-border shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Convert to Student</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enrolling <span className="font-medium text-foreground">{leadName}</span>
              {lead.phone ? ` · ${lead.phone}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Icon name="X" size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[65vh] overflow-y-auto space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center space-x-2">
                <Icon name="AlertCircle" size={16} className="text-destructive" />
                <p className="text-destructive text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Enrolled Course <span className="text-destructive">*</span>
                </label>
                <select
                  value={form.enrolledCourseId}
                  onChange={(e) => setField('enrolledCourseId', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                >
                  <option value="">— Select course —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setField('dateOfBirth', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Blood Group</label>
                <input
                  type="text"
                  value={form.bloodGroup}
                  onChange={(e) => setField('bloodGroup', e.target.value)}
                  disabled={loading}
                  placeholder="e.g. O+"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Parent Name</label>
                <input
                  type="text"
                  value={form.parentName}
                  onChange={(e) => setField('parentName', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Parent Phone</label>
                <input
                  type="tel"
                  value={form.parentPhone}
                  onChange={(e) => setField('parentPhone', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Parent Email</label>
                <input
                  type="email"
                  value={form.parentEmail}
                  onChange={(e) => setField('parentEmail', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  value={form.emergencyContact}
                  onChange={(e) => setField('emergencyContact', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Address</label>
              <textarea
                rows={2}
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
                disabled={loading}
                className={inputCls}
              />
            </div>
          </div>

          <div className="p-6 border-t border-border flex items-center justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              iconName={loading ? 'Loader2' : 'UserCheck'}
              iconPosition="left"
              className={loading ? 'animate-pulse' : ''}
            >
              {loading ? 'Converting...' : 'Convert to Student'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConvertLeadModal;
