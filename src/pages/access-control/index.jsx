import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import { rbacService, RBAC_ROLES } from '../../services/rbacService';
import PageLayout from '../../components/layout/PageLayout';
import Button from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import Icon from '../../components/AppIcon';

// SUPER_ADMIN bypasses RBAC by convention, so its column is locked (always
// granted, not editable) to avoid a self-lockout. The rest are editable.
const EDITABLE_ROLES = RBAC_ROLES.filter((r) => r !== 'SUPER_ADMIN');

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  INST_ADMIN: 'Institute Admin',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
};

// Split a permission key into a resource group + readable action.
// "QUESTION_CREATE" -> { group: 'QUESTION', label: 'Create' }
const parsePermission = (key) => {
  const idx = key.indexOf('_');
  if (idx === -1) return { group: 'GENERAL', label: key };
  return {
    group: key.slice(0, idx),
    label: key
      .slice(idx + 1)
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  };
};

const AccessControl = () => {
  const { user, userProfile } = useAuth();
  const currentUser = userProfile || user;

  // SuperAdminContext is only mounted for SUPER_ADMIN (via ProtectedManagementRoutes).
  let superAdminContext = null;
  try {
    superAdminContext = useSuperAdmin();
  } catch (e) {
    superAdminContext = null;
  }

  const [catalog, setCatalog] = useState([]);
  // granted: { ROLE: Set<permission> } as loaded from the server (baseline)
  const [granted, setGranted] = useState({});
  // draft: { ROLE: Set<permission> } as edited locally
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type, text }
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      const [catalogResult, ...roleResults] = await Promise.all([
        rbacService.getPermissionCatalog(),
        ...RBAC_ROLES.map((role) => rbacService.getRolePermissions(role)),
      ]);

      const roleMap = {};
      RBAC_ROLES.forEach((role, i) => {
        roleMap[role] = new Set(roleResults[i]?.data || []);
      });

      // Build the catalog from the explicit catalog plus any permissions that
      // appear on a role but are missing from the catalog (so nothing is hidden).
      const allPerms = new Set(catalogResult?.data || []);
      Object.values(roleMap).forEach((set) => set.forEach((p) => allPerms.add(p)));

      setCatalog(Array.from(allPerms).sort());
      setGranted(roleMap);
      // Clone sets for the editable draft.
      const draftMap = {};
      RBAC_ROLES.forEach((role) => {
        draftMap[role] = new Set(roleMap[role]);
      });
      setDraft(draftMap);

      if (catalogResult?.error && (catalogResult?.data || []).length === 0) {
        setError(catalogResult.error.message || 'Failed to load the permission catalog.');
      }
    } catch (err) {
      console.error('Failed to load RBAC data:', err);
      setError('Failed to load access-control data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount, and reload when a super-admin switches the active institute.
  // Keyed on the stable auth user id (user/userProfile settle in separate renders,
  // so depending on both double-fires the load) and the active institute id.
  const authUserId = (userProfile || user)?.id ?? null;
  const selectedInstituteId = superAdminContext?.selectedInstitute?.id ?? null;
  useEffect(() => {
    if (!authUserId) return;
    loadData();
  }, [authUserId, selectedInstituteId, loadData]);

  const togglePermission = (role, permission) => {
    if (role === 'SUPER_ADMIN') return; // locked
    setStatusMessage(null);
    setDraft((prev) => {
      const next = { ...prev };
      const set = new Set(next[role]);
      if (set.has(permission)) set.delete(permission);
      else set.add(permission);
      next[role] = set;
      return next;
    });
  };

  // Which editable roles have unsaved changes vs the loaded baseline.
  const dirtyRoles = useMemo(() => {
    return EDITABLE_ROLES.filter((role) => {
      const a = granted[role] || new Set();
      const b = draft[role] || new Set();
      if (a.size !== b.size) return true;
      for (const p of b) if (!a.has(p)) return true;
      return false;
    });
  }, [granted, draft]);

  const groups = useMemo(() => {
    const filter = search.trim().toLowerCase();
    const map = new Map();
    catalog.forEach((perm) => {
      if (filter && !perm.toLowerCase().includes(filter)) return;
      const { group } = parsePermission(perm);
      if (!map.has(group)) map.set(group, []);
      map.get(group).push(perm);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [catalog, search]);

  const handleSave = async () => {
    if (dirtyRoles.length === 0) return;
    setSaving(true);
    setStatusMessage(null);

    const results = await Promise.all(
      dirtyRoles.map((role) =>
        rbacService
          .setRolePermissions(role, Array.from(draft[role]))
          .then((res) => ({ role, ...res }))
      )
    );

    const failures = results.filter((r) => r.error);
    const succeeded = results.filter((r) => !r.error).map((r) => r.role);

    // Commit successful roles to the baseline so they're no longer dirty.
    if (succeeded.length > 0) {
      setGranted((prev) => {
        const next = { ...prev };
        succeeded.forEach((role) => {
          next[role] = new Set(draft[role]);
        });
        return next;
      });
      // Reload the cache so the backend serves the new grants.
      await rbacService.reloadCache();
    }

    if (failures.length === 0) {
      setStatusMessage({
        type: 'success',
        text: `Saved ${succeeded.map((r) => ROLE_LABELS[r]).join(', ')}.`,
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: failures.map((f) => `${ROLE_LABELS[f.role]}: ${f.error.message}`).join(' '),
      });
    }
    setSaving(false);
  };

  const handleDiscard = () => {
    setStatusMessage(null);
    const draftMap = {};
    RBAC_ROLES.forEach((role) => {
      draftMap[role] = new Set(granted[role] || []);
    });
    setDraft(draftMap);
  };

  const handleReloadCache = async () => {
    setReloading(true);
    setStatusMessage(null);
    const { error: reloadError } = await rbacService.reloadCache();
    if (reloadError) {
      setStatusMessage({ type: 'error', text: reloadError.message || 'Failed to reload cache.' });
    } else {
      await loadData();
      setStatusMessage({ type: 'success', text: 'RBAC cache reloaded from the database.' });
    }
    setReloading(false);
  };

  const isChecked = (role, perm) =>
    role === 'SUPER_ADMIN' ? true : (draft[role] || new Set()).has(perm);

  const isDirtyCell = (role, perm) => {
    if (role === 'SUPER_ADMIN') return false;
    const base = (granted[role] || new Set()).has(perm);
    const cur = (draft[role] || new Set()).has(perm);
    return base !== cur;
  };

  return (
    <PageLayout
      title="Access Control"
      showInstituteDropdown={currentUser?.role === 'SUPER_ADMIN'}
      institutes={superAdminContext?.allInstitutes || []}
      selectedInstitute={superAdminContext?.selectedInstitute || null}
      onInstituteChange={superAdminContext?.handleInstituteChange || (() => {})}
      institutesLoading={superAdminContext?.institutesLoading || false}
    >
      <div className="p-6">
        {/* Heading */}
        <div className="mb-4">
          <h1 className="font-display text-2xl font-semibold text-foreground flex items-center gap-2">
            <Icon name="ShieldCheck" size={24} />
            Role-Based Access Control
          </h1>
          <p className="text-muted-foreground mt-1">
            Grant or revoke permissions for each role. Super Admin has full access and cannot be edited.
          </p>
        </div>

        {/* Backend-capability note */}
        <div className="mb-4 p-3 bg-primary/10 border border-primary/40 rounded-lg flex items-start gap-2 text-sm">
          <Icon name="Info" size={16} className="text-primary mt-0.5 flex-shrink-0" />
          <p className="text-primary">
            Saving requires the RBAC write API (<code>PUT /api/rbac/roles/&#123;role&#125;/permissions</code>).
            If it isn't deployed yet, this page still works as a live viewer and Save will report it clearly.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/40 rounded-lg">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {statusMessage && (
          <div
            className={`mb-4 p-3 rounded-lg border flex items-start gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-success/15 border-success/40 text-success'
                : 'bg-destructive/10 border-destructive/40 text-destructive'
            }`}
          >
            <Icon
              name={statusMessage.type === 'success' ? 'CheckCircle' : 'AlertCircle'}
              size={16}
              className="mt-0.5 flex-shrink-0"
            />
            <p className="text-sm">{statusMessage.text}</p>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="relative">
            <Icon
              name="Search"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search permissions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-input rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/70 focus:border-primary w-72"
            />
          </div>

          <div className="flex items-center gap-3">
            {dirtyRoles.length > 0 && (
              <span className="text-sm text-warning font-medium">
                {dirtyRoles.length} role{dirtyRoles.length === 1 ? '' : 's'} with unsaved changes
              </span>
            )}
            <Button
              variant="outline"
              onClick={handleReloadCache}
              disabled={reloading || saving}
              iconName={reloading ? 'Loader2' : 'RefreshCw'}
              iconPosition="left"
              className={reloading ? 'animate-pulse' : ''}
            >
              Reload Cache
            </Button>
            <Button
              variant="outline"
              onClick={handleDiscard}
              disabled={dirtyRoles.length === 0 || saving}
            >
              Discard
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              disabled={dirtyRoles.length === 0 || saving}
              iconName={saving ? 'Loader2' : 'Save'}
              iconPosition="left"
              className={saving ? 'animate-pulse' : ''}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Matrix */}
        {loading ? (
          <div className="text-center py-12">
            <Icon name="Loader" size={24} className="animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading permissions...</p>
          </div>
        ) : catalog.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Icon name="ShieldOff" size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-display text-lg font-semibold mb-1">No permissions found</h3>
            <p>The permission catalog returned no entries.</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-muted">
                  <tr>
                    <th className="sticky left-0 z-10 bg-muted px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[16rem]">
                      Permission
                    </th>
                    {RBAC_ROLES.map((role) => (
                      <th
                        key={role}
                        className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                      >
                        {ROLE_LABELS[role]}
                        {role === 'SUPER_ADMIN' && (
                          <Icon
                            name="Lock"
                            size={12}
                            className="inline ml-1 text-muted-foreground align-middle"
                          />
                        )}
                        {dirtyRoles.includes(role) && (
                          <span className="ml-1 inline-block w-2 h-2 rounded-full bg-warning align-middle" />
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {groups.map(([group, perms]) => (
                    <React.Fragment key={group}>
                      <tr className="bg-muted/70">
                        <td
                          colSpan={RBAC_ROLES.length + 1}
                          className="sticky left-0 px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                        >
                          {group}
                        </td>
                      </tr>
                      {perms.map((perm) => {
                        const { label } = parsePermission(perm);
                        return (
                          <tr key={perm} className="hover:bg-muted">
                            <td className="sticky left-0 z-10 bg-card px-6 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-foreground">{label}</div>
                              <div className="text-xs text-muted-foreground font-mono">{perm}</div>
                            </td>
                            {RBAC_ROLES.map((role) => (
                              <td
                                key={role}
                                className={`px-4 py-3 text-center ${
                                  isDirtyCell(role, perm) ? 'bg-warning/15' : ''
                                }`}
                              >
                                <div className="flex justify-center">
                                  <Checkbox
                                    checked={isChecked(role, perm)}
                                    disabled={role === 'SUPER_ADMIN' || saving}
                                    onChange={() => togglePermission(role, perm)}
                                  />
                                </div>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && catalog.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            {catalog.length} permissions across {RBAC_ROLES.length} roles
            {search && ` — filtered by "${search}"`}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default AccessControl;
