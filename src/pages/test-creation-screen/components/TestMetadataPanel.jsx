import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const TestMetadataPanel = ({ 
  metadata, 
  onMetadataChange, 
  onSave, 
  onPreview, 
  onPublish,
  autoSaveStatus = 'saved',
  isPublished = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const examPatternOptions = [
    { value: 'jee-main', label: 'JEE Main Pattern' },
    { value: 'jee-advanced', label: 'JEE Advanced Pattern' },
    { value: 'neet', label: 'NEET Pattern' },
    { value: 'cbse', label: 'CBSE Board Pattern' },
    { value: 'custom', label: 'Custom Pattern' }
  ];

  const difficultyDistributionOptions = [
    { value: 'balanced', label: 'Balanced (40% Easy, 40% Moderate, 20% Tough)' },
    { value: 'easy-focus', label: 'Easy Focus (60% Easy, 30% Moderate, 10% Tough)' },
    { value: 'tough-focus', label: 'Tough Focus (20% Easy, 40% Moderate, 40% Tough)' },
    { value: 'custom', label: 'Custom Distribution' }
  ];

  const getAutoSaveIcon = () => {
    switch (autoSaveStatus) {
      case 'saving': return 'Loader2';
      case 'saved': return 'Check';
      case 'error': return 'AlertCircle';
      default: return 'Clock';
    }
  };

  const getAutoSaveColor = () => {
    switch (autoSaveStatus) {
      case 'saving': return 'text-warning';
      case 'saved': return 'text-success';
      case 'error': return 'text-error';
      default: return 'text-muted-foreground';
    }
  };

  const handleInputChange = (field, value) => {
    onMetadataChange({ ...metadata, [field]: value });
  };

  return (
    <div className="bg-card border-b border-border">
      <div className="p-4">
        {/* Header with Auto-save Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-8 h-8"
            >
              <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={16} />
            </Button>
            
            <h2 className="text-lg font-semibold text-foreground">Test Configuration</h2>
            
            {/* Auto-save Status */}
            <div className={`flex items-center space-x-1 text-xs ${getAutoSaveColor()}`}>
              <Icon 
                name={getAutoSaveIcon()} 
                size={12} 
                className={autoSaveStatus === 'saving' ? 'animate-spin' : ''} 
              />
              <span>
                {autoSaveStatus === 'saving' && 'Saving...'}
                {autoSaveStatus === 'saved' && 'All changes saved'}
                {autoSaveStatus === 'error' && 'Save failed'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPreview}
              iconName="Eye"
              iconPosition="left"
            >
              Preview
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={onSave}
              iconName="Save"
              iconPosition="left"
            >
              Save Draft
            </Button>
            
            <Button
              variant="primary"
              size="sm"
              onClick={onPublish}
              disabled={isPublished}
              iconName={isPublished ? "CheckCircle" : "Send"}
              iconPosition="left"
            >
              {isPublished ? 'Published' : 'Publish Test'}
            </Button>
          </div>
        </div>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground border-b border-border pb-2">
                Basic Information
              </h3>
              
              <Input
                label="Test Title"
                type="text"
                placeholder="Enter test title"
                value={metadata?.title || ''}
                onChange={(e) => handleInputChange('title', e?.target?.value)}
                required
              />
              
              <Input
                label="Test Description"
                type="text"
                placeholder="Brief description of the test"
                value={metadata?.description || ''}
                onChange={(e) => handleInputChange('description', e?.target?.value)}
              />
              
              <Select
                label="Exam Pattern"
                placeholder="Select exam pattern"
                options={examPatternOptions}
                value={metadata?.examPattern || ''}
                onChange={(value) => handleInputChange('examPattern', value)}
              />
            </div>

            {/* Test Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground border-b border-border pb-2">
                Test Settings
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Duration (minutes)"
                  type="number"
                  placeholder="180"
                  value={metadata?.duration || ''}
                  onChange={(e) => handleInputChange('duration', e?.target?.value)}
                  min="1"
                  max="600"
                />
                
                <Input
                  label="Total Marks"
                  type="number"
                  placeholder="300"
                  value={metadata?.totalMarks || ''}
                  onChange={(e) => handleInputChange('totalMarks', e?.target?.value)}
                  min="1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Passing Marks"
                  type="number"
                  placeholder="120"
                  value={metadata?.passingMarks || ''}
                  onChange={(e) => handleInputChange('passingMarks', e?.target?.value)}
                  min="1"
                />
                
                <Input
                  label="Negative Marking"
                  type="number"
                  placeholder="1"
                  value={metadata?.negativeMarking || ''}
                  onChange={(e) => handleInputChange('negativeMarking', e?.target?.value)}
                  min="0"
                  step="0.25"
                />
              </div>
              
              <Select
                label="Difficulty Distribution"
                placeholder="Select distribution"
                options={difficultyDistributionOptions}
                value={metadata?.difficultyDistribution || ''}
                onChange={(value) => handleInputChange('difficultyDistribution', value)}
              />
            </div>

            {/* Advanced Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground border-b border-border pb-2">
                Advanced Settings
              </h3>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={metadata?.randomizeQuestions || false}
                    onChange={(e) => handleInputChange('randomizeQuestions', e?.target?.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-foreground">Randomize Question Order</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={metadata?.randomizeOptions || false}
                    onChange={(e) => handleInputChange('randomizeOptions', e?.target?.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-foreground">Randomize MCQ Options</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={metadata?.allowReview || true}
                    onChange={(e) => handleInputChange('allowReview', e?.target?.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-foreground">Allow Question Review</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={metadata?.showResults || true}
                    onChange={(e) => handleInputChange('showResults', e?.target?.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-foreground">Show Results After Submission</span>
                </label>
              </div>
              
              <Input
                label="Instructions for Students"
                type="text"
                placeholder="Enter special instructions"
                value={metadata?.instructions || ''}
                onChange={(e) => handleInputChange('instructions', e?.target?.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestMetadataPanel;