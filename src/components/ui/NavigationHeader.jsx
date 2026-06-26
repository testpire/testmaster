import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useInstitute } from '../../contexts/InstituteContext';
import Icon from '../AppIcon';
import Button from './Button';
import Select from './Select';
import InstituteLogoModal from './InstituteLogoModal';
import { ADMIN_ROLES } from '../../utils/roleBasedRouting';
import { newInstituteService } from '../../services/newInstituteService';
import { newTestService } from '../../services/newTestService';
import { formatDateTime } from '../../pages/test-management/testConstants';

const NavigationHeader = ({
  userRole = 'student',
  userName = 'John Doe',
  userAvatar = null,
  currentUser = null,
  onLogout = () => {},
  onMenuToggle = () => {},
  showMenuToggle = false,
  onSidebarToggle = () => {},
  showSidebarToggle = false,
  sidebarCollapsed = false,
  notifications = 0,
  // Institute dropdown props (kept for backward-compat but overridden by context)
  institutes: institutesProp = [],
  selectedInstitute: selectedInstituteProp = null,
  onInstituteChange: onInstituteChangeProp = () => {},
  institutesLoading: institutesLoadingProp = false,
  showInstituteDropdown: showInstituteDropdownProp = false
}) => {
  const navigate = useNavigate();
  const { user, userProfile, signOut } = useAuth();

  // Pull live institute state from context (single source of truth)
  const {
    allInstitutes: ctxInstitutes,
    activeInstitute: ctxActiveInstitute,
    institutesLoading: ctxInstitutesLoading,
    setActiveInstitute: ctxSetActiveInstitute,
    patchInstitute: ctxPatchInstitute,
  } = useInstitute();

  // The institute switcher is a super-admin concern. Show it on every page for
  // a SUPER_ADMIN (regardless of what the page passed) so it stays consistent
  // from login to logout; other roles fall back to the per-page prop.
  const effectiveRole = (userProfile?.role || user?.role || userRole || '')
    .toString().toUpperCase().replace(/-/g, '_');
  const isSuperAdmin = effectiveRole === 'SUPER_ADMIN' || effectiveRole === 'SUPERADMIN';
  const isStudent = effectiveRole === 'STUDENT';
  const showInstituteDropdown = isSuperAdmin || showInstituteDropdownProp;
  // Admins (super-admin + institute-admin) may change the institute logo; every
  // other role views it read-only. The backend enforces this too.
  const canEditLogo = ADMIN_ROLES.includes(effectiveRole);

  // Resolve effective values: context wins when the dropdown is shown (SUPER_ADMIN),
  // otherwise fall back to the props passed by callers.
  const institutes = showInstituteDropdown ? ctxInstitutes : institutesProp;
  const selectedInstitute = showInstituteDropdown ? ctxActiveInstitute : selectedInstituteProp;
  const institutesLoading = showInstituteDropdown ? ctxInstitutesLoading : institutesLoadingProp;
  const onInstituteChange = showInstituteDropdown
    ? (instituteId) => {
        const institute = ctxInstitutes.find(
          (inst) => String(inst.id) === String(instituteId)
        );
        if (institute) ctxSetActiveInstitute(institute);
      }
    : onInstituteChangeProp;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [instituteName, setInstituteName] = useState('');
  // Institute logo shown top-left (tenant brand mark). Seeded from the resolved
  // institute below and updated in place after an admin uploads/removes it.
  const [logoUrl, setLogoUrl] = useState('');
  const [showLogoModal, setShowLogoModal] = useState(false);
  // Student-only: tests assigned to the student that they haven't attempted yet.
  // Fetched once on mount; non-students keep an empty list (blank dropdown).
  const [testNotifications, setTestNotifications] = useState([]);
  // IDs dismissed by the student this session (persisted to localStorage per user).
  const [dismissedIds, setDismissedIds] = useState(new Set());

  // For non-super-admin roles, resolve the user's fixed institute (name + logo)
  // to show top-left. Uses skipAuthRedirect so a forbidden read can't force a logout.
  const instituteId = userProfile?.instituteId || user?.instituteId;
  useEffect(() => {
    if (showInstituteDropdown || !instituteId) {
      setInstituteName('');
      setLogoUrl('');
      return;
    }
    let mounted = true;
    newInstituteService
      .getInstituteById(instituteId, { skipAuthRedirect: true })
      .then(({ data }) => {
        const inst = data?.institute || data?.data || data;
        if (!mounted || !inst) return;
        if (inst.name) setInstituteName(inst.name);
        setLogoUrl(inst.logoUrl || '');
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [showInstituteDropdown, instituteId]);

  // For SUPER_ADMIN, the logo tracks the active institute from the switcher, so
  // it updates as they switch institutes (no extra fetch — the cached list
  // already carries logoUrl).
  useEffect(() => {
    if (!showInstituteDropdown) return;
    setLogoUrl(selectedInstitute?.logoUrl || '');
  }, [showInstituteDropdown, selectedInstitute?.id, selectedInstitute?.logoUrl]);

  // Notifications for students: surface newly assigned tests they haven't started.
  // A test is "new" when there's no attempt yet (empty or NOT_STARTED status).
  useEffect(() => {
    if (!isStudent) {
      setTestNotifications([]);
      return;
    }
    let mounted = true;
    newTestService
      .getAvailableTests()
      .then(({ data }) => {
        if (!mounted) return;
        const rows = Array.isArray(data) ? data : [];
        const pending = rows.filter((t) => {
          const status = (t.attemptStatus || t.status || t.attempt?.status || '')
            .toString().toUpperCase();
          return status === '' || status === 'NOT_STARTED';
        });
        setTestNotifications(
          pending.map((t) => ({
            id: t.testId ?? t.id,
            title: t.title || `Test #${t.testId ?? t.id}`,
            when: formatDateTime(t.availableFrom) || null,
          }))
        );
      })
      .catch(() => { if (mounted) setTestNotifications([]); });
    return () => { mounted = false; };
  }, [isStudent]);

  // Load per-user dismissed IDs from localStorage when user identity resolves.
  const userId = userProfile?.id || user?.id || '';
  useEffect(() => {
    if (!userId || !isStudent) return;
    try {
      const raw = localStorage.getItem(`notif_dismissed_${userId}`);
      if (raw) setDismissedIds(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }, [userId, isStudent]);

  const persistDismissed = (ids) => {
    if (!userId) return;
    try { localStorage.setItem(`notif_dismissed_${userId}`, JSON.stringify([...ids])); } catch {}
  };

  const dismissNotification = (id) => {
    const next = new Set(dismissedIds);
    next.add(id);
    setDismissedIds(next);
    persistDismissed(next);
  };

  const dismissAll = () => {
    const next = new Set(testNotifications.map((n) => n.id));
    setDismissedIds(next);
    persistDismissed(next);
  };

  const visibleNotifications = testNotifications.filter((n) => !dismissedIds.has(n.id));
  const notificationCount = isStudent ? visibleNotifications.length : notifications;

  const handleUserMenuToggle = () => {
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false);
  };

  const handleNotificationsToggle = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  };

  const handleLogout = async () => {
    try {
      setSigningOut(true);
      setShowUserMenu(false);
      
      // Call the signOut method from AuthContext
      const { error } = await signOut();
      
      if (error) {
        console.error('Signout error:', error);
        // Still redirect even if there's an error to ensure user is logged out
      }
      
      // Call the parent onLogout if provided for any additional cleanup
      onLogout?.();
      
      // Navigate to login page
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Unexpected signout error:', error);
      // Still redirect to login page
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  const getRoleDisplayName = (role) => {
    switch ((role || '').toString().toLowerCase().replace(/-/g, '_')) {
      case 'super_admin':
      case 'superadmin':
        return 'Super Admin';
      case 'inst_admin':
      case 'institute_admin':
      case 'admin':
        return 'Admin';
      case 'teacher':
        return 'Teacher';
      case 'student':
        return 'Student';
      default:
        return 'User';
    }
  };

  // Use auth context data if available, otherwise fall back to props - with safe null checks
  const displayName = currentUser?.name || 
                     (userProfile?.firstName ? `${userProfile?.firstName} ${userProfile?.lastName || ''}`.trim() : null) ||
                     user?.user_metadata?.full_name || 
                     userProfile?.full_name || 
                     userName || 
                     'User';
  const displayRole = currentUser?.role || userProfile?.role || userRole;
  const displayAvatar = currentUser?.avatar || userProfile?.avatar_url || userAvatar;

  // The institute whose logo the header shows/edits: the active one for a
  // SUPER_ADMIN, otherwise the user's own institute.
  const logoInstituteId = showInstituteDropdown ? selectedInstitute?.id : instituteId;
  const logoInstituteName = showInstituteDropdown ? selectedInstitute?.name : instituteName;
  const canManageLogo = canEditLogo && logoInstituteId != null;

  // Reflect an upload/removal immediately, and keep the super-admin's cached
  // institute in sync so switching away and back shows the right logo.
  const handleLogoSaved = (updated) => {
    const newLogo = updated?.logoUrl || '';
    setLogoUrl(newLogo);
    if (showInstituteDropdown && logoInstituteId != null) {
      ctxPatchInstitute?.(logoInstituteId, { logoUrl: newLogo });
    }
  };

  return (
    <>
    <header className="fixed top-0 left-0 right-0 h-16 bg-card/85 backdrop-blur-md border-b border-border z-[1001]">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left Section - Logo and Menu Toggle */}
        <div className="flex items-center space-x-4">
          {/* Desktop Sidebar Toggle */}
          {showSidebarToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSidebarToggle}
              className="hidden lg:flex hover:bg-muted"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Icon name="Menu" size={20} />
            </Button>
          )}

          {/* Mobile Menu Toggle */}
          {showMenuToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuToggle}
              className="lg:hidden"
            >
              <Icon name="Menu" size={20} />
            </Button>
          )}
          
          {/* Institute logo — tenant brand mark, top-left (shown on mobile too).
              Admins can click to manage it; every other role views it read-only. */}
          {logoUrl ? (
            canManageLogo ? (
              <button
                type="button"
                onClick={() => setShowLogoModal(true)}
                title="Change institute logo"
                aria-label="Change institute logo"
                className="group relative shrink-0 inline-flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <img
                  src={logoUrl}
                  alt={`${logoInstituteName || 'Institute'} logo`}
                  className="h-9 w-auto max-w-[120px] sm:max-w-[160px] object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <span className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-foreground/40 rounded-lg">
                  <Icon name="Pencil" size={14} className="text-background" />
                </span>
              </button>
            ) : (
              <img
                src={logoUrl}
                alt={`${logoInstituteName || 'Institute'} logo`}
                className="shrink-0 h-9 w-auto max-w-[120px] sm:max-w-[160px] object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )
          ) : (
            canManageLogo && (
              <button
                type="button"
                onClick={() => setShowLogoModal(true)}
                title="Add institute logo"
                className="shrink-0 h-9 px-2.5 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors text-xs font-medium"
              >
                <Icon name="ImagePlus" size={16} />
                <span className="hidden sm:inline">Add logo</span>
              </button>
            )
          )}

          {/* Institute Dropdown (Super Admin) or Institute name (Other roles) */}
          <div className="flex items-center space-x-2">
            {showInstituteDropdown ? (
              <div className="flex items-center">
                {institutesLoading ? (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-muted rounded-lg">
                    <Icon name="Loader2" size={16} className="animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading institutes...</span>
                  </div>
                ) : (
                  <div className="w-full sm:min-w-[240px] max-w-[55vw] sm:max-w-none relative">
                    <div className="relative">
                      <Select
                        value={selectedInstitute?.id || 'all'}
                        onChange={onInstituteChange}
                        placeholder="Select Institute"
                        options={institutes.map(institute => ({
                          value: institute.id,
                          label: `${institute.name}${institute.code !== 'ALL' ? ` (${institute.code})` : ''}`
                        }))}
                        className="text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              instituteName && (
                <div className="hidden sm:block border-l border-border pl-3 ml-1">
                  <h1 className="font-display text-base font-semibold text-foreground leading-tight">
                    {instituteName}
                  </h1>
                </div>
              )
            )}
          </div>
        </div>

        {/* Right Section - Notifications and User Menu */}
        <div className="flex items-center space-x-2">
          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNotificationsToggle}
              className="relative"
            >
              <Icon name="Bell" size={20} />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-error text-error-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </Button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] bg-popover border border-border rounded-lg shadow-lg z-[1010]">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-medium text-popover-foreground">Notifications</h3>
                  {visibleNotifications.length > 0 && (
                    <button
                      onClick={dismissAll}
                      className="text-xs text-primary hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {visibleNotifications.length > 0 ? (
                    <div className="p-4 space-y-3">
                      {visibleNotifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            dismissNotification(n.id);
                            setShowNotifications(false);
                            navigate('/my-tests');
                          }}
                          className="w-full flex items-start space-x-3 text-left hover:bg-muted -mx-2 px-2 py-1 rounded transition-colors"
                        >
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1">
                            <p className="text-sm text-popover-foreground">New test assigned: {n.title}</p>
                            {n.when && (
                              <p className="text-xs text-muted-foreground mt-1">Available from {n.when}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <Icon name="Bell" size={32} className="mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No new notifications</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              onClick={handleUserMenuToggle}
              className="flex items-center space-x-2 px-3"
              disabled={signingOut}
            >
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={displayName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <Icon name="User" size={16} />
                )}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-foreground">{displayName}</p>
                <p className="text-xs text-muted-foreground">{getRoleDisplayName(displayRole)}</p>
              </div>
              <Icon name="ChevronDown" size={16} className="hidden md:block" />
            </Button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-1rem)] bg-popover border border-border rounded-lg shadow-lg z-[1010]">
                <div className="p-3 border-b border-border">
                  <p className="font-medium text-popover-foreground">{displayName}</p>
                  <p className="text-sm text-muted-foreground">{getRoleDisplayName(displayRole)}</p>
                </div>
                <div className="py-2">
                  <button
                    onClick={() => { setShowUserMenu(false); navigate('/profile'); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
                  >
                    <Icon name="User" size={16} />
                    <span>Profile</span>
                  </button>
                  <div className="border-t border-border my-2"></div>
                  <button
                    onClick={handleLogout}
                    disabled={signingOut}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-error hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <Icon name={signingOut ? "Loader2" : "LogOut"} size={16} className={signingOut ? "animate-spin" : ""} />
                    <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay to close dropdowns */}
      {(showUserMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-[1005]"
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </header>

    {/* Logo manager — rendered OUTSIDE the <header> on purpose: the header's
        backdrop-blur establishes a containing block for fixed descendants, which
        would otherwise trap this modal's full-screen overlay inside the 64px bar. */}
    {canManageLogo && (
      <InstituteLogoModal
        isOpen={showLogoModal}
        onClose={() => setShowLogoModal(false)}
        instituteId={logoInstituteId}
        instituteName={logoInstituteName}
        currentLogoUrl={logoUrl}
        onSaved={handleLogoSaved}
      />
    )}
    </>
  );
};

export default NavigationHeader;