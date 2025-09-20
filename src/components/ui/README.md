# Reusable UI Components

## Professional Sidebar Toggle (Recommended)

The best practice is to integrate the sidebar toggle directly into the NavigationHeader component for a professional look.

### Usage with NavigationHeader (Recommended)

```jsx
import NavigationHeader from '../../components/ui/NavigationHeader';
import RoleBasedNavigation from '../../components/ui/RoleBasedNavigation';
import useSidebar from '../../hooks/useSidebar';

const YourPage = () => {
  const { sidebarCollapsed, toggleSidebar } = useSidebar();

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader
        userRole="super-admin"
        userName="John Doe"
        onSidebarToggle={toggleSidebar}
        showSidebarToggle={true}
        sidebarCollapsed={sidebarCollapsed}
        // ... other props
      />
      
      <RoleBasedNavigation
        userRole="super-admin"
        isCollapsed={sidebarCollapsed}
        // ... other props
      />
      
      <main className={`transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      } pt-16`}>
        {/* Page content */}
      </main>
    </div>
  );
};
```

## Standalone SidebarToggle Component

For cases where you need a standalone toggle button.

### Usage

```jsx
import SidebarToggle from '../../components/ui/SidebarToggle';
import useSidebar from '../../hooks/useSidebar';

const YourComponent = () => {
  const { sidebarCollapsed, toggleSidebar } = useSidebar();

  return (
    <div>
      {/* Header placement (recommended) */}
      <SidebarToggle
        isCollapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        position="header"
      />
      
      {/* Floating placement (use sparingly) */}
      <SidebarToggle
        isCollapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        position="floating"
      />
    </div>
  );
};
```

### Props

- `isCollapsed` (boolean): Whether the sidebar is currently collapsed
- `onToggle` (function): Function to call when the toggle is clicked
- `position` (string): "header" (default) or "floating"
- `className` (string, optional): Additional CSS classes
- `variant` (string, optional): Button variant ('ghost' by default)
- `size` (string, optional): Button size ('icon' by default)

### NavigationHeader Props

- `showSidebarToggle` (boolean): Whether to show the sidebar toggle button
- `onSidebarToggle` (function): Function to call when sidebar toggle is clicked
- `sidebarCollapsed` (boolean): Current sidebar state for proper styling

### Features

- **Professional placement**: Integrated in navigation header
- **Persistent state**: Sidebar state is saved to localStorage
- **Standard hamburger icon**: Uses consistent 3-line menu icon
- **Responsive design**: Only visible on desktop (lg+ screens)
- **Accessible**: Includes proper tooltips
- **Smooth animations**: 300ms transition duration

## useSidebar Hook

A custom hook for managing sidebar state across pages.

### Usage

```jsx
import useSidebar from '../../hooks/useSidebar';

const YourComponent = () => {
  const { 
    sidebarCollapsed,    // Current collapsed state
    setSidebarCollapsed, // Direct state setter
    toggleSidebar        // Toggle function
  } = useSidebar();

  // Optional: Pass default collapsed state
  const { sidebarCollapsed } = useSidebar(true); // Default to collapsed
};
```

### Features

- **Persistent state**: Automatically saves/loads from localStorage
- **Default values**: Accepts optional default collapsed state
- **Multiple methods**: Provides both direct setter and toggle function
- **Type safe**: Properly handles localStorage serialization

### Implementation Example

For a complete page implementation, see:
`/src/pages/super-admin-dashboard/index.jsx`
