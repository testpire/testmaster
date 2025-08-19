import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const QuestionCard = ({ 
  question, 
  index, 
  onEdit, 
  onRemove, 
  onReplace, 
  onMoveUp, 
  onMoveDown,
  isDragging = false,
  dragHandleProps = {}
}) => {
  const [showFullQuestion, setShowFullQuestion] = useState(false);

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'text-success bg-success/10';
      case 'moderate': return 'text-warning bg-warning/10';
      case 'tough': return 'text-error bg-error/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getQuestionTypeIcon = (type) => {
    switch (type) {
      case 'mcq': return 'CheckCircle';
      case 'integer': return 'Hash';
      case 'subjective': return 'FileText';
      default: return 'HelpCircle';
    }
  };

  const getQuestionTypeColor = (type) => {
    switch (type) {
      case 'mcq': return 'text-primary bg-primary/10';
      case 'integer': return 'text-secondary bg-secondary/10';
      case 'subjective': return 'text-accent bg-accent/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const truncateText = (text, maxLength = 150) => {
    if (text?.length <= maxLength) return text;
    return text?.substring(0, maxLength) + '...';
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-4 transition-all duration-200 ${
      isDragging ? 'shadow-lg scale-105 rotate-2' : 'hover:shadow-md'
    }`}>
      {/* Question Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {/* Drag Handle */}
          <div 
            {...dragHandleProps}
            className="cursor-move p-1 hover:bg-muted rounded"
          >
            <Icon name="GripVertical" size={16} className="text-muted-foreground" />
          </div>
          
          {/* Question Number */}
          <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
            {index + 1}
          </div>
          
          {/* Question Type Badge */}
          <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getQuestionTypeColor(question?.type)}`}>
            <Icon name={getQuestionTypeIcon(question?.type)} size={12} />
            <span>{question?.type?.toUpperCase()}</span>
          </div>
          
          {/* Difficulty Badge */}
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question?.difficulty)}`}>
            {question?.difficulty?.charAt(0)?.toUpperCase() + question?.difficulty?.slice(1)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="w-8 h-8"
          >
            <Icon name="ChevronUp" size={14} />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMoveDown(index)}
            className="w-8 h-8"
          >
            <Icon name="ChevronDown" size={14} />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(question)}
            className="w-8 h-8"
          >
            <Icon name="Edit" size={14} />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onReplace(question)}
            className="w-8 h-8"
          >
            <Icon name="RefreshCw" size={14} />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(index)}
            className="w-8 h-8 text-error hover:text-error"
          >
            <Icon name="Trash2" size={14} />
          </Button>
        </div>
      </div>
      {/* Question Content */}
      <div className="mb-3">
        <div className="text-sm text-foreground leading-relaxed">
          {showFullQuestion ? question?.content : truncateText(question?.content)}
          {question?.content?.length > 150 && (
            <button
              onClick={() => setShowFullQuestion(!showFullQuestion)}
              className="ml-2 text-primary hover:underline text-xs"
            >
              {showFullQuestion ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
        
        {/* Question Image */}
        {question?.image && (
          <div className="mt-2">
            <img
              src={question?.image}
              alt="Question diagram"
              className="max-w-full h-auto rounded border border-border"
              style={{ maxHeight: '200px' }}
            />
          </div>
        )}
      </div>
      {/* Options for MCQ */}
      {question?.type === 'mcq' && question?.options && (
        <div className="mb-3 space-y-1">
          {question?.options?.map((option, optionIndex) => (
            <div
              key={optionIndex}
              className={`text-xs p-2 rounded border ${
                option?.isCorrect 
                  ? 'bg-success/10 border-success text-success' :'bg-muted border-border text-muted-foreground'
              }`}
            >
              <span className="font-medium mr-2">
                {String.fromCharCode(65 + optionIndex)}.
              </span>
              {option?.text}
            </div>
          ))}
        </div>
      )}
      {/* Answer for Integer Type */}
      {question?.type === 'integer' && question?.answer && (
        <div className="mb-3">
          <div className="text-xs bg-success/10 border border-success text-success p-2 rounded">
            <span className="font-medium">Answer: </span>
            {question?.answer}
          </div>
        </div>
      )}
      {/* Question Metadata */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Icon name="BookOpen" size={12} />
            <span>{question?.subject}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Icon name="Layers" size={12} />
            <span>{question?.chapter}</span>
          </div>
          
          {question?.topic && (
            <div className="flex items-center space-x-1">
              <Icon name="Tag" size={12} />
              <span>{question?.topic}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Icon name="Clock" size={12} />
            <span>{question?.estimatedTime || '2'} min</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Icon name="Target" size={12} />
            <span>{question?.marks || 4} marks</span>
          </div>
        </div>
      </div>
      {/* Negative Marking Info */}
      {question?.negativeMarks && (
        <div className="mt-2 text-xs text-error bg-error/10 border border-error/20 rounded p-2">
          <Icon name="Minus" size={12} className="inline mr-1" />
          Negative marking: -{question?.negativeMarks} marks
        </div>
      )}
    </div>
  );
};

export default QuestionCard;