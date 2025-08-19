import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';

const SubmitConfirmationModal = ({ 
  isOpen = false,
  onClose = () => {},
  onConfirm = () => {},
  testStats = {
    totalQuestions: 30,
    answeredQuestions: 25,
    markedQuestions: 3,
    unansweredQuestions: 5
  },
  timeRemaining = 1800
}) => {
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const handleSubmit = async () => {
    if (!confirmationChecked) return;
    
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setConfirmationChecked(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[1060] flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border border-border shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-warning/20 rounded-full flex items-center justify-center">
              <Icon name="AlertTriangle" size={24} className="text-warning" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Submit Test</h2>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to submit your test?
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Time Warning */}
          {timeRemaining > 0 && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-warning">
                <Icon name="Clock" size={16} />
                <span className="font-medium">Time Remaining: {formatTime(timeRemaining)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                You still have time left. You can continue working on your test.
              </p>
            </div>
          )}

          {/* Test Statistics */}
          <div className="space-y-4">
            <h3 className="font-medium text-foreground">Test Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Icon name="CheckCircle" size={16} className="text-success" />
                  <span className="text-sm text-muted-foreground">Answered</span>
                </div>
                <p className="text-lg font-semibold text-foreground mt-1">
                  {testStats?.answeredQuestions}
                </p>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Icon name="Bookmark" size={16} className="text-warning" />
                  <span className="text-sm text-muted-foreground">Marked</span>
                </div>
                <p className="text-lg font-semibold text-foreground mt-1">
                  {testStats?.markedQuestions}
                </p>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Icon name="Circle" size={16} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Unanswered</span>
                </div>
                <p className="text-lg font-semibold text-foreground mt-1">
                  {testStats?.unansweredQuestions}
                </p>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Icon name="FileText" size={16} className="text-primary" />
                  <span className="text-sm text-muted-foreground">Total</span>
                </div>
                <p className="text-lg font-semibold text-foreground mt-1">
                  {testStats?.totalQuestions}
                </p>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {testStats?.unansweredQuestions > 0 && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Icon name="AlertCircle" size={16} className="text-error mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-error">
                    {testStats?.unansweredQuestions} questions remain unanswered
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unanswered questions will be marked as incorrect and may affect your score.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Checkbox */}
          <div className="space-y-3">
            <Checkbox
              checked={confirmationChecked}
              onChange={(e) => setConfirmationChecked(e?.target?.checked)}
              label="I understand that once I submit, I cannot make any changes to my answers"
              className="text-sm"
            />
          </div>

          {/* Important Note */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Icon name="Info" size={16} className="text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Important:</p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                  <li>• Your test will be automatically submitted</li>
                  <li>• Results will be available immediately after submission</li>
                  <li>• You cannot return to the test once submitted</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex items-center justify-end space-x-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Continue Test
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!confirmationChecked || isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Test'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubmitConfirmationModal;