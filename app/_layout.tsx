import { posthog } from "@/src/config/posthog";
import i18n from "@/src/config/i18n";
import { Jersey10_400Regular } from "@expo-google-fonts/jersey-10";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import {
  Stack,
  useGlobalSearchParams,
  usePathname,
  useRouter,
  useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { PostHogProvider } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { LogBox } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useColorScheme } from "@/components/useColorScheme";
import { AppErrorBoundary } from "@/src/components/AppErrorBoundary";
import { ForceUpdateScreen } from "@/src/components/ForceUpdateScreen";
import { AuthProvider, useAuth } from "@/src/contexts/AuthContext";
import { PurchasesProvider } from "@/src/contexts/PurchasesContext";
import { supabase } from "@/src/lib/supabase";
import { checkForceUpdate, checkOTAUpdate } from "@/src/services/updateService";
import { useOnboardingStore } from "@/src/store/onboardingStore";
import { useProStore } from "@/src/store/proStore";
import { useRoutineStreakStore } from "@/src/store/routineStreakStore";
import { isPremiumActive } from "@/src/utils/purchases";
import { AppState } from "react-native";
import Purchases from "react-native-purchases";

// Suprimir warning de expo-notifications - las notificaciones funcionan en development build
LogBox.ignoreLogs([
  "expo-notifications: Android Push notifications",
  "remote notifications",
]);

// ─── Update gate state ────────────────────────────────────────────────────────

type UpdateGateState = "checking" | "ok" | "force";

