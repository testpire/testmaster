import React, { useState } from 'react';
import Icon from '../AppIcon';
import Button from './Button';

const QuickActionPanel = ({ 
  userRole = 'student', 
  onAction = () => {},
  className = '',
  variant = 'floating' // 'floating', 'embedded', 'sidebar'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const actionConfigs = {
    'super-admin': [
      {
        id: 'create-user',
        label: 'Add User',
        icon: 'UserPlus',
        description: 'Create new student or teacher account',
        color: 'primary',
        shortcut: 'Ctrl+N'
      },
      {
        id: 'create-course',
        label: 'New Course',
        icon: 'BookOpen',
        description: 'Set up a new course or batch',
        color: 'secondary',
        shortcut: 'Ctrl+C'
      },
      {
        id: 'view-analytics',
        label: 'Analytics',
        icon: 'BarChart3',
        description: 'View platform performance metrics',
        color: 'accent',
        shortcut: 'Ctrl+A'
      },
      {
        id: 'system-settings',
        label: 'Settings',
        icon: 'Settings',
        description: 'Configure system preferences',
        color: 'muted',
        shortcut: 'Ctrl+S'
      }
    ],
    'teacher': [
      {
        id: 'create-test',
        label: 'Create Test',
        icon: 'FileText',
        description: 'Design a new test or quiz',
        color: 'primary',
        shortcut: 'Ctrl+T'
      },
      {
        id: 'add-student',
        label: 'Add Student',
        icon: 'UserPlus',
        description: 'Enroll new student to course',
        color: 'secondary',
        shortcut: 'Ctrl+U'
      },
      {
        id: 'view-results',
        label: 'View Results',
        icon: 'BarChart3',
        description: 'Check student performance',
        color: 'accent',
        shortcut: 'Ctrl+R'
      },
      {
        id: 'schedule-test',
        label: 'Schedule',
        icon: 'Calendar',
        description: 'Schedule upcoming tests',
        color: 'warning',
        shortcut: 'Ctrl+D'
      }
    ],
    'student': [
      {
        id: 'take-test',
        label: 'Take Test',
        icon: 'PenTool',
        description: 'Start available test',
        color: 'primary',
        shortcut: 'Ctrl+T'
      },
      {
        id: 'practice-mode',
        label: 'Practice',
        icon: 'Target',
        description: 'Practice with sample questions',
        color: 'secondary',
        shortcut: 'Ctrl+P'
      },
      {
        id: 'view-progress',
        label: 'My Progress',
        icon: 'TrendingUp',
        description: 'Track your performance',
        color: 'accent',
        shortcut: 'Ctrl+G'
      },
      {
        id: 'study-materials',
        label: 'Materials',
        icon: 'BookOpen',
        description: 'Access study resources',
        color: 'success',
        shortcut: 'Ctrl+M'
      }
    ]
  };

  const currentActions = actionConfigs?.[userRole] || actionConfigs?.['student'];

  const handleActionClick = (actionId) => {
    onAction(actionId);
    if (variant === 'floating') {
      setIsExpanded(false);
    }
  };

  const getColorClasses = (color) => {
    const colorMap = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
      accent: 'bg-accent text-accent-foreground hover:bg-accent/90',
      success: 'bg-success text-success-foreground hover:bg-success/90',
      warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
      muted: 'bg-muted text-muted-foreground hover:bg-muted/80'
    };
    return colorMap?.[color] || colorMap?.primary;
  };

  // Floating Action Button variant
  if (variant === 'floating') {
    return (
      <div className={`fixed bottom-6 right-6 z-[1020] ${className}`}>
        {/* Expanded Actions */}
        {isExpanded && (
          <div className="mb-4 space-y-3">
            {currentActions?.map((action, index) => (
              <div
                key={action?.id}
                className="flex items-center justify-end space-x-3 animate-scale-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-sm max-w-xs">
                  <p className="text-sm font-medium text-foreground">{action?.label}</p>
                  <p className="text-xs text-muted-foreground">{action?.description}</p>
                  {action?.shortcut && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{action?.shortcut}</p>
                  )}
                </div>
                <Button
                  size="icon"
                  className={`w-12 h-12 rounded-full shadow-lg ${getColorClasses(action?.color)}`}
                  onClick={() => handleActionClick(action?.id)}
                >
                  <Icon name={action?.icon} size={20} />
                </Button>
              </div>
            ))}
          </div>
        )}
        {/* Main FAB */}
        <Button
          size="icon"
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Icon 
            name={isExpanded ? "X" : "Plus"} 
            size={24} 
            className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
          />
        </Button>
        {/* Backdrop */}
        {isExpanded && (
          <div
            className="fixed inset-0 bg-background/20 backdrop-blur-sm z-[-1]"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </div>
    );
  }

  // Embedded Panel variant
  if (variant === 'embedded') {
    return (
      <div className={`bg-card rounded-lg border border-border p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
          <Icon name="Zap" size={20} className="text-primary" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentActions?.map((action) => (
            <button
              key={action?.id}
              onClick={() => handleActionClick(action?.id)}
              className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColorClasses(action?.color)}`}>
                <Icon name={action?.icon} size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{action?.label}</p>
                <p className="text-sm text-muted-foreground truncate">{action?.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Sidebar Panel variant
  if (variant === 'sidebar') {
    return (
      <div className={`bg-card border-l border-border h-full ${className}`}>
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Quick Actions</h3>
        </div>
        <div className="p-4 space-y-2">
          {currentActions?.map((action) => (
            <button
              key={action?.id}
              onClick={() => handleActionClick(action?.id)}
              className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getColorClasses(action?.color)}`}>
                <Icon name={action?.icon} size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{action?.label}</p>
                <p className="text-xs text-muted-foreground">{action?.description}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-border mt-auto">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Keyboard Shortcuts:</p>
            {currentActions?.slice(0, 2)?.map((action) => (
              <div key={action?.id} className="flex justify-between">
                <span>{action?.label}</span>
                <span className="font-mono">{action?.shortcut}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default QuickActionPanel;