import React, { useState, useEffect } from 'react';
import Icon from '../AppIcon';


const RoleBasedNavigation = ({ 
  userRole = 'student', 
  activeRoute = '/', 
  onNavigate = () => {},
  onAction = () => {}, // New prop for handling actions (modals, etc.)
  isCollapsed = false,
  isMobile = false,
  isOpen = false,
  onToggle = () => {}
}) => {
  const [expandedItems, setExpandedItems] = useState({});

  const navigationConfig = {
    'inst-admin': [
      {
        label: 'Dashboard',
        path: '/inst-admin-dashboard',
        icon: 'LayoutDashboard',
        roles: ['inst-admin']
      },
      {
        label: 'Teacher Management',
        path: '/teacher-management',
        icon: 'Users',
        roles: ['inst-admin']
      },
      {
        label: 'Student Management',
        path: '/student-management',
        icon: 'GraduationCap',
        roles: ['inst-admin']
      },
      {
        label: 'Course Management',
        path: '/course-management',
        icon: 'BookOpen',
        roles: ['inst-admin']
      },
      {
        label: 'Question Management',
        path: '/test-management',
        icon: 'FileText',
        roles: ['inst-admin']
      },
      {
        label: 'Analytics',
        path: '/analytics-and-reports-screen',
        icon: 'BarChart3',
        roles: ['inst-admin']
      }
    ],
    'super-admin': [
      {
        label: 'Dashboard',
        path: '/super-admin-dashboard',
        icon: 'LayoutDashboard',
        roles: ['super-admin']
      },
      {
        label: 'Teacher Management',
        path: '/teacher-management',
        icon: 'Users',
        roles: ['super-admin']
      },
      {
        label: 'Student Management',
        path: '/student-management',
        icon: 'GraduationCap',
        roles: ['super-admin']
      },
      {
        label: 'Course Management',
        path: '/course-management',
        icon: 'BookOpen',
        roles: ['super-admin']
      },
      {
        label: 'Question Management',
        path: '/test-management',
        icon: 'FileText',
        roles: ['super-admin']
      },
      {
        label: 'Institute Management',
        path: '/institute-management',
        icon: 'Building2',
        roles: ['super-admin']
      },
      {
        label: 'Analytics',
        path: '/analytics-and-reports-screen',
        icon: 'BarChart3',
        roles: ['super-admin']
      }
    ],
    'teacher': [
      {
        label: 'Dashboard',
        path: '/teacher-dashboard',
        icon: 'LayoutDashboard',
        roles: ['teacher']
      },
      {
        label: 'Create Test',
        path: '/test-creation-screen',
        icon: 'FileText',
        roles: ['teacher']
      },
      {
        label: 'Students',
        path: '/student-management-screen',
        icon: 'Users',
        roles: ['teacher']
      },
      {
        label: 'Analytics',
        path: '/analytics-and-reports-screen',
        icon: 'BarChart3',
        roles: ['teacher']
      },
      {
        label: 'divider',
        type: 'divider'
      },
      {
        label: 'Create Student',
        action: 'show-student-modal',
        icon: 'UserPlus',
        roles: ['teacher'],
        type: 'action'
      },
      {
        label: 'Bulk Import',
        action: 'show-bulk-import',
        icon: 'Upload',
        roles: ['teacher'],
        type: 'action'
      }
    ],
    'student': [
      {
        label: 'Dashboard',
        path: '/student-dashboard',
        icon: 'LayoutDashboard',
        roles: ['student']
      },
      {
        label: 'Take Test',
        path: '/test-taking-interface',
        icon: 'PenTool',
        roles: ['student']
      },
      {
        label: 'My Progress',
        path: '/analytics-and-reports-screen',
        icon: 'TrendingUp',
        roles: ['student']
      }
    ]
  };

  const currentNavItems = navigationConfig?.[userRole] || navigationConfig?.['student'];

  const handleItemClick = (item) => {
    if (item?.type === 'divider') {
      return; // Don't handle divider clicks
    }
    
    if (item?.type === 'action') {
      onAction(item?.action);
      if (isMobile) {
        onToggle();
      }
    } else if (item?.children) {
      setExpandedItems(prev => ({
        ...prev,
        [item?.path]: !prev?.[item?.path]
      }));
    } else {
      onNavigate(item?.path);
      if (isMobile) {
        onToggle();
      }
    }
  };

  const isActiveRoute = (path) => {
    return activeRoute === path || activeRoute?.startsWith(path + '/');
  };

  const toggleExpanded = (path) => {
    setExpandedItems(prev => ({
      ...prev,
      [path]: !prev?.[path]
    }));
  };

  // Desktop Sidebar Navigation
  if (!isMobile) {
    return (
      <nav className={`hidden lg:block fixed left-0 top-16 h-[calc(100vh-4rem)] bg-card border-r border-border z-[999] transition-all duration-300 ease-out ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto py-4">
            <div className="space-y-1 px-3">
              {currentNavItems?.map((item, index) => (
                <div key={item?.path || item?.action || `divider-${index}`}>
                  {/* Divider */}
                  {item?.type === 'divider' ? (
                    <div className="my-3 border-t border-border"></div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleItemClick(item)}
                        className={`nav-item w-full justify-start ${
                          item?.type === 'action' 
                            ? 'hover:bg-accent/50' 
                            : isActiveRoute(item?.path) ? 'active' : ''
                        } ${isCollapsed ? 'px-3' : 'px-4'} ${
                          item?.type === 'action' ? 'font-medium' : ''
                        }`}
                        title={isCollapsed ? item?.label : ''}
                      >
                        <Icon 
                          name={item?.icon} 
                          size={20} 
                          className={`flex-shrink-0 ${item?.color || ''}`}
                        />
                        {!isCollapsed && (
                          <>
                            <span className={`ml-3 flex-1 text-left ${item?.color || ''}`}>
                              {item?.label}
                            </span>
                            {item?.children && (
                              <Icon 
                                name="ChevronRight" 
                                size={16} 
                                className={`transition-transform duration-200 ${
                                  expandedItems?.[item?.path] ? 'rotate-90' : ''
                                }`}
                              />
                            )}
                            {item?.badge && (
                              <span className="ml-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                                {item?.badge}
                              </span>
                            )}
                          </>
                        )}
                      </button>
                      
                      {/* Submenu items */}
                      {item?.children && !isCollapsed && expandedItems?.[item?.path] && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item?.children?.map((child) => (
                            <button
                              key={child?.path}
                              onClick={() => handleItemClick(child)}
                              className={`nav-item w-full justify-start text-sm ${
                                isActiveRoute(child?.path) ? 'active' : ''
                              }`}
                            >
                              <Icon name={child?.icon} size={16} />
                              <span className="ml-3">{child?.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Mobile Navigation (Bottom Tabs for Students, Slide-out for Others)
  if (userRole === 'student') {
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-[999] md:hidden">
        <div className="flex items-center justify-around py-2">
          {currentNavItems?.slice(0, 4)?.map((item) => (
            <button
              key={item?.path}
              onClick={() => handleItemClick(item)}
              className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                isActiveRoute(item?.path) 
                  ? 'text-primary bg-primary/10' :'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon name={item?.icon} size={20} />
              <span className="text-xs font-medium">{item?.label}</span>
            </button>
          ))}
        </div>
      </nav>
    );
  }

  // Mobile Slide-out Navigation for Admin/Teacher
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[998] md:hidden"
          onClick={onToggle}
        />
      )}
      {/* Slide-out Navigation */}
      <nav className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-card border-r border-border z-[999] transform transition-transform duration-300 ease-out md:hidden ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto py-4">
            <div className="space-y-1 px-3">
              {currentNavItems?.map((item, index) => (
                <div key={item?.path || item?.action || `divider-${index}`}>
                  {/* Divider */}
                  {item?.type === 'divider' ? (
                    <div className="my-3 border-t border-border"></div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleItemClick(item)}
                        className={`nav-item w-full justify-start ${
                          item?.type === 'action' 
                            ? 'hover:bg-accent/50 font-medium' 
                            : isActiveRoute(item?.path) ? 'active' : ''
                        }`}
                      >
                        <Icon 
                          name={item?.icon} 
                          size={20} 
                          className={`${item?.color || ''}`} 
                        />
                        <span className={`ml-3 flex-1 text-left ${item?.color || ''}`}>
                          {item?.label}
                        </span>
                        {item?.children && (
                          <Icon 
                            name="ChevronRight" 
                            size={16} 
                            className={`transition-transform duration-200 ${
                              expandedItems?.[item?.path] ? 'rotate-90' : ''
                            }`}
                          />
                        )}
                        {item?.badge && (
                          <span className="ml-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                            {item?.badge}
                          </span>
                        )}
                      </button>
                      
                      {/* Submenu items */}
                      {item?.children && expandedItems?.[item?.path] && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item?.children?.map((child) => (
                            <button
                              key={child?.path}
                              onClick={() => handleItemClick(child)}
                              className={`nav-item w-full justify-start text-sm ${
                                isActiveRoute(child?.path) ? 'active' : ''
                              }`}
                            >
                              <Icon name={child?.icon} size={16} />
                              <span className="ml-3">{child?.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default RoleBasedNavigation;