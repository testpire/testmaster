import React from 'react';
import Icon from '../../../components/AppIcon';

const QuickActions = ({ onAction }) => {
  // Only actions that map to real, existing routes in the app.
  const actions = [
    {
      id: 'institutes',
      title: 'Institutes',
      description: 'Create and manage institutes',
      icon: 'Building',
      color: 'primary',
      route: '/institute-management'
    },
    {
      id: 'students',
      title: 'Students',
      description: 'Manage student accounts',
      icon: 'Users',
      color: 'secondary',
      route: '/student-management'
    },
    {
      id: 'teachers',
      title: 'Teachers',
      description: 'Manage teacher accounts',
      icon: 'UserCheck',
      color: 'accent',
      route: '/teacher-management'
    },
    {
      id: 'courses',
      title: 'Courses',
      description: 'Manage courses and curriculum',
      icon: 'BookOpen',
      color: 'success',
      route: '/course-management'
    },
    {
      id: 'question-bank',
      title: 'Question Bank',
      description: 'Manage questions',
      icon: 'FileText',
      color: 'warning',
      route: '/question-bank'
    },
    {
      id: 'leads',
      title: 'Leads',
      description: 'Track and convert leads',
      icon: 'Target',
      color: 'primary',
      route: '/lead-management'
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

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
          <Icon name="Zap" size={20} className="text-primary" />
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions?.map((action) => (
            <button
              key={action?.id}
              onClick={() => onAction?.(action?.route)}
              className="p-4 rounded-lg border border-border transition-all duration-200 text-left group hover:bg-muted/50"
            >
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getColorClasses(action?.color)}`}>
                  <Icon name={action?.icon} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground">{action?.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{action?.description}</p>
                </div>
                <Icon name="ArrowRight" size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickActions;
