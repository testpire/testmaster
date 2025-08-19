import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const QuickActions = ({ onAction }) => {
  const actions = [
    {
      id: 'add-student',
      title: 'Add Student',
      description: 'Enroll new student to the platform',
      icon: 'UserPlus',
      color: 'primary',
      shortcut: 'Ctrl+S'
    },
    {
      id: 'add-teacher',
      title: 'Add Teacher',
      description: 'Create new teacher account',
      icon: 'Users',
      color: 'secondary',
      shortcut: 'Ctrl+T'
    },
    {
      id: 'create-course',
      title: 'Create Course',
      description: 'Set up new course or batch',
      icon: 'BookOpen',
      color: 'accent',
      shortcut: 'Ctrl+C'
    },
    {
      id: 'create-test',
      title: 'Create Test',
      description: 'Design new test paper',
      icon: 'FileText',
      color: 'success',
      shortcut: 'Ctrl+N'
    },
    {
      id: 'view-analytics',
      title: 'View Analytics',
      description: 'Check platform performance',
      icon: 'BarChart3',
      color: 'warning',
      shortcut: 'Ctrl+A'
    },
    {
      id: 'system-settings',
      title: 'System Settings',
      description: 'Configure platform settings',
      icon: 'Settings',
      color: 'error',
      shortcut: 'Ctrl+G'
    }
  ];

  const getColorClasses = (color) => {
    const colorMap = {
      primary: 'bg-primary/10 text-primary hover:bg-primary/20',
      secondary: 'bg-secondary/10 text-secondary hover:bg-secondary/20',
      accent: 'bg-accent/10 text-accent hover:bg-accent/20',
      success: 'bg-success/10 text-success hover:bg-success/20',
      warning: 'bg-warning/10 text-warning hover:bg-warning/20',
      error: 'bg-error/10 text-error hover:bg-error/20'
    };
    return colorMap?.[color] || colorMap?.primary;
  };

  const handleActionClick = (actionId) => {
    if (onAction) {
      onAction(actionId);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
          <Icon name="Zap" size={20} className="text-primary" />
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {actions?.map((action) => (
            <button
              key={action?.id}
              onClick={() => handleActionClick(action?.id)}
              className={`p-4 rounded-lg border border-border transition-all duration-200 text-left group ${getColorClasses(action?.color)}`}
            >
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColorClasses(action?.color)?.replace('hover:bg-', 'bg-')?.replace('/20', '/20')}`}>
                  <Icon name={action?.icon} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground group-hover:text-current">{action?.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{action?.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-mono text-muted-foreground">{action?.shortcut}</span>
                    <Icon name="ArrowRight" size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-border">
          <Button variant="outline" className="w-full">
            <Icon name="Plus" size={16} />
            View All Actions
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;