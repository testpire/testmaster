import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../AppIcon';
import Button from './Button';
import Select from './Select';

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
  // Institute dropdown props
  institutes = [],
  selectedInstitute = null,
  onInstituteChange = () => {},
  institutesLoading = false,
  showInstituteDropdown = false
}) => {
  const navigate = useNavigate();
  const { user, userProfile, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
    switch (role) {
      case 'super-admin':
        return 'Super Admin';
      case 'teacher':
        return 'Teacher';
      case 'student':
        return 'Student';
      default:
        return 'User';
    }
  };

  // Use auth context data if available, otherwise fall back to props
  const displayName = currentUser?.name || 
                     userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : 
                     user?.user_metadata?.full_name || 
                     userProfile?.full_name || 
                     userName;
  const displayRole = currentUser?.role || userProfile?.role || userRole;
  const displayAvatar = currentUser?.avatar || userProfile?.avatar_url || userAvatar;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-[1001]">
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
          
          {/* Institute Dropdown (Super Admin) or Logo (Other roles) */}
          <div className="flex items-center space-x-2">
            {showInstituteDropdown ? (
              <div className="flex items-center">
                {institutesLoading ? (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-muted rounded-lg">
                    <Icon name="Loader2" size={16} className="animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading institutes...</span>
                  </div>
                ) : (
                  <div className="min-w-[280px] relative">
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
              <>
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 text-primary-foreground"
                    fill="currentColor"
                  >
                    <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
                <div className={`transition-opacity duration-300 ${sidebarCollapsed && showSidebarToggle ? 'hidden lg:block' : 'hidden sm:block'}`}>
                  <h1 className="text-lg font-semibold text-foreground">TestMaster</h1>
                </div>
              </>
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
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-error text-error-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications > 9 ? '9+' : notifications}
                </span>
              )}
            </Button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-lg shadow-lg z-[1010]">
                <div className="p-4 border-b border-border">
                  <h3 className="font-medium text-popover-foreground">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications > 0 ? (
                    <div className="p-4 space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-sm text-popover-foreground">New test assigned: Mathematics Quiz</p>
                          <p className="text-xs text-muted-foreground mt-1">2 minutes ago</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-success rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-sm text-popover-foreground">Test completed successfully</p>
                          <p className="text-xs text-muted-foreground mt-1">1 hour ago</p>
                        </div>
                      </div>
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
              <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg z-[1010]">
                <div className="p-3 border-b border-border">
                  <p className="font-medium text-popover-foreground">{displayName}</p>
                  <p className="text-sm text-muted-foreground">{getRoleDisplayName(displayRole)}</p>
                </div>
                <div className="py-2">
                  <button
                    onClick={() => setShowUserMenu(false)}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
                  >
                    <Icon name="User" size={16} />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => setShowUserMenu(false)}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
                  >
                    <Icon name="Settings" size={16} />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => setShowUserMenu(false)}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
                  >
                    <Icon name="HelpCircle" size={16} />
                    <span>Help & Support</span>
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
  );
};

export default NavigationHeader;