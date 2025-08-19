import React, { useEffect, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const SecurityAlert = ({ 
  isVisible = false,
  alertType = 'tab-switch', // 'tab-switch', 'copy-paste', 'right-click', 'fullscreen-exit'
  onDismiss = () => {},
  autoHide = true,
  autoHideDelay = 5000
}) => {
  const [timeLeft, setTimeLeft] = useState(autoHideDelay / 1000);

  useEffect(() => {
    if (!isVisible || !autoHide) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, autoHide, onDismiss]);

  useEffect(() => {
    if (isVisible) {
      setTimeLeft(autoHideDelay / 1000);
    }
  }, [isVisible, autoHideDelay]);

  const getAlertConfig = () => {
    const configs = {
      'tab-switch': {
        icon: 'AlertTriangle',
        title: 'Tab Switch Detected',
        message: 'You switched to another tab or window. Please stay focused on the test.',
        color: 'warning',
        severity: 'medium'
      },
      'copy-paste': {
        icon: 'Shield',
        title: 'Copy/Paste Blocked',
        message: 'Copy and paste operations are not allowed during the test.',
        color: 'error',
        severity: 'high'
      },
      'right-click': {
        icon: 'MousePointer',
        title: 'Right-Click Disabled',
        message: 'Right-click context menu is disabled during the test.',
        color: 'warning',
        severity: 'low'
      },
      'fullscreen-exit': {
        icon: 'Minimize2',
        title: 'Fullscreen Mode Exited',
        message: 'Please return to fullscreen mode for better test experience.',
        color: 'warning',
        severity: 'medium'
      },
      'keyboard-shortcut': {
        icon: 'Keyboard',
        title: 'Keyboard Shortcut Blocked',
        message: 'Certain keyboard shortcuts are disabled during the test.',
        color: 'warning',
        severity: 'medium'
      }
    };

    return configs?.[alertType] || configs?.['tab-switch'];
  };

  if (!isVisible) return null;

  const config = getAlertConfig();
  
  const getColorClasses = () => {
    const colorMap = {
      warning: 'bg-warning text-warning-foreground border-warning',
      error: 'bg-error text-error-foreground border-error',
      info: 'bg-primary text-primary-foreground border-primary'
    };
    return colorMap?.[config?.color] || colorMap?.warning;
  };

  return (
    <div className="fixed top-20 right-4 z-[1050] animate-slide-in">
      <div className={`max-w-sm rounded-lg border-2 shadow-lg ${getColorClasses()}`}>
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Icon name={config?.icon} size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm">{config?.title}</h4>
              <p className="text-sm mt-1 opacity-90">{config?.message}</p>
              
              {config?.severity === 'high' && (
                <div className="mt-2 text-xs opacity-80">
                  <Icon name="AlertCircle" size={12} className="inline mr-1" />
                  This action has been logged for security purposes.
                </div>
              )}
            </div>
            <div className="flex-shrink-0 flex items-center space-x-2">
              {autoHide && (
                <div className="text-xs opacity-80 font-mono">
                  {timeLeft}s
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onDismiss}
                className="w-6 h-6 hover:bg-white/20"
              >
                <Icon name="X" size={14} />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Progress bar for auto-hide */}
        {autoHide && (
          <div className="h-1 bg-white/20 rounded-b-lg overflow-hidden">
            <div 
              className="h-full bg-white/40 transition-all duration-1000 ease-linear"
              style={{ 
                width: `${(timeLeft / (autoHideDelay / 1000)) * 100}%` 
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityAlert;