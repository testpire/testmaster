import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rbacService } from '../services/rbacService';

// Returns the current user's RBAC permission set plus a `can(key)` helper.
//
// SUPER_ADMIN bypasses the fetch and always returns true for every check.
// For every other role, the hook fetches GET /rbac/roles/{role}/permissions once
// on mount (skipAuthRedirect so a missing endpoint can't force a logout).
//
// Behaviour while loading / on error:
//   - `loading` is true → `can()` returns false (hide sensitive actions until confirmed).
//   - If the fetch errors: permissions remain an empty Set → `can()` returns false.
//     This is the secure default: deny when uncertain.
const useMyPermissions = () => {
  const { user, userProfile } = useAuth();

  const role = (
    userProfile?.role || user?.role || ''
  ).toString().toUpperCase().replace(/-/g, '_');

  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'SUPERADMIN';

  const [permissions, setPermissions] = useState(new Set());
  const [loading, setLoading] = useState(!isSuperAdmin);

  useEffect(() => {
    if (isSuperAdmin || !role) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data } = await rbacService.getRolePermissions(role);
      if (!mounted) return;
      setPermissions(new Set(Array.isArray(data) ? data : []));
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [role, isSuperAdmin]);

  const can = useCallback(
    (permissionKey) => {
      if (isSuperAdmin) return true;
      if (loading) return false;
      return permissions.has(permissionKey);
    },
    [isSuperAdmin, loading, permissions]
  );

  return { can, loading, permissions };
};

export default useMyPermissions;
