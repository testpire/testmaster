import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';



const ReportQuestionModal = ({ 
  isOpen = false,
  onClose = () => {},
  onSubmit = () => {},
  questionNumber = 1,
  questionContent = ""
}) => {
  const [reportType, setReportType] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportTypes = [
    {
      id: 'incorrect-answer',
      label: 'Incorrect Answer/Solution',
      description: 'The provided answer or solution appears to be wrong'
    },
    {
      id: 'unclear-question',
      label: 'Unclear Question',
      description: 'The question is ambiguous or difficult to understand'
    },
    {
      id: 'technical-issue',
      label: 'Technical Issue',
      description: 'Images not loading, formatting problems, etc.'
    },
    {
      id: 'missing-information',
      label: 'Missing Information',
      description: 'Question lacks necessary data or context'
    },
    {
      id: 'other',
      label: 'Other Issue',
      description: 'Any other problem not listed above'
    }
  ];

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!reportType || !description?.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        questionNumber,
        reportType,
        description: description?.trim(),
        timestamp: new Date()?.toISOString()
      });
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setReportType('');
    setDescription('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[1060] flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border border-border shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center">
                <Icon name="Flag" size={20} className="text-warning" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Report Question</h2>
                <p className="text-sm text-muted-foreground">
                  Question {questionNumber}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <Icon name="X" size={20} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Question Preview */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-foreground mb-2">Question Preview:</h3>
            <div className="text-sm text-muted-foreground max-h-20 overflow-y-auto">
              {questionContent?.length > 200 
                ? `${questionContent?.substring(0, 200)}...` 
                : questionContent || "Question content not available"}
            </div>
          </div>

          {/* Report Type Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">What's the issue?</h3>
            <div className="space-y-2">
              {reportTypes?.map((type) => (
                <label
                  key={type?.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                    reportType === type?.id
                      ? 'border-primary bg-primary/5' :'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportType"
                    value={type?.id}
                    checked={reportType === type?.id}
                    onChange={(e) => setReportType(e?.target?.value)}
                    className="mt-1 w-4 h-4 text-primary border-border focus:ring-primary"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{type?.label}</p>
                    <p className="text-sm text-muted-foreground">{type?.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Detailed Description <span className="text-error">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e?.target?.value)}
              placeholder="Please provide more details about the issue you encountered..."
              className="w-full min-h-[100px] p-3 border border-border rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters required ({description?.length}/10)
            </p>
          </div>

          {/* Important Note */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Icon name="Info" size={16} className="text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-primary">Important:</p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                  <li>• Your report will be reviewed by our academic team</li>
                  <li>• This will not affect your current test session</li>
                  <li>• You can continue with the test after submitting this report</li>
                  <li>• If the issue is confirmed, appropriate action will be taken</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={!reportType || description?.length < 10 || isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportQuestionModal;