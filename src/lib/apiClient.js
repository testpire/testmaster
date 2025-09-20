import axios from 'axios';

// Base API configuration
//const API_BASE_URL = 'http://localhost:8080/api';
const API_BASE_URL = 'https://testpire-svc.brz9vh5stea0g.ap-south-1.cs.amazonlightsail.com/api';

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
  if (isValidJWT(storedToken)) {
    setAuthToken(storedToken);
  } else {
    console.warn('Invalid JWT token found in localStorage, clearing...');
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
      // For authenticated endpoints, ensure we have a valid token
      const currentToken = localStorage.getItem('authToken');
      if (currentToken && isValidJWT(currentToken)) {
        if (!config.headers.Authorization && !config.headers.common?.Authorization) {
          config.headers.Authorization = `Bearer ${currentToken}`;
        }
      } else if (currentToken && !isValidJWT(currentToken)) {
        // Clear invalid token
        console.warn('Invalid JWT token detected, clearing...');
        localStorage.removeItem('authToken');
        setAuthToken(null);
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

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.warn('Authentication failed (401), clearing token and redirecting to login');
      setAuthToken(null);
      // Redirect to login page
      window.location.href = '/login';
    } else if (error.response?.status === 500 && 
               error.response?.data?.message?.includes?.('JWT') || 
               error.message?.includes?.('JWT')) {
      // JWT parsing error on backend
      console.error('Backend JWT parsing error, clearing token');
      setAuthToken(null);
      // Don't auto-redirect on 500 errors, let user handle it
    }
    return Promise.reject(error);
  }
);

// Generic API helper functions
export const apiRequest = async (method, url, data = null, config = {}) => {
  try {
    const response = await apiClient({
      method,
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
    console.error(`API ${method.toUpperCase()} ${url} error:`, error);
    
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        'An unexpected error occurred';
    
    return {
      data: null,
      error: {
        message: errorMessage,
        status: error.response?.status,
        code: error.response?.data?.code,
      },
      success: false,
    };
  }
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
};

export default apiClient;
