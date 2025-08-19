import React from 'react';
import Icon from '../../../components/AppIcon';

const PlatformLogo = ({ className = '' }) => {
  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Logo Icon */}
      <div className="relative">
        <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg">
          <svg
            viewBox="0 0 24 24"
            className="w-8 h-8 text-white"
            fill="currentColor">

            <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" />
            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full animate-pulse"></div>
        <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-success rounded-full animate-pulse delay-300"></div>
      </div>

      {/* Platform Name */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">TestPire</h1>
        <p className="text-muted-foreground mt-1 text-base">test your best.

        </p>
      </div>

      {/* Tagline */}
      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
        <Icon name="Target" size={14} className="text-primary" />
        <span>JEE • NEET • CBSE • UPSC • SSC</span>
        <Icon name="Award" size={14} className="text-secondary" />
      </div>
    </div>);

};

export default PlatformLogo;