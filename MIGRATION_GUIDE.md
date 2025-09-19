# TestMaster Backend Migration Guide

## Overview
This document outlines the migration from Supabase to the new TestPire API backend.

## What Changed

### 1. Authentication System
- **Before**: Supabase Auth with email/password
- **After**: JWT-based authentication with username/password
- **Impact**: Login flow now uses username instead of email as primary credential

### 2. API Endpoints
- **Before**: Supabase REST API and RPC functions
- **After**: TestPire REST API with role-based endpoints
- **Impact**: All service calls have been migrated to new API structure

### 3. User Management
- **Before**: Basic user profiles
- **After**: Role-based user management (SUPER_ADMIN, INST_ADMIN, TEACHER, STUDENT)
- **Impact**: Enhanced permissions and institute-based organization

### 4. New Features Added
- Institute Management (Super Admin only)
- Enhanced User Management with role-based access
- Improved dashboard functionality
- Better permission controls

## Service Migration

### Authentication (`authService.js`)
```javascript
// Old Supabase approach
await supabase.auth.signInWithPassword({ email, password })

// New API approach  
await newAuthService.login(username, password)
```

### User Management (`userService.js`)
```javascript
// Old approach
await supabase.from('user_profiles').select('*')

// New approach
await newUserService.getUsers({ role: 'STUDENT' })
```

## New Pages Added

1. **Institute Management** (`/institute-management`)
   - Create, edit, delete institutes
   - Super Admin only access
   - Search and filter capabilities

2. **Enhanced User Management** (`/user-management`)
   - Role-based user creation (Student, Teacher, Institute Admin)
   - User search and filtering by role
   - Institute-based organization

## Environment Configuration

### New Environment Variables
```env
VITE_API_BASE_URL=https://testpire-svc.brz9vh5stea0g.ap-south-1.cs.amazonlightsail.com/api
```

### Deprecated Environment Variables
```env
# No longer needed
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

## Testing the Migration

Run the API tests to verify the migration:

```javascript
import { runAPITests } from './src/utils/testApiConnection';

// Test the API connection
runAPITests();
```

## Placeholder Services

Some services currently return placeholder responses while we wait for corresponding API endpoints:

- **Test Management**: Tests, questions, assignments
- **Course Management**: Courses and batches
- **Study Materials**: File uploads and materials

These will be implemented as the backend API expands.

## User Roles and Permissions

### SUPER_ADMIN
- Full system access
- Institute management
- All user management functions

### INST_ADMIN  
- Institute-specific administration
- Manage teachers and students within institute
- Course and batch management

### TEACHER
- Student management within assigned batches
- Test creation and management
- Student progress tracking

### STUDENT
- Take assigned tests
- View study materials
- Track personal progress

## Migration Checklist

- [x] Replace Supabase client with new API client
- [x] Migrate authentication system
- [x] Update all service layers
- [x] Create new UI for API-specific features
- [x] Add proper error handling
- [x] Implement role-based access control
- [x] Update routing for new pages
- [ ] Test with real user accounts
- [ ] Verify all existing functionality works
- [ ] Document any missing features

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Token expired or invalid
   - Solution: Clear localStorage and re-login

2. **CORS Errors**: Cross-origin request blocked
   - Solution: Verify API endpoint is correct

3. **Role Permission Errors**: User lacks required permissions
   - Solution: Verify user role and endpoint requirements

### Debug Tools

Use the browser console to run API tests:
```javascript
// In browser console
import('./src/utils/testApiConnection.js').then(module => {
  module.runAPITests();
});
```

## Support

For issues with the migration or API integration, check:
1. API documentation: [Swagger UI](https://testpire-svc.brz9vh5stea0g.ap-south-1.cs.amazonlightsail.com/swagger-ui/index.html)
2. Browser network tab for API request/response details
3. Console for detailed error messages
