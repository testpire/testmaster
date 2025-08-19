import React from 'react';
import Icon from '../../../components/AppIcon';

const SecurityFeatures = ({ className = '' }) => {
  const securityFeatures = [
    {
      icon: 'Shield',
      title: 'Secure Authentication',
      description: 'Multi-layer security with encrypted data transmission'
    },
    {
      icon: 'Eye',
      title: 'Anti-Cheating',
      description: 'Advanced monitoring during test sessions'
    },
    {
      icon: 'Lock',
      title: 'Data Protection',
      description: 'Your personal information is completely secure'
    }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Trusted by 10,000+ Students
        </h3>
        <p className="text-sm text-muted-foreground">
          Secure platform for competitive exam preparation
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {securityFeatures?.map((feature, index) => (
          <div
            key={index}
            className="flex items-start space-x-3 p-4 bg-card/50 rounded-lg border border-border/50"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name={feature?.icon} size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-foreground">
                {feature?.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                {feature?.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      {/* Trust Indicators */}
      <div className="flex items-center justify-center space-x-6 pt-4 border-t border-border/50">
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Icon name="Users" size={14} className="text-success" />
          <span>500K+ Tests Taken</span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Icon name="Star" size={14} className="text-warning" />
          <span>4.8/5 Rating</span>
        </div>
      </div>
    </div>
  );
};

export default SecurityFeatures;