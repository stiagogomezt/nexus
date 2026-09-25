import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

export interface AppUser {
  id: string;
  email: string;
  full_name?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isSupabaseConnected: boolean;
  signIn: (email: string, pass: string) => Promise<{ error?: string }>;
  signUp: (email: string, pass: string, name?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default demo session for immediate local interaction
const LOCAL_USER_KEY = 'nexus_auth_user';
const DEFAULT_USER: AppUser = {
  id: 'usr-shuffler-01',
  email: 'usuario@nexusfinance.com',
  full_name: 'Kevin (NEXUS Leader)'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    if (!isSupabaseConfigured) {
      const saved = localStorage.getItem(LOCAL_USER_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // Check active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const mapSupabaseUser = (sbUser: SupabaseUser): AppUser => ({
    id: sbUser.id,
    email: sbUser.email || '',
    full_name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'Usuario'
  });

  const signIn = async (email: string, pass: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      const localUser: AppUser = {
        id: `usr-${Date.now()}`,
        email,
        full_name: email.split('@')[0]
      };
      setUser(localUser);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser));
      return {};
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return { error: error.message };
    return {};
  };

  const signUp = async (email: string, pass: string, name?: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      const localUser: AppUser = {
        id: `usr-${Date.now()}`,
        email,
        full_name: name || email.split('@')[0]
      };
      setUser(localUser);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser));
      return {};
    }

    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { full_name: name } }
    });
    if (error) return { error: error.message };
    return {};
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem(LOCAL_USER_KEY);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isSupabaseConnected: isSupabaseConfigured,
      signIn,
      signUp,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
