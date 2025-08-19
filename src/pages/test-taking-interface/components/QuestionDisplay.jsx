import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';


const QuestionDisplay = ({ 
  question = {},
  selectedAnswer = null,
  onAnswerChange = () => {},
  onClearResponse = () => {},
  onMarkForReview = () => {},
  isMarkedForReview = false,
  questionNumber = 1
}) => {
  const renderQuestionContent = () => {
    if (!question?.content) return null;

    return (
      <div className="prose prose-lg max-w-none">
        <div dangerouslySetInnerHTML={{ __html: question?.content }} />
        {question?.image && (
          <div className="my-4">
            <img 
              src={question?.image} 
              alt="Question diagram" 
              className="max-w-full h-auto rounded-lg border border-border"
            />
          </div>
        )}
      </div>
    );
  };

  const renderMCQOptions = () => {
    if (question?.type !== 'mcq' || !question?.options) return null;

    return (
      <div className="space-y-3">
        {question?.options?.map((option, index) => {
          const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
          return (
            <label
              key={index}
              className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                selectedAnswer === index
                  ? 'border-primary bg-primary/5' :'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <input
                type="radio"
                name={`question-${questionNumber}`}
                value={index}
                checked={selectedAnswer === index}
                onChange={() => onAnswerChange(index)}
                className="mt-1 w-4 h-4 text-primary border-border focus:ring-primary"
              />
              <div className="flex-1">
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-primary">{optionLabel}.</span>
                  <div className="flex-1">
                    <div dangerouslySetInnerHTML={{ __html: option?.text }} />
                    {option?.image && (
                      <img 
                        src={option?.image} 
                        alt={`Option ${optionLabel}`} 
                        className="mt-2 max-w-xs h-auto rounded border border-border"
                      />
                    )}
                  </div>
                </div>
              </div>
            </label>
          );
        })}
      </div>
    );
  };

  const renderIntegerInput = () => {
    if (question?.type !== 'integer') return null;

    return (
      <div className="space-y-4">
        <div className="bg-muted/30 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">
            <Icon name="Info" size={16} className="inline mr-1" />
            Enter your answer as an integer (whole number)
          </p>
          <Input
            type="number"
            placeholder="Enter your answer"
            value={selectedAnswer || ''}
            onChange={(e) => onAnswerChange(e?.target?.value)}
            className="text-center text-lg font-mono"
            min="0"
            step="1"
          />
        </div>
      </div>
    );
  };

  const renderSubjectiveInput = () => {
    if (question?.type !== 'subjective') return null;

    return (
      <div className="space-y-4">
        <div className="bg-muted/30 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">
            <Icon name="PenTool" size={16} className="inline mr-1" />
            Write your detailed answer below
          </p>
          <textarea
            placeholder="Type your answer here..."
            value={selectedAnswer || ''}
            onChange={(e) => onAnswerChange(e?.target?.value)}
            className="w-full min-h-[200px] p-3 border border-border rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
            rows={8}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 h-full overflow-y-auto">
      {/* Question Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
            {questionNumber}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Question {questionNumber}
            </h2>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span className="capitalize">{question?.type || 'MCQ'}</span>
              <span>•</span>
              <span className="capitalize">{question?.difficulty || 'Medium'}</span>
              <span>•</span>
              <span>{question?.marks || 4} marks</span>
              {question?.negativeMarks && (
                <>
                  <span>•</span>
                  <span className="text-error">-{question?.negativeMarks} negative</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={isMarkedForReview ? "secondary" : "outline"}
            size="sm"
            onClick={onMarkForReview}
          >
            <Icon name="Bookmark" size={16} />
            <span className="ml-2 hidden sm:inline">
              {isMarkedForReview ? 'Marked' : 'Mark for Review'}
            </span>
          </Button>
        </div>
      </div>
      {/* Question Content */}
      <div className="mb-8">
        {renderQuestionContent()}
      </div>
      {/* Answer Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-foreground">Your Answer:</h3>
        
        {renderMCQOptions()}
        {renderIntegerInput()}
        {renderSubjectiveInput()}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={onClearResponse}
            disabled={!selectedAnswer}
          >
            <Icon name="RotateCcw" size={16} />
            <span className="ml-2">Clear Response</span>
          </Button>

          <div className="text-sm text-muted-foreground">
            {selectedAnswer ? (
              <span className="text-success">
                <Icon name="CheckCircle" size={16} className="inline mr-1" />
                Answer saved
              </span>
            ) : (
              <span>
                <Icon name="Circle" size={16} className="inline mr-1" />
                Not answered
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionDisplay;