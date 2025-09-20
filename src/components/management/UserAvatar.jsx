import React from 'react';

const UserAvatar = ({
  user,
  size = 'md',
  colorClass = 'text-blue-600 bg-blue-100'
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-6 h-6 text-xs';
      case 'md':
        return 'w-8 h-8 text-sm';
      case 'lg':
        return 'w-10 h-10 text-base';
      case 'xl':
        return 'w-12 h-12 text-lg';
      default:
        return 'w-8 h-8 text-sm';
    }
  };

  const getInitials = () => {
    if (user.firstName && user.firstName[0]) {
      return user.firstName[0].toUpperCase();
    }
    if (user.username && user.username[0]) {
      return user.username[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <div className={`${getSizeClasses()} ${colorClass} rounded-full flex items-center justify-center`}>
      <span className="font-semibold">
        {getInitials()}
      </span>
    </div>
  );
};

export default UserAvatar;
