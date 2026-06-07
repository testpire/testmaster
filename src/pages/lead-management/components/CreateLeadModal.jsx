import React, { useState, useEffect } from 'react';
import { newLeadService } from '../../../services/newLeadService';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { CLASS_OPTIONS } from '../../../utils/classOptions';
import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  LEAD_GENDERS,
  LEAD_BOARDS,
  prettyEnum
} from '../leadConstants';

// Create / edit a lead. Create mode always sends status NEW; the status funnel
// select only appears in edit mode (you advance a lead as you nurture it).
const CreateLeadModal = ({
  isOpen,
  onClose,
  onSuccess,
  editMode = false,
  existingLead = null,
  courses = [],
  defaultInstituteId = null
}) => {
  const emptyForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    school: '',
    currentClass: '',
    board: '',
    courseFeeCommitted: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    source: 'WALK_IN',
    interestedCourseId: '',
    assignedTo: '',
    nextFollowUpDate: '',
    notes: '',
    status: 'NEW'
  };

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Hydrate the form when opening in edit mode (or reset for a fresh create).
  useEffect(() => {
    if (!isOpen) return;
    if (editMode && existingLead) {
      setForm({
        firstName: existingLead.firstName || '',
        lastName: existingLead.lastName || '',
        email: existingLead.email || '',
        phone: existingLead.phone || '',
        gender: existingLead.gender || '',
        school: existingLead.school || '',
        currentClass: existingLead.currentClass ?? '',
        board: existingLead.board || '',
        courseFeeCommitted: existingLead.courseFeeCommitted ?? '',
        parentName: existingLead.parentName || '',
        parentPhone: existingLead.parentPhone || '',
        parentEmail: existingLead.parentEmail || '',
        source: existingLead.source || 'WALK_IN',
        interestedCourseId: existingLead.interestedCourseId ?? '',
        assignedTo: existingLead.assignedTo || '',
        // nextFollowUpDate comes back as ISO; the date input wants yyyy-MM-dd.
        nextFollowUpDate: existingLead.nextFollowUpDate
          ? String(existingLead.nextFollowUpDate).slice(0, 10)
          : '',
        notes: existingLead.notes || '',
        status: existingLead.status || 'NEW'
      });
    } else {
      setForm(emptyForm);
    }
    setError('');
  }, [isOpen, editMode, existingLead]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.firstName.trim()) {
      setError('First name is required');
      return;
    }
    if (!form.phone.trim()) {
      setError('Phone is required');
      return;
    }

    // Build the payload, omitting empty optionals so we don't send blank strings.
    const payload = {
      firstName: form.firstName.trim(),
      phone: form.phone.trim(),
      source: form.source
    };
    if (form.lastName.trim()) payload.lastName = form.lastName.trim();
    if (form.email.trim()) payload.email = form.email.trim();
    if (form.gender) payload.gender = form.gender;
    if (form.school.trim()) payload.school = form.school.trim();
    if (form.currentClass !== '') payload.currentClass = Number(form.currentClass);
    if (form.board) payload.board = form.board;
    if (form.courseFeeCommitted !== '') payload.courseFeeCommitted = Number(form.courseFeeCommitted);
    if (form.parentName.trim()) payload.parentName = form.parentName.trim();
    if (form.parentPhone.trim()) payload.parentPhone = form.parentPhone.trim();
    if (form.parentEmail.trim()) payload.parentEmail = form.parentEmail.trim();
    if (form.interestedCourseId) payload.interestedCourseId = Number(form.interestedCourseId);
    if (form.assignedTo.trim()) payload.assignedTo = form.assignedTo.trim();
    if (form.nextFollowUpDate) payload.nextFollowUpDate = form.nextFollowUpDate;
    if (form.notes.trim()) payload.notes = form.notes.trim();

    if (editMode) {
      payload.status = form.status;
    } else if (defaultInstituteId) {
      // Super-admin acting within a selected institute; otherwise backend reads the JWT.
      payload.instituteId = Number(defaultInstituteId);
    }

    try {
      setLoading(true);
      const { error: saveError } =
        editMode && existingLead
          ? await newLeadService.updateLead(existingLead.id, payload)
          : await newLeadService.createLead(payload);

      if (saveError) {
        setError(saveError.message || `Failed to ${editMode ? 'update' : 'create'} lead`);
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

  if (!isOpen) return null;

  const inputCls =
    'w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50';

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg border border-border shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            {editMode ? 'Edit Lead' : 'Add Lead'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Icon name="X" size={24} />
          </button>
        </div>

        {/* Form */}
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
                  First Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setField('firstName', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Last Name</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setField('lastName', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Phone <span className="text-destructive">*</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
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
                <label className="block text-sm font-medium text-foreground mb-1">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setField('gender', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                >
                  <option value="">— Select —</option>
                  {LEAD_GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {prettyEnum(g)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Current Class
                </label>
                <select
                  value={form.currentClass}
                  onChange={(e) => setField('currentClass', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                >
                  <option value="">— Select —</option>
                  {CLASS_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">School</label>
                <input
                  type="text"
                  value={form.school}
                  onChange={(e) => setField('school', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Board</label>
                <select
                  value={form.board}
                  onChange={(e) => setField('board', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                >
                  <option value="">— Select —</option>
                  {LEAD_BOARDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
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
                <label className="block text-sm font-medium text-foreground mb-1">Source</label>
                <select
                  value={form.source}
                  onChange={(e) => setField('source', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                >
                  {LEAD_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {prettyEnum(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Interested Course
                </label>
                <select
                  value={form.interestedCourseId}
                  onChange={(e) => setField('interestedCourseId', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                >
                  <option value="">— None —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Course Fee Committed
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.courseFeeCommitted}
                  onChange={(e) => setField('courseFeeCommitted', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Assigned To</label>
                <input
                  type="text"
                  value={form.assignedTo}
                  onChange={(e) => setField('assignedTo', e.target.value)}
                  disabled={loading}
                  placeholder="Staff name or id"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Next Follow-up
                </label>
                <input
                  type="date"
                  value={form.nextFollowUpDate}
                  onChange={(e) => setField('nextFollowUpDate', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
              </div>

              {editMode && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setField('status', e.target.value)}
                    disabled={loading}
                    className={inputCls}
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {prettyEnum(s)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                disabled={loading}
                className={inputCls}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border flex items-center justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              iconName={loading ? 'Loader2' : editMode ? 'Save' : 'Plus'}
              iconPosition="left"
              className={loading ? 'animate-pulse' : ''}
            >
              {loading ? 'Saving...' : editMode ? 'Save Changes' : 'Create Lead'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLeadModal;
