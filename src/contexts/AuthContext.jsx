import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { authService } from '../services/authService';

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
        // Get initial session with retry logic
        let session = null;
        let retries = 3;
        
        while (retries > 0 && !session) {
          try {
            const { data: sessionData, error: sessionError } = await supabase?.auth?.getSession();
            if (sessionError) {
              if (sessionError?.message?.includes('Failed to fetch') || 
                  sessionError?.message?.includes('NetworkError')) {
                retries--;
                if (retries > 0) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  continue;
                }
              }
              throw sessionError;
            }
            session = sessionData?.session;
          } catch (error) {
            retries--;
            if (retries === 0) {
              console.error('Failed to initialize auth after retries:', error);
              if (mounted) {
                setLoading(false);
                setInitialized(true);
              }
              return;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        if (session?.user && mounted) {
          setUser(session?.user);
          // Fire and forget - don't await to prevent callback delays
          loadUserProfile(session?.user?.id);
        } else {
          if (mounted) {
            setUser(null);
            setUserProfile(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setUser(null);
          setUserProfile(null);
          setLoading(false);
        }
      } finally {
        if (mounted) {
          setInitialized(true);
        }
      }
    };

    const loadUserProfile = async (userId) => {
      try {
        const { data: profile, error } = await authService?.getUserProfile(userId);
        if (mounted && !error && profile) {
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener - MUST NOT be async
    const { data: { subscription } } = supabase?.auth?.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session?.user);
          setLoading(true);
          // Fire and forget - don't await
          loadUserProfile(session?.user?.id);
        } else {
          setUser(null);
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    // Initialize auth
    initializeAuth();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await authService?.signInWithPassword(email, password);
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signUp = async (email, password, userData = {}) => {
    try {
      setLoading(true);
      const { data, error } = await authService?.signUp(email, password, userData);
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await authService?.signOut();
      if (error) {
        throw error;
      }
      
      setUser(null);
      setUserProfile(null);
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

      const { data, error } = await authService?.updateUserProfile(user?.id, updates);
      
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