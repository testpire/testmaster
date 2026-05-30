import React, { createContext, useContext, useEffect, useState } from 'react';
import { newAuthService } from '../services/newAuthService';

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