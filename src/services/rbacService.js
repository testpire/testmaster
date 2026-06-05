import { get, post, put } from '../lib/apiClient';

// Roles managed by the access-control matrix, in display order.
export const RBAC_ROLES = ['SUPER_ADMIN', 'INST_ADMIN', 'TEACHER', 'STUDENT'];

// The backend types these responses generically as `object`, so normalize
// defensively into a flat, de-duped list of permission keys regardless of
// whether the API returns an array, an ApiResponseDto wrapper, a
// { permissions: [...] } envelope, or a grouped { RESOURCE: [actions] } map.
const normalizePermissionList = (raw) => {
  let value = raw;

  // Unwrap ApiResponseDto-style { data: ... } and { permissions: ... } envelopes.
  if (value && !Array.isArray(value) && typeof value === 'object') {
    if (value.data !== undefined) value = value.data;
  }
  if (value && !Array.isArray(value) && typeof value === 'object') {
    if (Array.isArray(value.permissions)) value = value.permissions;
  }

  const out = new Set();

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (typeof item === 'string') out.add(item);
      else if (item && typeof item === 'object') {
        const key = item.name || item.permission || item.code || item.key || item.authority;
        if (key) out.add(key);
      }
    });
  } else if (value && typeof value === 'object') {
    // Grouped map: { RESOURCE: ['CREATE','READ'] | true } -> RESOURCE_ACTION / RESOURCE
    Object.entries(value).forEach(([resource, actions]) => {
      if (Array.isArray(actions)) {
        actions.forEach((action) => out.add(`${resource}_${action}`));
      } else if (typeof actions === 'string') {
        out.add(`${resource}_${actions}`);
      } else if (actions === true) {
        out.add(resource);
      }
    });
  }

  return Array.from(out);
};

export const rbacService = {
  // GET /rbac/permissions — the full permission catalog.
  async getPermissionCatalog() {
    try {
      const { data, error, success } = await get('/rbac/permissions');
      if (success) {
        return { data: normalizePermissionList(data), error: null };
      }
      return { data: [], error: error || { message: 'Failed to load permission catalog' } };
    } catch (err) {
      return { data: [], error: { message: err?.message || 'Failed to load permission catalog' } };
    }
  },

  // GET /rbac/roles/{role}/permissions — permissions granted to a single role.
  // skipAuthRedirect so a 403 on one role does not bounce the whole session.
  async getRolePermissions(role) {
    try {
      const { data, error, success } = await get(`/rbac/roles/${role}/permissions`, {
        skipAuthRedirect: true,
      });
      if (success) {
        return { data: normalizePermissionList(data), error: null };
      }
      return { data: [], error: error || { message: `Failed to load permissions for ${role}` } };
    } catch (err) {
      return { data: [], error: { message: err?.message || `Failed to load permissions for ${role}` } };
    }
  },

  // PUT /rbac/roles/{role}/permissions — replace a role's full permission set.
  // NOTE: this write endpoint may not exist on the backend yet; 404/405 are
  // surfaced as a clear "not implemented" message so the matrix degrades to a viewer.
  async setRolePermissions(role, permissions) {
    try {
      const { data, error, success } = await put(`/rbac/roles/${role}/permissions`, { permissions });
      if (success) {
        return { data: data?.data ?? data ?? null, error: null };
      }
      if (error?.status === 404 || error?.status === 405) {
        return {
          data: null,
          error: {
            message: `Saving is not available yet — the backend has no PUT /rbac/roles/${role}/permissions endpoint.`,
            status: error.status,
          },
        };
      }
      return { data: null, error: error || { message: `Failed to update permissions for ${role}` } };
    } catch (err) {
      return { data: null, error: { message: err?.message || `Failed to update permissions for ${role}` } };
    }
  },

  // POST /rbac/reload — reload the role→permission cache from the database.
  async reloadCache() {
    try {
      const { data, error, success } = await post('/rbac/reload', {});
      if (success) {
        return { data: data ?? null, error: null };
      }
      return { data: null, error: error || { message: 'Failed to reload RBAC cache' } };
    } catch (err) {
      return { data: null, error: { message: err?.message || 'Failed to reload RBAC cache' } };
    }
  },
};