interface ForceUpdateInfo {
  storeUrl: string;
  message: string;
}

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    Jersey10: Jersey10_400Regular,
    ...FontAwesome.font,
  });

  const { initializeRoutineStreaks } = useRoutineStreakStore();
  const { load: loadPro, rechargeShieldsIfNeeded } = useProStore();

  // ─── Update gate ─────────────────────────────────────────────────────────
  const [updateGate, setUpdateGate] = useState<UpdateGateState>("checking");
  const [i18nGate, setI18nGate] = useState(i18n.isInitialized);
  const [forceUpdateInfo, setForceUpdateInfo] = useState<ForceUpdateInfo>({
    storeUrl: "",
    message: "",
  });

  useEffect(() => {
    if (i18n.isInitialized) {
      setI18nGate(true);
      return;
    }

    const handleInitialized = () => setI18nGate(true);
    i18n.on("initialized", handleInitialized);

    return () => {
      i18n.off("initialized", handleInitialized);
    };
  }, []);

  useEffect(() => {
    /**
     * Startup sequence — ORDER IS CRITICAL:
     * 1. Load Pro state (isPro, shieldCount, trial expiry)
     * 2. Recharge shields if Monday
     * 3. Initialize routine streaks
     * 4. Check for force update (blocks UI if needed)
     * 5. Check for OTA update in background
     */
    const bootstrap = async () => {
      await loadPro();
      await rechargeShieldsIfNeeded();
      await useOnboardingStore.getState().loadOnboardingStatus();
      initializeRoutineStreaks();

      // ── Force update check ──────────────────────────────────────────────
      // Determine reviewer status from existing session (may be null for
      // unauthenticated users — that's fine, they won't be bypassed).
      const { data: sessionData } = await supabase.auth.getSession();
      const isReviewer =
        sessionData?.session?.user?.user_metadata?.is_reviewer === true;

      const result = await checkForceUpdate(isReviewer);

      if (result.forceUpdate && !result.bypass) {
        setForceUpdateInfo({
          storeUrl: result.storeUrl,
          message: result.message,
        });
        setUpdateGate("force");
      } else {
        setUpdateGate("ok");
        // OTA check runs in background — non-blocking.
        checkOTAUpdate().catch(() => {});
      }
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

  if (!loaded || !i18nGate) {
    return null;
  }

  // Still performing the initial checks — keep splash visible.
  if (updateGate === "checking") {
    return null;
  }

  // Force update gate — block all navigation until the user updates.
  if (updateGate === "force") {
    return (
      <SafeAreaProvider>
        <ForceUpdateScreen
          storeUrl={forceUpdateInfo.storeUrl}
          message={forceUpdateInfo.message}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <PostHogProvider
      client={posthog}
      autocapture={{
        captureScreens: false, // Manual screen tracking with Expo Router
        captureTouches: true,
        propsToCapture: ["testID"],
        maxElementsCaptured: 20,
      }}
    >
      <AppErrorBoundary>
        <AuthProvider>
          <PurchasesProvider>
            <RootLayoutNav />
          </PurchasesProvider>
        </AuthProvider>
      </AppErrorBoundary>
    </PostHogProvider>
  );
}

// ─── Auth-aware navigator ─────────────────────────────────────────────────────

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, isLoading, isAnonymous } = useAuth();
  const isOnboardingLocal = useOnboardingStore((s) => s.isOnboardingComplete);
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef<string | undefined>(undefined);
  const appStateRef = useRef(AppState.currentState);

  // Manual screen tracking for Expo Router
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, {
        previous_screen: previousPathname.current ?? null,
        ...params,
      });
      previousPathname.current = pathname;
    }
  }, [pathname, params]);

  useEffect(() => {
    let isActive = true;

    const setProStatus = async (isProActive: boolean) => {
      const { activatePermanentPro, cancelPermanentPro } =
        useProStore.getState();

      if (isProActive) {
        await activatePermanentPro();
      } else {
        await cancelPermanentPro();
      }
    };

    const applyCustomerInfo = async (customerInfo: any) => {
      const isProActive = isPremiumActive(customerInfo);

      if (!isActive) return;

      await setProStatus(isProActive);
    };

    const syncCustomerInfo = async () => {
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        await applyCustomerInfo(customerInfo);
      } catch (error) {
        console.warn("[RevenueCat] getCustomerInfo failed", error);
      }
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState) => {
        const previousAppState = appStateRef.current;
        appStateRef.current = nextAppState;

        if (
          (previousAppState === "background" ||
            previousAppState === "inactive") &&
          nextAppState === "active"
        ) {
          void syncCustomerInfo();
        }
      },
    );

    const customerInfoListener = (customerInfo: any) => {
      void applyCustomerInfo(customerInfo);
    };

    Purchases.addCustomerInfoUpdateListener(customerInfoListener);
    void syncCustomerInfo();

    return () => {
      isActive = false;
      appStateSubscription.remove();
      Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
    };
  }, []);

  useEffect(() => {
    if (isLoading) return; // Wait until auth state is resolved

    const inAuthGroup =
      segments[0] === "login" ||
      segments[0] === "onboarding-new" ||
      segments[0] === "onboarding-v3";

    if (!session) {
      if (!inAuthGroup) {
        // No session → if onboarding is already completed, show login splash
        if (isOnboardingLocal) {
          router.replace("/login");
        } else {
          router.replace("/onboarding-v3");
        }
      }
    } else {
      const hasCompletedOnboarding =
        session.user?.user_metadata?.onboarding_completed === true ||
        isOnboardingLocal;

      if (!hasCompletedOnboarding && !inAuthGroup) {
        // User hasn't finished onboarding but is trying to access app
        router.replace("/onboarding-v3");
      } else if (hasCompletedOnboarding && segments[0] === "login") {
        // Fully authenticated user on login screen → send to main app
        // (Anonymous users CAN visit login to upgrade their account)
        if (!isAnonymous) {
          router.replace("/(tabs)");
        }
      }
    }
  }, [session, isLoading, isAnonymous, segments]);

  // Return nothing while loading to prevent navigation flicker
  if (isLoading) return null;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen
          name="login"
          options={{ headerShown: false, animation: "fade" }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding-new" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding-v3" options={{ headerShown: false }} />
        <Stack.Screen name="achievements" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </ThemeProvider>
  );
}
