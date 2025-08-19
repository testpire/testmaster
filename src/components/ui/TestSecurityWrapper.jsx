import React, { useState, useEffect, useRef } from 'react';
import Icon from '../AppIcon';
import Button from './Button';

const TestSecurityWrapper = ({ 
  children, 
  isTestActive = false, 
  testTitle = 'Test in Progress',
  timeRemaining = null,
  onTestSubmit = () => {},
  onSecurityViolation = () => {},
  allowTabSwitch = false,
  showWarnings = true
}) => {
  const [violations, setViolations] = useState([]);
  const [showSecurityAlert, setShowSecurityAlert] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const testContainerRef = useRef(null);
  const violationTimeoutRef = useRef(null);

  // Security monitoring effects
  useEffect(() => {
    if (!isTestActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !allowTabSwitch) {
        const violation = {
          type: 'tab_switch',
          timestamp: new Date()?.toISOString(),
          message: 'Tab switched during test'
        };
        
        setViolations(prev => [...prev, violation]);
        setTabSwitchCount(prev => prev + 1);
        
        if (showWarnings) {
          setShowSecurityAlert(true);
        }
        
        onSecurityViolation(violation);
      }
    };

    const handleKeyDown = (e) => {
      // Prevent common shortcuts that could be used to cheat
      if (
        (e?.ctrlKey && (e?.key === 'c' || e?.key === 'v' || e?.key === 'a' || e?.key === 't')) ||
        (e?.altKey && e?.key === 'Tab') ||
        e?.key === 'F12' ||
        (e?.ctrlKey && e?.shiftKey && e?.key === 'I')
      ) {
        e?.preventDefault();
        
        const violation = {
          type: 'keyboard_shortcut',
          timestamp: new Date()?.toISOString(),
          message: `Attempted to use ${e?.ctrlKey ? 'Ctrl+' : ''}${e?.altKey ? 'Alt+' : ''}${e?.key}`
        };
        
        setViolations(prev => [...prev, violation]);
        onSecurityViolation(violation);
        
        if (showWarnings) {
          setShowSecurityAlert(true);
        }
      }
    };

    const handleContextMenu = (e) => {
      e?.preventDefault();
      
      const violation = {
        type: 'right_click',
        timestamp: new Date()?.toISOString(),
        message: 'Right-click attempted during test'
      };
      
      setViolations(prev => [...prev, violation]);
      onSecurityViolation(violation);
    };

    const handleBeforeUnload = (e) => {
      e?.preventDefault();
      e.returnValue = 'Are you sure you want to leave? Your test progress may be lost.';
      return e?.returnValue;
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isTestActive, allowTabSwitch, showWarnings, onSecurityViolation]);

  // Auto-hide security alert
  useEffect(() => {
    if (showSecurityAlert) {
      violationTimeoutRef.current = setTimeout(() => {
        setShowSecurityAlert(false);
      }, 5000);
    }

    return () => {
      if (violationTimeoutRef?.current) {
        clearTimeout(violationTimeoutRef?.current);
      }
    };
  }, [showSecurityAlert]);

  // Fullscreen management
  const enterFullscreen = async () => {
    try {
      if (testContainerRef?.current && testContainerRef?.current?.requestFullscreen) {
        await testContainerRef?.current?.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (error) {
      console.warn('Fullscreen not supported or denied');
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.warn('Exit fullscreen failed');
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleSubmitTest = () => {
    const testData = {
      violations,
      tabSwitchCount,
      submissionTime: new Date()?.toISOString(),
      securityScore: Math.max(0, 100 - (violations?.length * 10))
    };
    
    onTestSubmit(testData);
  };

  const formatTime = (seconds) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes?.toString()?.padStart(2, '0')}:${secs?.toString()?.padStart(2, '0')}`;
    }
    return `${minutes}:${secs?.toString()?.padStart(2, '0')}`;
  };

  if (!isTestActive) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div 
      ref={testContainerRef}
      className={`min-h-screen bg-background ${isFullscreen ? 'test-security-overlay' : ''}`}
    >
      {/* Test Header */}
      <div className="fixed top-0 left-0 right-0 bg-card border-b border-border z-[1040] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-error rounded-full animate-pulse"></div>
              <span className="font-medium text-foreground">{testTitle}</span>
            </div>
            
            {violations?.length > 0 && (
              <div className="flex items-center space-x-2 text-warning">
                <Icon name="AlertTriangle" size={16} />
                <span className="text-sm">{violations?.length} violation{violations?.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {timeRemaining && (
              <div className="flex items-center space-x-2 text-foreground">
                <Icon name="Clock" size={16} />
                <span className="font-mono font-medium">{formatTime(timeRemaining)}</span>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={isFullscreen ? exitFullscreen : enterFullscreen}
              >
                <Icon name={isFullscreen ? "Minimize2" : "Maximize2"} size={16} />
                <span className="ml-2 hidden sm:inline">
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </span>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleSubmitTest}
              >
                <Icon name="Send" size={16} />
                <span className="ml-2">Submit Test</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Security Alert */}
      {showSecurityAlert && (
        <div className="fixed top-20 right-4 bg-warning text-warning-foreground p-4 rounded-lg shadow-lg z-[1040] max-w-sm animate-slide-in">
          <div className="flex items-start space-x-3">
            <Icon name="AlertTriangle" size={20} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium">Security Warning</h4>
              <p className="text-sm mt-1">
                Suspicious activity detected. Please focus on the test window.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSecurityAlert(false)}
              className="text-warning-foreground hover:bg-warning-foreground/20"
            >
              <Icon name="X" size={16} />
            </Button>
          </div>
        </div>
      )}
      {/* Test Content */}
      <div className="pt-20 pb-4">
        {children}
      </div>
      {/* Security Status Bar (Bottom) */}
      {violations?.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-muted border-t border-border z-[1040] px-4 py-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-muted-foreground">Security Status:</span>
              <div className="flex items-center space-x-2 text-warning">
                <Icon name="Shield" size={16} />
                <span>{violations?.length} violation{violations?.length !== 1 ? 's' : ''} detected</span>
              </div>
            </div>
            
            <div className="text-muted-foreground">
              Tab switches: {tabSwitchCount}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestSecurityWrapper;