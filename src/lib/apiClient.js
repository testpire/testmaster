import axios from 'axios';

// Base API configuration. Override per-environment via VITE_API_BASE_URL in .env
// (see .env.example); falls back to the current dev tunnel if unset so existing
// setups keep working. Examples:
//   http://localhost:8080/api
//   https://testpire.v43d8nfv0vckm.ap-south-1.cs.amazonlightsail.com/api
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://lists-rolling-zoloft-comment.trycloudflare.com/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token validation helper
const isValidJWT = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  // Basic JWT structure check (3 parts separated by dots)
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  // Check if each part is valid base64
  try {
    parts.forEach(part => atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return true;
  } catch (e) {
    return false;
  }
};

// Decode a JWT's `exp` claim into epoch-milliseconds, or null if the token is
// unparseable or carries no `exp`. Structure is validated first.
export const getTokenExpiryMs = (token) => {
  if (!isValidJWT(token)) return null;
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch (e) {
    return null;
  }
};

// A structurally valid token is "expired" once the wall clock passes its `exp`.
// Tokens with no `exp` claim are treated as non-expiring here — the backend
// still gets the final say via a 401.
export const isTokenExpired = (token) => {
  const expMs = getTokenExpiryMs(token);
  return expMs != null && Date.now() >= expMs;
};

// The single source of truth for "is the stored session usable right now":
// present, structurally valid, and not past its expiry.
export const hasUsableToken = () => {
  const t = localStorage.getItem('authToken');
  return !!t && isValidJWT(t) && !isTokenExpired(t);
};

// Token management
let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
  if (token && isValidJWT(token)) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    // Store token in localStorage for persistence
    localStorage.setItem('authToken', token);
  } else if (token && !isValidJWT(token)) {
    console.warn('Attempted to set invalid JWT token, ignoring');
    // Clear everything if invalid token is provided
    authToken = null;
    delete apiClient.defaults.headers.common['Authorization'];
    localStorage.removeItem('authToken');
  } else {
    // Explicitly clearing token
    delete apiClient.defaults.headers.common['Authorization'];
    localStorage.removeItem('authToken');
  }
};

// Initialize token from localStorage on app start
const storedToken = localStorage.getItem('authToken');
if (storedToken) {
  if (isValidJWT(storedToken) && !isTokenExpired(storedToken)) {
    setAuthToken(storedToken);
  } else {
    console.warn('Invalid or expired JWT token found in localStorage, clearing...');
    localStorage.removeItem('authToken');
  }
}

// List of endpoints that should not include Authorization header
const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/register/student',
  '/auth/register/teacher',
  '/auth/refresh'
];

// Clear the session and bounce to login from anywhere. Used both proactively
// (an expired/invalid token spotted before a request leaves) and reactively
// (a backend 401). Idempotent and safe to call when already on the login page.
const redirectToLogin = (reason) => {
  console.warn(`🔒 ${reason}; redirecting to login`);
  setAuthToken(null);
  clearAuthState();
  if (!window.location.pathname.includes('/login')) {
    window.location.replace('/login-screen');
  }
};

// Request interceptor for token refresh/validation
apiClient.interceptors.request.use(
  (config) => {
    // Remove Authorization header for public endpoints
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint => 
      config.url && config.url.includes(endpoint)
    );
    
    if (isPublicEndpoint) {
      // Remove Authorization header for public endpoints only
      if (config.headers.Authorization) {
        delete config.headers.Authorization;
      }
      if (config.headers.common && config.headers.common.Authorization) {
        delete config.headers.common.Authorization;
      }
    } else {
      // For authenticated endpoints, ensure we have a usable token.
      const currentToken = localStorage.getItem('authToken');
      if (currentToken && isValidJWT(currentToken) && !isTokenExpired(currentToken)) {
        if (!config.headers.Authorization && !config.headers.common?.Authorization) {
          config.headers.Authorization = `Bearer ${currentToken}`;
        }
      } else if (currentToken) {
        // Token present but structurally invalid or expired → we already KNOW the
        // user is logged out. Don't fire a doomed request; clear and redirect now.
        redirectToLogin(isTokenExpired(currentToken) ? 'Session expired' : 'Invalid token');
        return Promise.reject({ isAuthRedirect: true, message: 'Session expired' });
      }

      // Inject X-Institute-Id header for SUPER_ADMIN only.
      // Callers can opt out via `skipInstituteHeader` — notably the institute
      // list/search fetch, which must return the FULL set of institutes so a
      // SUPER_ADMIN can always switch. Scoping that call by the active institute
      // collapses the switcher to a single option and locks the dropdown.
      const userRole = localStorage.getItem('userRole');
      const activeInstituteId = localStorage.getItem('activeInstituteId');
      if (userRole === 'SUPER_ADMIN' && activeInstituteId && !config.skipInstituteHeader) {
        config.headers['X-Institute-Id'] = activeInstituteId;
      }
    }
    
    // Add timestamp to prevent caching
    config.params = {
      ...config.params,
      _t: Date.now(),
    };
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for comprehensive error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Prevent infinite loops
    if (originalRequest._isRetry) {
      return Promise.reject(error);
    }
    
    // 401 = invalid/expired session -> clear token and redirect to login.
    // (403 is handled separately below; a forbidden endpoint must NOT end the session.)
    if (error.response?.status === 401) {
      // Allow specific non-critical requests to opt out of the global redirect.
      if (originalRequest?.skipAuthRedirect) {
        return Promise.reject(error);
      }

      // Mark this as an auth redirect to prevent other error handlers
      error.isAuthRedirect = true;
      redirectToLogin('Session invalid/expired');

      // Return a resolved promise with auth error info to prevent error boundaries
      return Promise.resolve({
        data: { error: 'Authentication required' },
        status: 401,
        isAuthError: true
      });
    }

    // 403 = authenticated but not permitted for this role/resource.
    // Do NOT clear the session or redirect — let the calling code degrade
    // gracefully (e.g. hide a panel, show an inline message).
    if (error.response?.status === 403) {
      error.isForbidden = true;
      return Promise.reject(error);
    }
    
    // JWT parsing errors
    if (error.response?.status === 500 && 
        (error.response?.data?.message?.includes?.('JWT') || 
         error.message?.includes?.('JWT'))) {
      console.warn('🔑 JWT parsing error on backend, clearing token');
      setAuthToken(null);
      clearAuthState();
      return Promise.reject(error);
    }
    
    // Network errors - attempt retry for GET requests
    if (!error.response && originalRequest.method?.toLowerCase() === 'get' && !originalRequest._isRetry) {
      console.warn('🌐 Network error, attempting retry...');
      originalRequest._isRetry = true;
      
      // Wait a bit before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        return apiClient(originalRequest);
      } catch (retryError) {
        console.warn('🌐 Retry failed');
        return Promise.reject(retryError);
      }
    }
    
    // Server errors - don't crash the app
    if (error.response?.status >= 500) {
      console.warn('🚨 Server error, handling gracefully');
      error.isServerError = true;
    }
    
    return Promise.reject(error);
  }
);

