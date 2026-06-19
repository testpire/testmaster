import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { questionService } from '../../services/questionService';
import { useQuestionForm } from '../question-bank/components/useQuestionForm';
import QuestionFormFields from '../question-bank/components/QuestionFormFields';

const QUESTION_TYPE_LABELS = {
  mcq: 'MCQ',
  integer_type: 'Integer',
  subjective: 'Subjective'
};

const AddQuestions = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const currentUser = userProfile || user;

  const normalizedRole = String(currentUser?.role || '').toUpperCase().replace(/-/g, '_');
  const isSuperAdmin = normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'SUPERADMIN';
  const superAdminContext = useSuperAdmin();

  // The page is always "active" (no open/close gate like the modal).
  const form = useQuestionForm({ currentUser, editingQuestion: null, active: true });

  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState('');
  // Questions created during this session — gives the author a running record and
  // an undo path without leaving the page.
  const [added, setAdded] = useState([]);

  const goToQuestionBank = () => navigate('/question-bank');

  // Snapshot the just-saved question for the session list (form state is about to reset).
  const snapshotForList = (createdId) => {
    const qd = form.questionData;
    const topicName = form.topics?.find(t => t.id?.toString() === qd.topic?.toString())?.name;
    return {
      id: createdId,
      text: qd.questionText,
      questionType: qd.questionType,
      difficultyLevel: qd.difficultyLevel,
      marks: qd.marks,
      topicName: topicName || ''
    };
  };

  const saveQuestion = async ({ finish }) => {
    const validationError = form.validateForm();
    if (validationError) {
      form.setError(validationError);
      return;
    }

    setSaving(true);
    form.setError('');
    setFlash('');

    try {
      const payload = form.buildPayload({
        instituteId: currentUser?.instituteId || userProfile?.instituteId,
        // Newly added questions are saved as drafts; they're published later from
        // the Question Bank's Draft tab after review.
        draftMode: true
      });
      const result = await questionService.createQuestion(payload);

      if (result?.error) {
        form.setError(`Failed to create question: ${result?.error?.message}`);
        return;
      }

      setAdded(prev => [snapshotForList(result?.data?.id), ...prev]);

      if (finish) {
        goToQuestionBank();
        return;
      }

      // Keep classification context, clear the content for the next entry.
      form.resetForNextQuestion();
      setFlash('Question saved. Add the next one below.');
      // Scroll back to the top so the cleared form is in view.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      form.setError(`Error creating question: ${err?.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Remove a question that was added this session (created server-side, so delete it).
  const handleRemoveAdded = async (questionId) => {
    if (!questionId) return;
    if (!window.confirm('Delete this saved question? This cannot be undone.')) return;

    const previous = added;
    setAdded(prev => prev.filter(q => q.id !== questionId));

    const { error } = await questionService.deleteQuestion(questionId);
    if (error) {
      setAdded(previous);
      form.setError(error.message || 'Failed to delete question');
    }
  };

  return (
    <PageLayout
      title="Add Questions"
      activeRoute="/question-bank"
      showInstituteDropdown={isSuperAdmin}
      institutes={superAdminContext?.allInstitutes || []}
      selectedInstitute={superAdminContext?.selectedInstitute || null}
      onInstituteChange={superAdminContext?.handleInstituteChange || (() => {})}
      institutesLoading={superAdminContext?.institutesLoading || false}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-background border-b border-border px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToQuestionBank}
                title="Back to Question Bank"
              >
                <Icon name="ArrowLeft" size={20} />
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl lg:text-2xl font-display font-semibold text-foreground truncate">Add Questions</h1>
                <p className="text-sm text-muted-foreground">
                  Saved as drafts — review and publish them later from the Question Bank.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
              <Icon name="CheckCircle" size={16} className="text-success" />
              <span>{added.length} added this session</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="lg:col-span-2 space-y-6">
              {flash && (
                <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Icon name="CheckCircle" size={16} className="text-success" />
                    <p className="text-success text-sm">{flash}</p>
                  </div>
                </div>
              )}

              <QuestionFormFields form={form} />

              {/* Actions */}
              <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  * indicates required fields
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToQuestionBank}
                    disabled={saving}
                  >
                    Done
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => saveQuestion({ finish: true })}
                    disabled={saving}
                  >
                    Save &amp; Finish
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => saveQuestion({ finish: false })}
                    disabled={saving}
                    iconName={saving ? undefined : 'Plus'}
                    iconPosition="left"
                  >
                    {saving ? (
                      <span className="flex items-center space-x-2">
                        <Icon name="Loader2" size={16} className="animate-spin" />
                        <span>Saving...</span>
                      </span>
                    ) : (
                      'Save & Add Another'
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Session list */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-0">
                <h2 className="text-sm font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Icon name="ListChecks" size={16} />
                  Added this session ({added.length})
                </h2>
                {added.length === 0 ? (
                  <div className="border border-dashed border-border rounded-lg p-6 text-center">
                    <Icon name="FileText" size={28} className="mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      Questions you save will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {added.map((q, index) => (
                      <div
                        key={q.id || index}
                        className="border border-border rounded-lg p-3 bg-card"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-foreground line-clamp-2 flex-1">
                            {q.text || '(no text)'}
                          </p>
                          {q.id && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-destructive hover:text-destructive/80 shrink-0"
                              onClick={() => handleRemoveAdded(q.id)}
                              title="Delete this question"
                            >
                              <Icon name="Trash2" size={14} />
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span className="px-2 py-0.5 rounded-full bg-warning/15 text-warning font-medium">
                            Draft
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-muted">
                            {QUESTION_TYPE_LABELS[q.questionType] || q.questionType}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-muted">{q.difficultyLevel}</span>
                          <span>{q.marks} marks</span>
                          {q.topicName && <span className="truncate">· {q.topicName}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {added.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={goToQuestionBank}
                    className="w-full mt-4 text-sm"
                    iconName="ArrowRight"
                    iconPosition="right"
                  >
                    View in Question Bank
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default AddQuestions;
