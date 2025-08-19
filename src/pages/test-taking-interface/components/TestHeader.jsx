import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const TestHeader = ({ 
  testTitle = "Mathematics Quiz - JEE Main 2024",
  timeRemaining = 3600,
  onSubmitTest = () => {},
  onReportQuestion = () => {},
  currentQuestionIndex = 0,
  totalQuestions = 30,
  isFullscreen = false,
  onToggleFullscreen = () => {}
}) => {
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes?.toString()?.padStart(2, '0')}:${secs?.toString()?.padStart(2, '0')}`;
    }
    return `${minutes}:${secs?.toString()?.padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining <= 300) return 'text-error'; // Last 5 minutes
    if (timeRemaining <= 900) return 'text-warning'; // Last 15 minutes
    return 'text-foreground';
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-[1040] px-4">
      <div className="flex items-center justify-between h-full">
        {/* Left Section - Test Info */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-error rounded-full animate-pulse"></div>
            <span className="font-semibold text-foreground text-lg">{testTitle}</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-2 text-muted-foreground">
            <Icon name="FileText" size={16} />
            <span className="text-sm">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
          </div>
        </div>

        {/* Center Section - Timer */}
        <div className={`flex items-center space-x-2 ${getTimerColor()}`}>
          <Icon name="Clock" size={20} />
          <span className="font-mono font-bold text-xl">{formatTime(timeRemaining)}</span>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReportQuestion}
            className="hidden sm:flex"
          >
            <Icon name="Flag" size={16} />
            <span className="ml-2">Report</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFullscreen}
            className="hidden md:flex"
          >
            <Icon name={isFullscreen ? "Minimize2" : "Maximize2"} size={16} />
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={onSubmitTest}
          >
            <Icon name="Send" size={16} />
            <span className="ml-2">Submit</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default TestHeader;