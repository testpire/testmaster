import React from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const ActivityFeed = () => {
  const activities = [
    {
      id: 1,
      type: 'user_created',
      title: 'New Teacher Added',
      description: 'Dr. Priya Sharma joined Mathematics Department',
      user: {
        name: 'Dr. Priya Sharma',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
      },
      timestamp: '2 minutes ago',
      icon: 'UserPlus',
      color: 'success'
    },
    {
      id: 2,
      type: 'test_completed',
      title: 'JEE Mock Test Completed',
      description: '45 students completed Physics Chapter 1 test',
      user: {
        name: 'Batch 2024-A',
        avatar: null
      },
      timestamp: '15 minutes ago',
      icon: 'FileCheck',
      color: 'primary'
    },
    {
      id: 3,
      type: 'course_created',
      title: 'New Course Created',
      description: 'NEET Biology Crash Course added to curriculum',
      user: {
        name: 'Admin',
        avatar: null
      },
      timestamp: '1 hour ago',
      icon: 'BookOpen',
      color: 'secondary'
    },
    {
      id: 4,
      type: 'student_enrolled',
      title: 'Student Enrollment',
      description: 'Rahul Kumar enrolled in JEE Main 2025 batch',
      user: {
        name: 'Rahul Kumar',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
      },
      timestamp: '2 hours ago',
      icon: 'UserCheck',
      color: 'accent'
    },
    {
      id: 5,
      type: 'system_alert',
      title: 'System Maintenance',
      description: 'Scheduled maintenance completed successfully',
      user: {
        name: 'System',
        avatar: null
      },
      timestamp: '3 hours ago',
      icon: 'Settings',
      color: 'warning'
    }
  ];

  const getColorClasses = (color) => {
    const colorMap = {
      primary: 'bg-primary/10 text-primary',
      secondary: 'bg-secondary/10 text-secondary',
      accent: 'bg-accent/10 text-accent',
      success: 'bg-success/10 text-success',
      warning: 'bg-warning/10 text-warning',
      error: 'bg-error/10 text-error'
    };
    return colorMap?.[color] || colorMap?.primary;
  };

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
          <Icon name="Activity" size={20} className="text-muted-foreground" />
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {activities?.map((activity) => (
          <div key={activity?.id} className="p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
            <div className="flex items-start space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getColorClasses(activity?.color)}`}>
                <Icon name={activity?.icon} size={18} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{activity?.title}</p>
                  <span className="text-xs text-muted-foreground">{activity?.timestamp}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{activity?.description}</p>
                
                {activity?.user && (
                  <div className="flex items-center mt-2">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mr-2">
                      {activity?.user?.avatar ? (
                        <Image 
                          src={activity?.user?.avatar} 
                          alt={activity?.user?.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <Icon name="User" size={12} className="text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{activity?.user?.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-border">
        <button className="w-full text-sm text-primary hover:text-primary/80 font-medium transition-colors">
          View All Activities
        </button>
      </div>
    </div>
  );
};

export default ActivityFeed;