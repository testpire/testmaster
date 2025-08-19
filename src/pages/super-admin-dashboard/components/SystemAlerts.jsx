import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const SystemAlerts = () => {
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      type: 'warning',
      title: 'Server Load High',
      message: 'Current server load is at 85%. Consider scaling resources.',
      timestamp: '5 minutes ago',
      priority: 'high',
      dismissed: false
    },
    {
      id: 2,
      type: 'info',
      title: 'Scheduled Maintenance',
      message: 'System maintenance scheduled for tonight at 2:00 AM IST.',
      timestamp: '1 hour ago',
      priority: 'medium',
      dismissed: false
    },
    {
      id: 3,
      type: 'success',
      title: 'Backup Completed',
      message: 'Daily database backup completed successfully.',
      timestamp: '3 hours ago',
      priority: 'low',
      dismissed: false
    },
    {
      id: 4,
      type: 'error',
      title: 'Payment Gateway Issue',
      message: 'Payment processing temporarily unavailable. Investigating.',
      timestamp: '6 hours ago',
      priority: 'critical',
      dismissed: false
    },
    {
      id: 5,
      type: 'info',
      title: 'New Feature Released',
      message: 'AI-powered analytics dashboard is now available.',
      timestamp: '1 day ago',
      priority: 'low',
      dismissed: false
    }
  ]);

  const getAlertIcon = (type) => {
    const iconMap = {
      error: 'AlertCircle',
      warning: 'AlertTriangle',
      info: 'Info',
      success: 'CheckCircle'
    };
    return iconMap?.[type] || 'Info';
  };

  const getAlertColor = (type) => {
    const colorMap = {
      error: 'text-error bg-error/10',
      warning: 'text-warning bg-warning/10',
      info: 'text-primary bg-primary/10',
      success: 'text-success bg-success/10'
    };
    return colorMap?.[type] || colorMap?.info;
  };

  const getPriorityBadge = (priority) => {
    const badgeMap = {
      critical: 'bg-error text-error-foreground',
      high: 'bg-warning text-warning-foreground',
      medium: 'bg-primary text-primary-foreground',
      low: 'bg-muted text-muted-foreground'
    };
    return badgeMap?.[priority] || badgeMap?.low;
  };

  const dismissAlert = (alertId) => {
    setAlerts(prev => prev?.map(alert => 
      alert?.id === alertId ? { ...alert, dismissed: true } : alert
    ));
  };

  const activeAlerts = alerts?.filter(alert => !alert?.dismissed);

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-foreground">System Alerts</h3>
            {activeAlerts?.length > 0 && (
              <span className="bg-error text-error-foreground text-xs px-2 py-1 rounded-full">
                {activeAlerts?.length}
              </span>
            )}
          </div>
          <Icon name="Bell" size={20} className="text-muted-foreground" />
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {activeAlerts?.length === 0 ? (
          <div className="p-8 text-center">
            <Icon name="CheckCircle" size={48} className="mx-auto text-success mb-4" />
            <h4 className="text-lg font-medium text-foreground mb-2">All Clear!</h4>
            <p className="text-muted-foreground">No active system alerts at the moment.</p>
          </div>
        ) : (
          activeAlerts?.map((alert) => (
            <div key={alert?.id} className="p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getAlertColor(alert?.type)}`}>
                  <Icon name={getAlertIcon(alert?.type)} size={18} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-foreground">{alert?.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(alert?.priority)}`}>
                        {alert?.priority}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => dismissAlert(alert?.id)}
                      className="w-6 h-6 text-muted-foreground hover:text-foreground"
                    >
                      <Icon name="X" size={14} />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{alert?.message}</p>
                  <span className="text-xs text-muted-foreground">{alert?.timestamp}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {activeAlerts?.length > 0 && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Mark all as read
            </button>
            <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
              View Alert History
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemAlerts;