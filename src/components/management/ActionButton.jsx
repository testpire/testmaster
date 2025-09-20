import React from 'react';
import Button from '../ui/Button';
import Icon from '../AppIcon';

const ActionButton = ({
  onClick,
  variant = 'primary',
  icon,
  children,
  className = '',
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'secondary':
        return 'bg-gray-600 hover:bg-gray-700 text-white';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'ghost':
        return 'bg-transparent hover:bg-muted text-foreground';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  return (
    <Button
      onClick={onClick}
      className={`flex items-center gap-2 ${getVariantStyles()} ${className}`}
      {...props}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </Button>
  );
};

// Common action button variants
export const AddButton = ({ onClick, children = 'Add', icon = 'Plus', ...props }) => (
  <ActionButton
    onClick={onClick}
    variant="primary"
    icon={icon}
    {...props}
  >
    {children}
  </ActionButton>
);

export const EditButton = ({ onClick, size = 'icon', ...props }) => (
  <Button
    variant="ghost"
    size={size}
    onClick={onClick}
    className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
    title="Edit"
    {...props}
  >
    <Icon name="Edit" size={16} />
  </Button>
);

export const DeleteButton = ({ onClick, size = 'icon', ...props }) => (
  <Button
    variant="ghost"
    size={size}
    onClick={onClick}
    className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
    title="Delete"
    {...props}
  >
    <Icon name="Trash2" size={16} />
  </Button>
);

export default ActionButton;
