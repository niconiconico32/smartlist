import { supabase } from '@/src/lib/supabase';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type OAuthProvider = 'google' | 'apple';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAnonymous: boolean;
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isAnonymous: true,
  signInWithOAuth: async () => {},
  signInAnonymously: async () => {},
  signOut: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAnonymous = !session || session.user?.is_anonymous === true;

  useEffect(() => {
    // 1. Restore existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // 2. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── OAuth Sign-In ─────────────────────────────────────────────────────────

  const signInWithOAuth = async (provider: OAuthProvider): Promise<void> => {
    try {
      setIsLoading(true);

      const redirectUrl = Linking.createURL('/(tabs)');

      const isUpgrading = !!session && session.user?.is_anonymous === true;
      const authMethod = isUpgrading
        ? supabase.auth.linkIdentity.bind(supabase.auth)
        : supabase.auth.signInWithOAuth.bind(supabase.auth);

      const { data, error } = await authMethod({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          ...(provider === 'google' && {
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          }),
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned');

      // Open the OAuth flow in an in-app browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl,
        { showInRecents: true },
      );

      if (result.type === 'success' && result.url) {
        // Extract tokens from the redirect URL
        const url = new URL(result.url);
        // Tokens can be in hash fragment or query params
        const params = new URLSearchParams(
          url.hash ? url.hash.substring(1) : url.search.substring(1),
        );

        const error = params.get('error');
        const errorDescription = params.get('error_description');

        if (error) {
          throw new Error(errorDescription ? errorDescription.replace(/\+/g, ' ') : error);
        }

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }
      }
    } catch (error: any) {
      console.error(`❌ OAuth error (${provider}):`, error.message);
      Alert.alert(
        'Error de inicio de sesión',
        'No se pudo completar el inicio de sesión. Intenta de nuevo.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Anonymous Sign-In ─────────────────────────────────────────────────────

  const signInAnonymously = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInAnonymously();

      if (error) {
        console.error('❌ Error signing in anonymously:', error.message);
        Alert.alert('Error', 'No se pudo iniciar sesión. Intenta de nuevo.');
      }
    } catch (error) {
      console.error('❌ Unexpected error during anonymous sign in:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Sign Out ──────────────────────────────────────────────────────────────

  const signOut = async (): Promise<void> => {
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
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAnonymous,
        signInWithOAuth,
        signInAnonymously,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
