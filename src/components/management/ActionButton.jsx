import React from 'react';
import Button from '../ui/Button';
import Icon from '../AppIcon';

// Map the legacy ActionButton variant names onto the design-token Button variants
// so every action button shares the same palette as the rest of the app.
const VARIANT_MAP = {
  primary: 'default',
  secondary: 'secondary',
  success: 'success',
  danger: 'destructive',
  ghost: 'ghost',
};

const ActionButton = ({
  onClick,
  variant = 'primary',
  icon,
  children,
  className = '',
  ...props
}) => {
  return (
    <Button
      onClick={onClick}
      variant={VARIANT_MAP[variant] || 'default'}
      className={`flex items-center gap-2 ${className}`}
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
