import { supabase } from '@/src/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signInAnonymously: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // If no session exists, sign in anonymously
      if (!session) {
        signInAnonymously();
      } else {
        setIsLoading(false);
      }
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInAnonymously = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) {
        console.error('❌ Error signing in anonymously:', error.message);
        Alert.alert('Error', 'No se pudo iniciar sesión. Intenta de nuevo.');
        return;
      }
    } catch (error) {
      console.error('❌ Unexpected error during anonymous sign in:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Error signing out:', error.message);
      }
    } catch (error) {
      console.error('❌ Unexpected error during sign out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signInAnonymously, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
