import { supabase } from '@/src/lib/supabase';
import { posthog } from '@/src/config/posthog';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

// Ensures an active WebBrowser session resolves instead of returning 'auth session in progress'
WebBrowser.maybeCompleteAuthSession();

// ─── Types ────────────────────────────────────────────────────────────────────

type OAuthProvider = 'google';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAnonymous: boolean;
  signInWithOAuth: (
    provider: OAuthProvider,
    options?: { forceDirectSignIn?: boolean },
  ) => Promise<void>;
  signInWithApple: () => Promise<void>;
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
  signInWithApple: async () => {},
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
      (event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        if (session?.user && !session.user.is_anonymous) {
          const provider = (session.user.app_metadata?.provider as string | undefined) ?? null;
          const email = session.user.email ?? null;

          // Note: RevenueCat identity sync is handled by PurchasesContext
          // to avoid duplicate loginUser() calls.

          // Identify authenticated user in PostHog
          posthog.identify(session.user.id, {
            $set: {
              email,
              provider,
            },
            $set_once: {
              first_sign_in_date: new Date().toISOString(),
            },
          });

          if (event === 'SIGNED_IN') {
            posthog.capture('user_signed_in', {
              provider,
            });
          }
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── OAuth Sign-In (Google) ─────────────────────────────────────────────────

  const signInWithOAuth = async (
    provider: OAuthProvider,
    options?: { forceDirectSignIn?: boolean },
  ): Promise<void> => {
    try {
      setIsLoading(true);

      if (Platform.OS !== 'web') {
        WebBrowser.dismissBrowser();
      }

      const redirectUrl = Linking.createURL('/(tabs)');

      const isUpgrading =
        !options?.forceDirectSignIn &&
        !!session &&
        session.user?.is_anonymous === true;
      const authMethod = isUpgrading
        ? supabase.auth.linkIdentity.bind(supabase.auth)
        : supabase.auth.signInWithOAuth.bind(supabase.auth);

      const { data, error } = await authMethod({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        if (error.message.includes('already linked') || error.message.includes('Identity is already linked')) {
          Alert.alert(
            'Cuenta ya en uso',
            'La cuenta de Google que seleccionaste ya fue registrada previamente. Para usarla, debes cerrar tu sesión anónima actual (los datos no respaldados se perderán). ¿Deseas cerrar sesión ahora?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Cerrar sesión', style: 'destructive', onPress: () => signOut() }
            ]
          );
          return;
        }
        throw error;
      }
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

  // ── Apple Native Sign-In (iOS) ────────────────────────────────────────────

  const signInWithApple = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Show the native Apple Sign-In sheet (ASAuthorizationController)
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token returned from Apple');
      }

      // Exchange Apple's identity token with Supabase
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) throw error;

      // Apple only provides full name on first sign-in — store it if available
      if (credential.fullName?.givenName) {
        const displayName = [
          credential.fullName.givenName,
          credential.fullName.familyName,
        ].filter(Boolean).join(' ');

        await supabase.auth.updateUser({
          data: { full_name: displayName },
        });
      }
    } catch (error: any) {
      // ERR_REQUEST_CANCELED = user dismissed the Apple sheet
      if (error.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      console.error('❌ Apple Sign-In error:', error.message);
      Alert.alert(
        'Error de inicio de sesión',
        'No se pudo completar el inicio de sesión con Apple. Intenta de nuevo.',
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
      if (Platform.OS !== 'web') {
        WebBrowser.dismissBrowser();
      }
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Error signing out:', error.message);
      } else {
        posthog.reset();
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
        signInWithApple,
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
