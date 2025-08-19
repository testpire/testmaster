import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const QuestionPalette = ({ 
  questions = [],
  currentQuestionIndex = 0,
  answeredQuestions = [],
  markedQuestions = [],
  onQuestionSelect = () => {},
  isMobile = false,
  isOpen = false,
  onToggle = () => {}
}) => {
  const [selectedSection, setSelectedSection] = useState('all');

  const getQuestionStatus = (index) => {
    const isAnswered = answeredQuestions?.includes(index);
    const isMarked = markedQuestions?.includes(index);
    const isCurrent = currentQuestionIndex === index;

    if (isCurrent) return 'current';
    if (isAnswered && isMarked) return 'answered-marked';
    if (isAnswered) return 'answered';
    if (isMarked) return 'marked';
    return 'not-visited';
  };

  const getStatusColor = (status) => {
    const colors = {
      'current': 'bg-primary text-primary-foreground border-primary',
      'answered': 'bg-success text-success-foreground border-success',
      'answered-marked': 'bg-secondary text-secondary-foreground border-secondary',
      'marked': 'bg-warning text-warning-foreground border-warning',
      'not-visited': 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
    };
    return colors?.[status] || colors?.['not-visited'];
  };

  const getStatusCount = (status) => {
    return questions?.filter((_, index) => getQuestionStatus(index) === status)?.length;
  };

  const handleQuestionClick = (index) => {
    onQuestionSelect(index);
    if (isMobile) {
      onToggle();
    }
  };

  const statusLegend = [
    { key: 'answered', label: 'Answered', color: 'bg-success', count: getStatusCount('answered') + getStatusCount('answered-marked') },
    { key: 'marked', label: 'Marked for Review', color: 'bg-warning', count: getStatusCount('marked') + getStatusCount('answered-marked') },
    { key: 'not-visited', label: 'Not Visited', color: 'bg-muted', count: getStatusCount('not-visited') },
    { key: 'current', label: 'Current', color: 'bg-primary', count: 1 }
  ];

  const PaletteContent = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Question Palette</h3>
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={onToggle}>
              <Icon name="X" size={20} />
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {questions?.length} questions total
        </p>
      </div>

      {/* Status Legend */}
      <div className="p-4 border-b border-border">
        <h4 className="text-sm font-medium text-foreground mb-3">Status Legend</h4>
        <div className="grid grid-cols-2 gap-2">
          {statusLegend?.map((status) => (
            <div key={status?.key} className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded ${status?.color}`}></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{status?.label}</p>
                <p className="text-xs text-muted-foreground">({status?.count})</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Question Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-5 gap-2">
          {questions?.map((question, index) => {
            const status = getQuestionStatus(index);
            return (
              <button
                key={index}
                onClick={() => handleQuestionClick(index)}
                className={`w-10 h-10 rounded-lg border-2 font-semibold text-sm transition-all duration-200 hover:scale-105 ${getStatusColor(status)}`}
                title={`Question ${index + 1} - ${status?.replace('-', ' ')}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Attempted</p>
            <p className="font-semibold text-foreground">
              {answeredQuestions?.length}/{questions?.length}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Marked</p>
            <p className="font-semibold text-foreground">
              {markedQuestions?.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile Drawer
  if (isMobile) {
    return (
      <>
        {/* Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[1050]"
            onClick={onToggle}
          />
        )}
        
        {/* Drawer */}
        <div className={`fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 bg-card border-l border-border z-[1050] transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <PaletteContent />
        </div>
      </>
    );
  }

  // Desktop Sidebar
  return (
    <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 bg-card border-l border-border z-[1030]">
      <PaletteContent />
    </div>
  );
};

export default QuestionPalette;