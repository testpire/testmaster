/**
 * Get the appropriate dashboard route based on user role
 * @param {string} role - User role (SUPER_ADMIN, INST_ADMIN, TEACHER, STUDENT)
 * @returns {string} - Route path for the user's dashboard
 */
export const getDashboardRoute = (role) => {
  if (!role) {
    return '/student-dashboard'; // Default fallback
  }

  const normalizedRole = role.toUpperCase();

  switch (normalizedRole) {
    case 'SUPER_ADMIN':
    case 'SUPERADMIN':
      return '/super-admin-dashboard';
    
    case 'INST_ADMIN':
    case 'ADMIN':
    case 'INSTITUTE_ADMIN':
      return '/teacher-dashboard'; // Use teacher dashboard for institute admins for now
    
    case 'TEACHER':
    case 'INSTRUCTOR':
      return '/teacher-dashboard';
    
    case 'STUDENT':
    default:
      return '/student-dashboard';
  }
};

/**
 * Get user-friendly role name
 * @param {string} role - User role
 * @returns {string} - Formatted role name
 */
export const getRoleDisplayName = (role) => {
  if (!role) return 'Student';

  const normalizedRole = role.toUpperCase();

  switch (normalizedRole) {
    case 'SUPER_ADMIN':
    case 'SUPERADMIN':
      return 'Super Admin';
    
    case 'INST_ADMIN':
    case 'ADMIN':
    case 'INSTITUTE_ADMIN':
      return 'Institute Admin';
    
    case 'TEACHER':
    case 'INSTRUCTOR':
      return 'Teacher';
    
    case 'STUDENT':
    default:
      return 'Student';
  }
};

