import React, { createContext, useContext, useEffect, useState } from 'react';
import { newAuthService } from '../services/newAuthService';
import { getTokenExpiryMs, clearAuthState } from '../lib/apiClient';

// setTimeout delays are 32-bit; anything larger overflows and fires immediately.
const MAX_TIMEOUT_MS = 2147483647;

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing auth...');
        const { data: sessionData, error: sessionError } = await newAuthService.getSession();
        
        if (sessionError) {
          console.log('❌ No valid session found:', sessionError);
          if (mounted) {
            setUser(null);
            setUserProfile(null);
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        const session = sessionData?.session;
        if (session?.user && mounted) {
          // The user object should already be in the correct format from getSession
          const userProfile = session.user;
          console.log('✅ Session found, user:', userProfile?.username || userProfile?.email, 'role:', userProfile?.role);
          setUser(userProfile);
          setUserProfile(userProfile);
          // Keep localStorage role in sync on session restore
          if (userProfile?.role) {
            localStorage.setItem('userRole', userProfile.role);
          }
        } else {
          console.log('❌ No user in session');
          if (mounted) {
            setUser(null);
            setUserProfile(null);
          }
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        if (mounted) {
          setUser(null);
          setUserProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
          console.log('🔐 Auth initialization complete');
        }
      }
    };

    // Initialize auth (no auth state listener needed for JWT-based auth)
    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Proactively expire the in-memory session the moment the JWT's `exp` passes,
  // so the route guards redirect to login even on a screen that never fires an
  // API call (otherwise an expired session is only caught on the next 401).
  useEffect(() => {
    if (!user) return undefined;
    const token = localStorage.getItem('authToken');
    const expMs = getTokenExpiryMs(token);
    if (expMs == null) return undefined; // no expiry claim → backend 401 is the backstop

    const expire = () => {
      console.warn('🔒 Session expired; clearing auth state');
      clearAuthState();
      setUser(null);
      setUserProfile(null);
    };

    const remaining = expMs - Date.now();
    if (remaining <= 0) {
      expire();
      return undefined;
    }
    if (remaining > MAX_TIMEOUT_MS) return undefined; // too far off to schedule; 401 covers it
    const id = setTimeout(expire, remaining);
    return () => clearTimeout(id);
  }, [user]);

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const { data, error, challenge } = await newAuthService.signInWithPassword(email, password);

      if (error) {
        throw error;
      }

      // Cognito challenge (e.g. first-login NEW_PASSWORD_REQUIRED): no token yet.
      // Surface it so the login page can route to the set-password flow.
      if (challenge) {
        return { data: null, challenge, error: null };
      }

      // If login successful, load user profile
      if (data) {
        try {
          const { data: profileResponse, error: profileError } = await newAuthService.getProfile();
          if (profileResponse && !profileError) {
            // The API returns { user: { ... } }, so we need profileResponse.user
            const userProfile = profileResponse.user || profileResponse;
            setUser(userProfile);
            setUserProfile(userProfile);
            // Persist role so apiClient interceptor can read it without React context
            if (userProfile?.role) {
              localStorage.setItem('userRole', userProfile.role);
            }
            // Return user profile data along with login data
            return { data: { ...data, user: userProfile, profile: userProfile }, error: null };
          } else {
            console.warn('⚠️ Failed to load user profile after login:', profileError);
            // Continue with login success even if profile fails
            const fallbackUser = data.user || data;
            setUser(fallbackUser);
            setUserProfile(fallbackUser);
            if (fallbackUser?.role) {
              localStorage.setItem('userRole', fallbackUser.role);
            }
            return { data, error: null };
          }
        } catch (profileErr) {
          console.error('❌ Profile loading error after login:', profileErr);
          // Continue with login success even if profile fails
          const fallbackUser = data.user || data;
          setUser(fallbackUser);
          setUserProfile(fallbackUser);
          if (fallbackUser?.role) {
            localStorage.setItem('userRole', fallbackUser.role);
          }
          return { data, error: null };
        }
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, userData = {}) => {
    try {
      setLoading(true);
      const { data, error } = await newAuthService.signUp(email, password, userData);
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await newAuthService.signOut();
      if (error) {
        throw error;
      }

      setUser(null);
      setUserProfile(null);
      // Clear role and active-institute so the interceptor stops sending the header
      localStorage.removeItem('userRole');
      localStorage.removeItem('activeInstituteId');
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const updateProfile = async (updates) => {
    try {
      if (!user) {
        throw new Error('No authenticated user');
      }

      const { data, error } = await newAuthService.updateUserProfile(user?.id, updates);
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setUserProfile(data);
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const value = {
    user,
    userProfile,
    loading: loading && initialized, // Only show loading after auth is initialized
    initialized,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;