// Legacy Supabase configuration - kept for backward compatibility
// New API uses the apiClient configuration

// NOTE: This file is deprecated and should not be used for new functionality
// Use src/lib/apiClient.js instead for the new backend API

export const supabase = null; // Disabled Supabase

// Test connection helper - now uses new API
export const testConnection = async () => {
  try {
    // Test new API connection
    const response = await fetch('https://testpire-svc.brz9vh5stea0g.ap-south-1.cs.amazonlightsail.com/api/auth/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken') || 'test'}`
      }
    });
    
    if (response.status === 401) {
      return { success: true, message: 'New API is reachable (authentication required)' };
    }
    
    return { success: true, message: 'Connected to new API successfully' };
  } catch (error) {
    return { success: false, message: `New API connection failed: ${error?.message}` };
  }
};