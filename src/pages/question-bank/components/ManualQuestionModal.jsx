import React, { useState } from 'react';
import { questionService } from '../../../services/questionService';
import { useAuth } from '../../../contexts/AuthContext';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { useQuestionForm } from './useQuestionForm';
import QuestionFormFields from './QuestionFormFields';

const ManualQuestionModal = ({ isOpen, onClose, onQuestionAdded, editingQuestion = null, currentUser = null }) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const form = useQuestionForm({ currentUser, editingQuestion, active: isOpen });

  const handleSubmit = async (e) => {
    e?.preventDefault();

    const validationError = form.validateForm();
    if (validationError) {
      form.setError(validationError);
      return;
    }

    setLoading(true);
    form.setError('');
    setSuccess('');

    try {
      const questionPayload = form.buildPayload({
        instituteId: currentUser?.instituteId || userProfile?.instituteId,
        // New questions start as drafts; edits preserve the question's current
        // publish state so saving an edit never silently publishes/unpublishes it.
        draftMode: editingQuestion ? editingQuestion?.draftMode : true
      });

      let result;
      if (editingQuestion) {
        result = await questionService?.updateQuestion(editingQuestion?.id, questionPayload);
      } else {
        result = await questionService?.createQuestion(questionPayload);
      }

      if (result?.error) {
        form.setError(`Failed to ${editingQuestion ? 'update' : 'create'} question: ${result?.error?.message}`);
        return;
      }

      setSuccess(`Question ${editingQuestion ? 'updated' : 'created'} successfully!`);

      // Notify parent component
      if (onQuestionAdded) {
        onQuestionAdded(result?.data);
      }

      // Close modal after short delay
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 1500);

    } catch (error) {
      const errorMessage = error?.message?.includes('Failed to fetch')
        ? 'Cannot connect to the server. Please check your connection and try again.'
        : `Error ${editingQuestion ? 'updating' : 'creating'} question: ${error?.message}`;
      form.setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingQuestion ? 'Edit Question' : 'Add Manual Question'}
      description={editingQuestion ? 'Update the question details' : 'Create a new question manually'}
      size="xl"
    >
      <form onSubmit={handleSubmit}>
        {success && (
          <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Icon name="CheckCircle" size={16} className="text-success" />
              <p className="text-success text-sm">{success}</p>
            </div>
          </div>
        )}

        <QuestionFormFields form={form} />

        {/* Footer */}
        <div className="pt-4 border-t border-border flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            * indicates required fields
          </div>
          <div className="flex items-center space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <Icon name="Loader2" size={16} className="animate-spin" />
                  <span>{editingQuestion ? 'Updating...' : 'Creating...'}</span>
                </div>
              ) : (
                editingQuestion ? 'Update Question' : 'Add Question'
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ManualQuestionModal;
