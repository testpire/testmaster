import React from 'react';
import Icon from '../AppIcon';
import Button from './Button';

const SidebarToggle = ({ 
  isCollapsed = false, 
  onToggle = () => {},
  className = "",
  variant = "ghost",
  size = "icon",
  position = "header" // "header" | "floating"
}) => {
  const baseClasses = "hover:bg-muted";
  
  const positionClasses = {
    header: `${baseClasses}`,
    floating: `fixed top-20 z-[1001] transition-all duration-300 ease-out bg-card border border-border shadow-lg hover:shadow-xl ${
      isCollapsed ? 'left-4' : 'left-60'
    } hidden lg:flex`
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={onToggle}
      className={`${positionClasses[position]} ${className}`}
      title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <Icon name="Menu" size={18} />
    </Button>
  );
};

export default SidebarToggle;
