import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const NavigationControls = ({ 
  currentQuestionIndex = 0,
  totalQuestions = 30,
  onPrevious = () => {},
  onNext = () => {},
  onTogglePalette = () => {},
  isMobile = false,
  showPaletteToggle = true
}) => {
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-[1030] p-4">
      <div className={`flex items-center justify-between ${isMobile ? 'max-w-full' : 'mr-80'}`}>
        {/* Left Section - Previous Button */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={isFirstQuestion}
            className="min-w-[120px]"
          >
            <Icon name="ChevronLeft" size={16} />
            <span className="ml-2">Previous</span>
          </Button>
          
          {isMobile && showPaletteToggle && (
            <Button
              variant="outline"
              size="icon"
              onClick={onTogglePalette}
            >
              <Icon name="Grid3x3" size={16} />
            </Button>
          )}
        </div>

        {/* Center Section - Question Counter */}
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Question</p>
            <p className="font-semibold text-foreground">
              {currentQuestionIndex + 1} of {totalQuestions}
            </p>
          </div>
          
          {/* Progress Bar */}
          <div className="hidden sm:block w-32">
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-1">
              {Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}% complete
            </p>
          </div>
        </div>

        {/* Right Section - Next Button */}
        <div className="flex items-center space-x-2">
          <Button
            variant="default"
            onClick={onNext}
            disabled={isLastQuestion}
            className="min-w-[120px]"
          >
            <span className="mr-2">
              {isLastQuestion ? 'Review' : 'Next'}
            </span>
            <Icon name="ChevronRight" size={16} />
          </Button>
        </div>
      </div>

      {/* Mobile Progress Bar */}
      {isMobile && (
        <div className="mt-3">
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Question {currentQuestionIndex + 1}</span>
            <span>{Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}% complete</span>
            <span>{totalQuestions} total</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationControls;