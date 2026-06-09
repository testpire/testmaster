import React, { useState, useEffect } from 'react';
import { newTestService } from '../../../services/newTestService';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { toDatetimeLocal, toUtcIso } from '../testConstants';

// Create / edit a test's metadata. Per-question marks and the question set itself
// are managed separately in the Question Picker; this modal only handles the test
// shell (title, timing, scoring rules, availability window).
const TestFormModal = ({
  isOpen,
  onClose,
  onSuccess,
  editMode = false,
  existingTest = null,
  defaultInstituteId = null
}) => {
  const emptyForm = {
    title: '',
    description: '',
    durationMinutes: 60,
    maxAttempts: 1,
    passingMarks: '',
    negativeMarking: false,
    shuffleQuestions: false,
    showAnswers: false,
    availableFrom: '',
    availableUntil: ''
  };

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editMode && existingTest) {
      setForm({
        title: existingTest.title || '',
        description: existingTest.description || '',
        durationMinutes: existingTest.durationMinutes ?? 60,
        maxAttempts: existingTest.maxAttempts ?? 1,
        passingMarks: existingTest.passingMarks ?? '',
        negativeMarking: !!existingTest.negativeMarking,
        shuffleQuestions: !!existingTest.shuffleQuestions,
        showAnswers: !!existingTest.showAnswers,
        availableFrom: toDatetimeLocal(existingTest.availableFrom),
        availableUntil: toDatetimeLocal(existingTest.availableUntil)
      });
    } else {
      setForm(emptyForm);
    }
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editMode, existingTest]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    if (form.availableFrom && form.availableUntil &&
        new Date(form.availableUntil) <= new Date(form.availableFrom)) {
      setError('"Available until" must be after "Available from"');
      return;
    }

    // Build payload — send numeric fields as numbers, omit blank optionals.
    const payload = {
      title: form.title.trim(),
      negativeMarking: form.negativeMarking,
      shuffleQuestions: form.shuffleQuestions,
      showAnswers: form.showAnswers
    };
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.durationMinutes !== '' && form.durationMinutes != null)
      payload.durationMinutes = Number(form.durationMinutes);
    if (form.maxAttempts !== '' && form.maxAttempts != null)
      payload.maxAttempts = Number(form.maxAttempts);
    if (form.passingMarks !== '') payload.passingMarks = Number(form.passingMarks);
    if (form.availableFrom) payload.availableFrom = toUtcIso(form.availableFrom);
    if (form.availableUntil) payload.availableUntil = toUtcIso(form.availableUntil);

    // instituteId is only meaningful on create for a super-admin acting within a
    // selected institute; on update the backend keeps the test's institute.
    if (!editMode && defaultInstituteId) payload.instituteId = Number(defaultInstituteId);

    try {
      setLoading(true);
      const { data, error: saveError } =
        editMode && existingTest
          ? await newTestService.updateTest(existingTest.id, payload)
          : await newTestService.createTest(payload);

      if (saveError) {
        setError(saveError.message || `Failed to ${editMode ? 'update' : 'create'} test`);
        return;
      }

      onSuccess?.(data);
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
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            {editMode ? 'Edit Test' : 'Create Test'}
          </h2>
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

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                disabled={loading}
                className={inputCls}
                placeholder="e.g. Physics Unit Test 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                disabled={loading}
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.durationMinutes}
                  onChange={(e) => setField('durationMinutes', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Max Attempts
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.maxAttempts}
                  onChange={(e) => setField('maxAttempts', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Passing Marks
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={form.passingMarks}
                  onChange={(e) => setField('passingMarks', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                  placeholder="optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Available From
                </label>
                <input
                  type="datetime-local"
                  value={form.availableFrom}
                  onChange={(e) => setField('availableFrom', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Available Until <span className="text-muted-foreground">(expiry)</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.availableUntil}
                  onChange={(e) => setField('availableUntil', e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.negativeMarking}
                  onChange={(e) => setField('negativeMarking', e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                />
                Negative marking (deduct per-question negative marks on wrong answers)
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.shuffleQuestions}
                  onChange={(e) => setField('shuffleQuestions', e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                />
                Shuffle question order per student
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showAnswers}
                  onChange={(e) => setField('showAnswers', e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                />
                Show correct answers to students after submission
              </label>
            </div>
          </div>

          <div className="p-6 border-t border-border flex items-center justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={loading}
              iconName={loading ? 'Loader2' : editMode ? 'Save' : 'Plus'}
              iconPosition="left"
              className={loading ? 'animate-pulse' : ''}
            >
              {loading ? 'Saving...' : editMode ? 'Save Changes' : 'Create Test'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TestFormModal;
