import React, { useState, useEffect } from 'react';
import { newLeadService } from '../../../services/newLeadService';
import { newBatchService } from '../../../services/newBatchService';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';

// Convert a nurtured lead into an actual student user (POST /leads/{id}/convert).
// enrolledCourseId is the only required input here; yearOfStudy and rollNumber are
// auto-assigned by the backend. The rest is optional student profile data.
const ConvertLeadModal = ({ isOpen, onClose, onSuccess, lead = null, courses = [] }) => {
  const [form, setForm] = useState({
    enrolledCourseId: '',
    enrolledBatchId: '',
    email: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    address: '',
    dateOfBirth: '',
    bloodGroup: '',
    emergencyContact: ''
  });
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Prefill the enrolled course with what the lead was interested in, plus their email.
  useEffect(() => {
    if (!isOpen || !lead) return;
    setForm((prev) => ({
      ...prev,
      enrolledCourseId: lead.interestedCourseId ?? '',
      enrolledBatchId: '',
      email: lead.email || ''
    }));
    setError('');
  }, [isOpen, lead]);

  // Batches are institute-level and independent of the course, so load the full list
  // (the student can be placed into any batch on conversion).
  useEffect(() => {
    if (!isOpen) {
      setBatches([]);
      return;
    }
    let active = true;
    setLoadingBatches(true);
    newBatchService.getAllBatches().then(({ data }) => {
      if (!active) return;
      setBatches(Array.isArray(data) ? data : []);
      setLoadingBatches(false);
    });
    return () => { active = false; };
  }, [isOpen]);

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
    if (form.enrolledBatchId) payload.enrolledBatchId = Number(form.enrolledBatchId);
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

  if (!lead) return null;

  const leadName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'this lead';
  const inputCls =
    'w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Convert to Student"
      description={
        <>
          Enrolling <span className="font-medium text-foreground">{leadName}</span>
          {lead.phone ? ` · ${lead.phone}` : ''}
        </>
      }
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
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
                  onChange={(e) =>
                    // Changing course invalidates any previously chosen batch.
                    setForm((prev) => ({
                      ...prev,
                      enrolledCourseId: e.target.value,
                      enrolledBatchId: ''
                    }))
                  }
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
                <label className="block text-sm font-medium text-foreground mb-1">Batch</label>
                <select
                  value={form.enrolledBatchId}
                  onChange={(e) => setField('enrolledBatchId', e.target.value)}
                  disabled={loading || loadingBatches}
                  className={inputCls}
                >
                  <option value="">
                    {loadingBatches
                      ? 'Loading batches...'
                      : batches.length === 0
                      ? 'No batches yet'
                      : '— No batch —'}
                  </option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}{b.code ? ` (${b.code})` : ''}
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

          <div className="pt-4 border-t border-border flex items-center justify-end space-x-3">
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
    </Modal>
  );
};

export default ConvertLeadModal;
