import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import 'react-native-reanimated';
import { Jersey10_400Regular } from '@expo-google-fonts/jersey-10';

import { useColorScheme } from '@/components/useColorScheme';
import { AppErrorBoundary } from '@/src/components/AppErrorBoundary';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { PurchasesProvider } from '@/src/contexts/PurchasesContext';
import { useOnboardingStore } from '@/src/store/onboardingStore';
import { useProStore } from '@/src/store/proStore';
import { useRoutineStreakStore } from '@/src/store/routineStreakStore';
import { configurePurchases } from '@/src/utils/purchases';

// Suprimir warning de expo-notifications - las notificaciones funcionan en development build
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'remote notifications',
]);

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Jersey10: Jersey10_400Regular,
    ...FontAwesome.font,
  });

  const { initializeRoutineStreaks } = useRoutineStreakStore();
  const { load: loadPro, rechargeShieldsIfNeeded } = useProStore();

  useEffect(() => {
    /**
     * Startup sequence — ORDER IS CRITICAL:
     * 1. Configure RevenueCat SDK (must be before any purchase call)
     * 2. Load Pro state (isPro, shieldCount, trial expiry)
     * 3. Recharge shields if Monday
     * 4. Initialize routine streaks
     */
    const bootstrap = async () => {
      await configurePurchases();
      await loadPro();
      await rechargeShieldsIfNeeded();
      await useOnboardingStore.getState().loadOnboardingStatus();
      initializeRoutineStreaks();
    };
    bootstrap();
  }, []);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <PurchasesProvider>
          <RootLayoutNav />
        </PurchasesProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}

// ─── Auth-aware navigator ─────────────────────────────────────────────────────

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, isLoading, isAnonymous } = useAuth();
  const isOnboardingLocal = useOnboardingStore((s) => s.isOnboardingComplete);
  const segments = useSegments();
  const router = useRouter();


  useEffect(() => {
    if (isLoading) return; // Wait until auth state is resolved

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'onboarding-new' || segments[0] === 'onboarding-v3';

    if (!session) {
      if (!inAuthGroup) {
        // No session → if onboarding is already completed, show login splash
        if (isOnboardingLocal) {
          router.replace('/login');
        } else {
          router.replace('/onboarding-v3');
        }
      }
    } else {
      const hasCompletedOnboarding = 
        session.user?.user_metadata?.onboarding_completed === true || 
        isOnboardingLocal;

      if (!hasCompletedOnboarding && !inAuthGroup) {
        // User hasn't finished onboarding but is trying to access app
        router.replace('/onboarding-v3');
      } else if (hasCompletedOnboarding && segments[0] === 'login') {
        // Fully authenticated user on login screen → send to main app
        // (Anonymous users CAN visit login to upgrade their account)
        if (!isAnonymous) {
          router.replace('/(tabs)');
        }
      }
    }
  }, [session, isLoading, isAnonymous, segments]);

  // Return nothing while loading to prevent navigation flicker
  if (isLoading) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding-new" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding-v3" options={{ headerShown: false }} />
        <Stack.Screen name="achievements" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