// Enhanced API helper functions with comprehensive error handling
export const apiRequest = async (method, url, data = null, config = {}) => {
  try {
    // Ensure method is always uppercase and explicitly set
    const httpMethod = method.toUpperCase();
    
    // Debug log to confirm HTTP method is being set  
    console.log(`🌐 Making ${httpMethod} request to: ${url}`);
    
    const response = await apiClient({
      method: httpMethod,  // Explicitly set HTTP method
      url,
      data,
      ...config,
    });
    
    return {
      data: response.data,
      error: null,
      success: true,
    };
  } catch (error) {
    // Don't spam console with network errors during recovery
    if (!error.isServerError && !error.response?.status) {
      console.warn(`🌐 API ${method.toUpperCase()} ${url} network error (handled gracefully)`);
    } else if (error.response?.status >= 500) {
      console.warn(`🚨 API ${method.toUpperCase()} ${url} server error: ${error.response.status} (handled gracefully)`);
    } else {
      console.error(`❌ API ${method.toUpperCase()} ${url} error:`, error.response?.data || error.message);
    }
    
    let errorMessage;
    
    // Handle different error types gracefully
    if (!error.response) {
      // Network error
      errorMessage = 'Connection issue. Please check your internet connection.';
    } else if (error.response.status >= 500) {
      // Server error
      errorMessage = 'Server is temporarily unavailable. Please try again in a moment.';
    } else if (error.response.status === 404) {
      // Not found
      errorMessage = 'Requested resource not found.';
    } else if (error.response.status === 403) {
      // Forbidden
      errorMessage = 'You do not have permission to access this resource.';
    } else if (error.response.status === 401) {
      // Unauthorized
      errorMessage = 'Your session has expired. Please log in again.';
    } else {
      // Other errors
      errorMessage = error.response?.data?.message || 
                    error.response?.data?.error || 
                    error.message || 
                    'An unexpected error occurred';
    }
    
    return {
      data: null,
      error: {
        message: errorMessage,
        status: error.response?.status,
        code: error.response?.data?.code,
        isNetworkError: !error.response,
        isServerError: error.response?.status >= 500,
      },
      success: false,
    };
  }
};

// Effective institute id for request BODIES. For SUPER_ADMIN this is the institute
// selected in the switcher (same source as the X-Institute-Id header injected above),
// so the request body and the tenant header always agree. Returns null for other roles,
// whose own institute (from the JWT/profile) is already correct and must be preserved.
export const getActiveInstituteId = () => {
  const userRole = localStorage.getItem('userRole');
  const activeInstituteId = localStorage.getItem('activeInstituteId');
  if (userRole === 'SUPER_ADMIN' && activeInstituteId) {
    const n = Number(activeInstituteId);
    return Number.isNaN(n) ? null : n;
  }
  return null;
};

// HTTP method helpers
export const get = (url, config = {}) => apiRequest('GET', url, null, config);
export const post = (url, data, config = {}) => apiRequest('POST', url, data, config);
export const put = (url, data, config = {}) => apiRequest('PUT', url, data, config);
export const patch = (url, data, config = {}) => apiRequest('PATCH', url, data, config);
export const del = (url, config = {}) => apiRequest('DELETE', url, null, config);

// Unauthenticated request helpers (explicit no-auth requests)
export const postUnauthenticated = (url, data, config = {}) => {
  const unauthConfig = {
    ...config,
    headers: {
      ...config.headers,
      'Content-Type': 'application/json',
      // Explicitly remove Authorization header
      Authorization: undefined
    }
  };
  delete unauthConfig.headers.Authorization;
  return apiRequest('POST', url, data, unauthConfig);
};

// Helper to clear all auth state and force clean login
export const clearAuthState = () => {
  console.log('Clearing all authentication state');
  setAuthToken(null);
  // Clear any other auth-related localStorage items
  Object.keys(localStorage).forEach(key => {
    if (key.includes('auth') || key.includes('token') || key.includes('session')) {
      localStorage.removeItem(key);
    }
  });
  // Clear institute context keys
  localStorage.removeItem('userRole');
  localStorage.removeItem('activeInstituteId');
};

export default apiClient;
