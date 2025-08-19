import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const AssignedTests = ({ onStartTest = () => {} }) => {
  const assignedTests = [
    {
      id: 1,
      title: "JEE Main Physics Mock Test 2025",
      subject: "Physics",
      dueDate: "2025-01-20",
      duration: 180,
      questions: 30,
      difficulty: "Moderate",
      status: "pending",
      priority: "high"
    },
    {
      id: 2,
      title: "NEET Chemistry Chapter Test",
      subject: "Chemistry", 
      dueDate: "2025-01-18",
      duration: 120,
      questions: 25,
      difficulty: "Easy",
      status: "pending",
      priority: "medium"
    },
    {
      id: 3,
      title: "Mathematics Calculus Practice",
      subject: "Mathematics",
      dueDate: "2025-01-22",
      duration: 150,
      questions: 20,
      difficulty: "Tough",
      status: "pending",
      priority: "low"
    },
    {
      id: 4,
      title: "Biology Genetics Mock Test",
      subject: "Biology",
      dueDate: "2025-01-15",
      duration: 90,
      questions: 35,
      difficulty: "Moderate",
      status: "completed",
      score: 85
    }
  ];

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'text-success bg-success/10';
      case 'Moderate': return 'text-warning bg-warning/10';
      case 'Tough': return 'text-error bg-error/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-l-error';
      case 'medium': return 'border-l-warning';
      case 'low': return 'border-l-success';
      default: return 'border-l-muted';
    }
  };

  const getSubjectIcon = (subject) => {
    switch (subject) {
      case 'Physics': return 'Zap';
      case 'Chemistry': return 'Flask';
      case 'Mathematics': return 'Calculator';
      case 'Biology': return 'Leaf';
      default: return 'BookOpen';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Due Today';
    if (diffDays === 1) return 'Due Tomorrow';
    if (diffDays > 0) return `Due in ${diffDays} days`;
    return 'Overdue';
  };

  const pendingTests = assignedTests?.filter(test => test?.status === 'pending');
  const completedTests = assignedTests?.filter(test => test?.status === 'completed');

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-foreground">Assigned Tests</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">{pendingTests?.length} pending</span>
          <Icon name="FileText" size={20} className="text-primary" />
        </div>
      </div>
      {/* Pending Tests */}
      <div className="space-y-4 mb-6">
        {pendingTests?.map((test) => (
          <div 
            key={test?.id} 
            className={`border-l-4 ${getPriorityColor(test?.priority)} bg-muted/30 rounded-r-lg p-4 hover:bg-muted/50 transition-colors`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Icon name={getSubjectIcon(test?.subject)} size={20} className="text-primary" />
                  <h4 className="font-semibold text-foreground">{test?.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(test?.difficulty)}`}>
                    {test?.difficulty}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center space-x-1">
                    <Icon name="Clock" size={14} />
                    <span>{test?.duration} min</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Icon name="HelpCircle" size={14} />
                    <span>{test?.questions} questions</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Icon name="Calendar" size={14} />
                    <span>{formatDate(test?.dueDate)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Icon name="BookOpen" size={14} />
                    <span>{test?.subject}</span>
                  </div>
                </div>
              </div>
              
              <Button
                variant="default"
                size="sm"
                onClick={() => onStartTest(test?.id)}
                iconName="Play"
                iconPosition="left"
              >
                Start Test
              </Button>
            </div>
          </div>
        ))}
      </div>
      {/* Completed Tests Summary */}
      {completedTests?.length > 0 && (
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Recently Completed</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {completedTests?.slice(0, 2)?.map((test) => (
              <div key={test?.id} className="flex items-center justify-between p-3 bg-success/5 rounded-lg border border-success/20">
                <div className="flex items-center space-x-3">
                  <Icon name={getSubjectIcon(test?.subject)} size={16} className="text-success" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{test?.title}</p>
                    <p className="text-xs text-muted-foreground">{test?.subject}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-success">{test?.score}%</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignedTests;