import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.ts';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    // Sign-out must never leave the user stuck in a signed-in-looking UI, so
    // each step below degrades into a weaker one rather than throwing.
    try {
      // Default scope is 'global', which revokes every session for this account
      // (other tabs and devices too). That is the behaviour we want, but it
      // requires the current token to still be valid server-side.
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (globalError) {
      // An expired or already-revoked session makes GoTrue answer 403
      // (AuthSessionMissingError). There is nothing left to revoke, so just
      // drop this browser's copy.
      console.warn('Global sign-out failed, falling back to local:', globalError);
      try {
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error) throw error;
      } catch (localError) {
        // Even a local sign-out reads the session first, so it can throw when
        // the stored token is unreadable. Clear the keys ourselves.
        console.warn('Local sign-out failed, clearing stored session:', localError);
        Object.keys(window.localStorage)
          .filter((key) => key.startsWith('sb-'))
          .forEach((key) => window.localStorage.removeItem(key));
      }
    } finally {
      // onAuthStateChange fires on a clean sign-out but not on the fallback
      // paths, so clear the user here to guarantee the UI updates either way.
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 