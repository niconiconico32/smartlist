import { posthog } from "@/src/config/posthog";
import i18n from "@/src/config/i18n";
import { Inter_400Regular } from "@expo-google-fonts/inter";
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
import { LogBox, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useColorScheme } from "@/components/useColorScheme";
import { AppErrorBoundary } from "@/src/components/AppErrorBoundary";
import { ForceUpdateScreen } from "@/src/components/ForceUpdateScreen";
import { RestoringOverlay } from "@/src/components/RestoringOverlay";
import { AuthProvider, useAuth } from "@/src/contexts/AuthContext";
import { PurchasesProvider } from "@/src/contexts/PurchasesContext";
import { supabase } from "@/src/lib/supabase";
import { checkForceUpdate, checkOTAUpdate } from "@/src/services/updateService";
import { useFunnelRestore } from "@/src/hooks/useFunnelRestore";
import {
  getPendingHandoff,
  parseHandoffUrl,
  storePendingClaimToken,
  storePendingRedemptionUrl,
  storePendingFunnelEmail,
} from "@/src/lib/funnelClaim";
import {
  armEggStoreCloudSync,
  resetEggStoreForUserChange,
  syncEggsWithCloud,
} from "@/src/lib/userEggService";
import { useAchievementsStore } from "@/src/store/achievementsStore";
import { useOnboardingStore } from "@/src/store/onboardingStore";
import { useProStore } from "@/src/store/proStore";
import { useRoutineStreakStore } from "@/src/store/routineStreakStore";
import { isPremiumActive } from "@/src/utils/purchases";
import { syncPushTokenAndCheckTrial } from "@/src/utils/notifications";
import { AppState, Image, Linking } from "react-native";
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
    Inter: Inter_400Regular,
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
     * 4. Pre-warm achievements: loads equipped background/outfit from
     *    AsyncStorage ASAP so the main screen renders without waiting.
     * 5. Check for force update (blocks UI if needed)
     * 6. Check for OTA update in background
     */
    const bootstrap = async () => {
      await loadPro();
      await rechargeShieldsIfNeeded();
      await useOnboardingStore.getState().loadOnboardingStatus();
      initializeRoutineStreaks();

      // Pre-warm achievements during boot so the main screen doesn't
      // have to wait for hydration when it mounts.
      useAchievementsStore.getState().loadAchievements().catch(() => {});

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

  // Pre-fetch remote background/outfit images once achievements are loaded.
  // This avoids network-fetch flashing when the main screen renders.
  useEffect(() => {
    if (updateGate !== "ok") return;
    const prewarm = async () => {
      try {
        const { activeBackgroundUri, activeOutfitUri } =
          useAchievementsStore.getState();
        const uris = [activeBackgroundUri, activeOutfitUri].filter(Boolean);
        await Promise.all(uris.map((uri) => Image.prefetch(uri!)));
      } catch {}
    };
    const unsub = useAchievementsStore.subscribe((s) => {
      if (s._loaded) {
        unsub();
        prewarm();
      }
    });
    // If already loaded
    if (useAchievementsStore.getState()._loaded) {
      unsub();
      prewarm();
    }
    return () => unsub();
  }, [updateGate]);

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
  const { session, isAuthResolved, isAnonymous } = useAuth();
  const isOnboardingLocal = useOnboardingStore((s) => s.isOnboardingComplete);
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const {
    state: restoreUiState,
    summary: restoreSummary,
    run: runFunnelRestore,
    finish: finishFunnelRestore,
  } = useFunnelRestore();
  const paramsRef = useRef(params);
  const previousPathname = useRef<string | undefined>(undefined);
  const pathnameRef = useRef<string | undefined>(undefined);
  const appStateRef = useRef(AppState.currentState);
  const eggSyncCleanupRef = useRef<(() => void) | null>(null);

  // Keep ref in sync so the tracking effect always reads fresh params
  // without re-triggering on reference changes.
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Manual screen tracking for Expo Router
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, {
        previous_screen: previousPathname.current ?? null,
        ...paramsRef.current,
      });
      previousPathname.current = pathname;
    }
  }, [pathname]);

  useEffect(() => {
    let isActive = true;

    // Only a customerInfo belonging to the identified user may clear Pro.
    // Reading on mount happens before RevenueCat identifies the app, so that
    // read is anonymous and says nothing about this user's entitlement.
    const identifiedUserId = session?.user?.id ?? null;
    const isIdentifiedRead = (customerInfo: any) =>
      Boolean(
        identifiedUserId &&
          customerInfo?.originalAppUserId &&
          customerInfo.originalAppUserId === identifiedUserId,
      );

    const setProStatus = async (
      isProActive: boolean,
      customerInfo: any,
    ) => {
      const { activatePermanentPro, cancelPermanentPro } =
        useProStore.getState();

      if (isProActive) {
        await activatePermanentPro();
      } else {
        // Never revoke a paid Pro from an anonymous / unidentified read.
        if (!isIdentifiedRead(customerInfo)) return;
        await cancelPermanentPro();
      }
    };

    const applyCustomerInfo = async (customerInfo: any) => {
      const isProActive = isPremiumActive(customerInfo);

      if (!isActive) return;

      await setProStatus(isProActive, customerInfo);
    };

    const syncCustomerInfo = async () => {
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        await applyCustomerInfo(customerInfo);
        syncPushTokenAndCheckTrial(customerInfo).catch(() => {});
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
    // Sync only once RevenueCat knows who the user is. Skipping the anonymous
    // mount read is what removed the cold-start Pro wipe; foreground re-syncs
    // still run through the AppState listener above.
    if (identifiedUserId) {
      void syncCustomerInfo();
    }

    return () => {
      isActive = false;
      appStateSubscription.remove();
      Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
    };
  }, [session?.user?.id]);

  // A brand-new user finishes onboarding with NO session (the login funnel
  // owns auth), so completeOnboarding() has nothing to write to. This retries
  // the push once a session exists — it is a no-op after the server
  // acknowledges it, and self-heals if onboarding finished offline.
  useEffect(() => {
    if (!isAuthResolved || !session?.user) return;
    void useOnboardingStore.getState().syncCompletedToServer();
  }, [isAuthResolved, session?.user?.id]);

  useEffect(() => {
    if (!isAuthResolved) return; // Wait until auth state is resolved
    let active = true;

    // The login flow is a multi-screen funnel (login → login-options →
    // login-existing / login-social). Every step must be treated as part of
    // the unauthenticated area, otherwise the guard below bounces the user
    // back to /login while they are already inside the flow.
    //
    // `onboarding-v3` is included on purpose: a brand-new user has no session
    // yet when answering "No, es mi primera vez", so the real onboarding must
    // be reachable without one. Leaving it out makes that CTA look inert.
    const loginRoutes = new Set([
      "login",
      "login-options",
      "login-existing",
      "login-social",
      "onboarding-v3",
    ]);
    const onLoginFlow = loginRoutes.has(segments[0]);

    const inAuthGroup =
      onLoginFlow ||
      segments[0] === "onboarding-new" ||
      segments[0] === "claim" ||
      segments[0] === "plan-ready";

    if (!session) {
      if (segments[0] && !loginRoutes.has(segments[0])) {
        // No session at all → the login flow is the entry point now (both for
        // organic new users and funnel visitors). Fresh users reach onboarding
        // only AFTER signing up / continuing anonymously.
        router.replace("/login");
      }
      return () => {
        active = false;
      };
    }

    const hasCompletedOnboarding =
      session.user?.user_metadata?.onboarding_completed === true ||
      isOnboardingLocal;

    if (session.user?.is_anonymous !== true) {
      // Runs for every step of the login flow, not just /login — otherwise a
      // user who signs in from /login-existing or /login-social would stay
      // stuck on the form after the session appears.
      if (onLoginFlow) {
        // Real user landing anywhere in the login flow:
        //  1. Legacy deep-link handoff (claim token / RevenueCat redemption
        //     link persisted by the web funnel) → /claim (compat path).
        //  2. Otherwise the NEW happy path: server-side email restore lookup
        //     (restore-funnel-plan). Runs exactly once per session. A found
        //     plan materializes + routes straight to the app; a miss falls
        //     back to onboarding / the app.
        getPendingHandoff()
          .then(async ({ claimToken, redemptionUrl }) => {
            if (claimToken || redemptionUrl) {
              router.replace("/claim");
              return;
            }
            const outcome = await runFunnelRestore(session.user!.id);
            if (!active) return;
            if (outcome === "restored_fresh" || outcome === "restored_replay") {
              // The claim RPC creates routines AND user_eggs rows. The egg
              // store was hydrated when the session appeared, which is BEFORE
              // the RPC ran, so the routine→egg links never reached the local
              // store and every funnel routine rendered without its companion.
              // Re-fetch now that the rows exist.
              await syncEggsWithCloud(session.user!.id);
            }
            if (outcome === "restored_fresh") {
              // The RestoringOverlay now owns the final confirmation ("Tu
              // Brainy está listo" + counts + "Empezar"). It routes to HOME on
              // the CTA — no onboarding, no extra paywall.
            } else if (outcome === "restored_replay") {
              // Already materialized in a previous session → straight to HOME
              // without forcing the confirmation overlay again.
              router.replace("/(tabs)");
            } else if (
              outcome === "redeem_expired" ||
              outcome === "redeem_blocked"
            ) {
              // Recovery: the entitlement could not be linked (expired link /
              // dead token / wrong owner). NO materialization happened. The
              // Home banner surfaces the message (RC re-emails a fresh link).
              // The plan stays in web_funnel_plans for a future reopen.
              router.replace("/(tabs)");
            } else if (outcome === "no_plan" && !hasCompletedOnboarding) {
              router.replace("/onboarding-v3");
            } else {
              // A found funnel plan with a transient finalize/RevenueCat
              // failure must never be treated as an organic new user.
              router.replace("/(tabs)");
            }
          })
          .catch(() => {});
      } else if (!hasCompletedOnboarding && !inAuthGroup) {
        // The server-authoritative restore effect below decides between
        // onboarding (organic/no plan) and HOME (identified funnel/retry).
      }
    } else if (!hasCompletedOnboarding && !inAuthGroup) {
      // Anonymous user hasn't finished onboarding → push them to it
      router.replace("/onboarding-v3");
    } else if (
      hasCompletedOnboarding &&
      (segments[0] === "onboarding-v3" || segments[0] === "onboarding-new")
    ) {
      // Anonymous user with completed onboarding on onboarding → main app
      router.replace("/(tabs)");
    }

    return () => {
      active = false;
    };
  }, [session, isAuthResolved, isAnonymous, segments, isOnboardingLocal, router]);

  // Re-run the server-authoritative funnel lookup when a session is restored
  // directly into HOME/onboarding (not only after visiting /login). This is
  // what prevents a closed/reopened app from sending an identified funnel
  // user through onboarding again. Legacy /claim handoffs remain untouched.
  //
  // The restore is a STARTUP check, not a per-navigation guard. It used to
  // re-run on every route change and redirect to "/(tabs)", which hijacked
  // legitimate navigation: the Store button pushed /achievements and the
  // effect immediately bounced the user back to Home.
  const funnelRestoreRanFor = useRef<string | null>(null);
  useEffect(() => {
    if (!isAuthResolved || !session?.user?.id || session.user.is_anonymous) return;
    // The sign-in flow owns navigation while it is on screen: the effect at
    // the top of this component already routes the user once the session
    // exists, so this startup check must stay out of the way.
    if (
      segments[0] === "claim" ||
      segments[0] === "plan-ready" ||
      segments[0] === "login" ||
      segments[0] === "login-options" ||
      segments[0] === "login-existing" ||
      segments[0] === "login-social"
    )
      return;

    // Once per user: a repeat run can only re-apply the same redirect.
    const userKey = session.user.id;
    if (funnelRestoreRanFor.current === userKey) return;

    // Never pull the user out of a destination they navigated to on purpose.
    // Only act from the funnel/startup surfaces.
    const restoreSurfaces = new Set([
      "(tabs)",
      "index",
      "two",
      "onboarding",
      "onboarding-new",
      "onboarding-v3",
    ]);
    if (segments[0] && !restoreSurfaces.has(segments[0])) return;

    funnelRestoreRanFor.current = userKey;
    let active = true;
    void getPendingHandoff().then(async ({ claimToken, redemptionUrl }) => {
      if (claimToken || redemptionUrl) return;
      const outcome = await runFunnelRestore(session.user.id);
      if (!active) return;
      if (outcome === "restored_fresh" || outcome === "restored_replay") {
        // Same reason as the sign-in path: the claim RPC just created the
        // user_eggs rows, after the egg store was hydrated. Re-fetch so the
        // routine→egg links land before the user sees Home.
        await syncEggsWithCloud(session.user.id);
        router.replace("/(tabs)");
      } else if (outcome === "no_plan" && !isOnboardingLocal && segments[0] !== "onboarding-v3" && segments[0] !== "onboarding-new") {
        router.replace("/onboarding-v3");
      } else if (outcome === "error") {
        router.replace("/(tabs)");
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [isAuthResolved, session?.user?.id, session?.user?.is_anonymous, segments[0], isOnboardingLocal, router, runFunnelRestore]);

  // ── Funnel handoff plumbing ─────────────────────────────────────────────────
  // Funnel any persisted but unhandled handoff (claim token and/or RevenueCat
  // Redemption Link) to the /claim screen (which owns execution + navigation).
  // Covers email/Google/Apple login, OAuth redirects, app reloads and
  // background/foreground cycles.
  useEffect(() => {
    if (!isAuthResolved) return;

    const currentPath = pathnameRef.current ?? "";
    const onClaimPath =
      currentPath === "/claim" || currentPath.startsWith("/claim");

    getPendingHandoff()
      .then(({ claimToken, redemptionUrl }) => {
        if (
          (claimToken || redemptionUrl) &&
          session?.user?.id &&
          !onClaimPath
        ) {
          router.replace("/claim");
        }
      })
      .catch(() => {});
  }, [isAuthResolved, session?.user?.id, pathname, router]);

  // Hydrate + keep the egg store in sync with user_eggs once logged in.
const eggSyncUserRef = useRef<string | null>(null);
  useEffect(() => {
    const nextUserId = session?.user?.id ?? null;
    if (eggSyncUserRef.current === nextUserId) return;

    // The account changed (or signed out). Drop the previous account's eggs
    // BEFORE syncing: the egg store is global and signOut() does not clear it,
    // so without this a new account inherits the old one's routine links and
    // the one-time migration stamps them under the new user id.
    resetEggStoreForUserChange();
    eggSyncUserRef.current = nextUserId;
    eggSyncCleanupRef.current?.();
    eggSyncCleanupRef.current = null;

    if (!isAuthResolved || !nextUserId) return;
    void syncEggsWithCloud(nextUserId).catch(() => {});
    eggSyncCleanupRef.current = armEggStoreCloudSync(nextUserId);
  }, [isAuthResolved, session?.user?.id]);

  // Subscription teardown on unmount. Per-user teardown now lives in the sync
  // effect above, which handles both sign-out and account switches.
  useEffect(() => {
    return () => {
      eggSyncCleanupRef.current?.();
      eggSyncCleanupRef.current = null;
    };
  }, []);

  // ── Warm deep links ────────────────────────────────────────────────────────
  // brainy://claim?token=...&redeem_url=... and rc-<appId>:// Redemption Links.
  // Persists the handoff immediately and routes to /claim.
  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      const parsed = parseHandoffUrl(url);
      if (!parsed.claimToken && !parsed.redemptionUrl) return;

      const tasks: Promise<void>[] = [];
      if (parsed.claimToken) tasks.push(storePendingClaimToken(parsed.claimToken));
      if (parsed.redemptionUrl) tasks.push(storePendingRedemptionUrl(parsed.redemptionUrl));
      if (parsed.email) tasks.push(storePendingFunnelEmail(parsed.email));

      Promise.all(tasks)
        .then(() => {
          if ((pathnameRef.current ?? "") !== "/claim") {
            router.replace("/claim");
          }
        })
        .catch(() => {});
    });

    return () => subscription.remove();
  }, [router]);

  // ── Cold start deep links ──────────────────────────────────────────────────
  // expo-router resolves brainy://claim itself, but rc-<appId>:// does not map
  // to any route — catch it here, persist the Redemption Link and route to
  // /claim.
  useEffect(() => {
    Linking.getInitialURL()
      .then((url) => {
        if (!url) return;
        const parsed = parseHandoffUrl(url);
        if (!parsed.claimToken && !parsed.redemptionUrl) return;

        const tasks: Promise<void>[] = [];
        if (parsed.claimToken) tasks.push(storePendingClaimToken(parsed.claimToken));
        if (parsed.redemptionUrl) tasks.push(storePendingRedemptionUrl(parsed.redemptionUrl));
        if (parsed.email) tasks.push(storePendingFunnelEmail(parsed.email));

        Promise.all(tasks)
          .then(() => {
            if ((pathnameRef.current ?? "") !== "/claim") {
              router.replace("/claim");
            }
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, [router]);

  // Render nothing until the initial auth lookup settles. This must use
  // isAuthResolved, not isLoading: isLoading is also true during an in-flight
  // sign-in, and returning null there unmounted the whole navigator mid-request,
  // wiping the navigation stack and the form the user was filling in.
  if (!isAuthResolved) return null;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1 }}>
        <Stack>
          <Stack.Screen
            name="login"
            options={{ headerShown: false, animation: "fade" }}
          />
          <Stack.Screen
            name="login-options"
            options={{ headerShown: false, animation: "fade" }}
          />
          <Stack.Screen
            name="login-existing"
            options={{ headerShown: false, animation: "fade" }}
          />
          <Stack.Screen
            name="login-social"
            options={{ headerShown: false, animation: "fade" }}
          />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding-new" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding-v3" options={{ headerShown: false }} />
          <Stack.Screen name="claim" options={{ headerShown: false }} />
          <Stack.Screen name="plan-ready" options={{ headerShown: false }} />
          <Stack.Screen name="achievements" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        </Stack>
        {/* NEW happy-path overlay: busy while restore + redemption run, then
            a final "Tu Brainy está listo" confirmation with the REAL
            materialized counts and an "Empezar" CTA that routes straight to
            HOME. No /claim navigation, no onboarding, no extra paywall. */}
        <RestoringOverlay
          active={restoreUiState !== "idle"}
          summary={restoreSummary}
          retryable={restoreUiState === "retryable"}
          onRetry={session?.user?.id ? () => {
            void runFunnelRestore(session.user.id).then((outcome) => {
              if (outcome === "restored_replay") router.replace("/(tabs)");
            });
          } : undefined}
          onStart={() => {
            finishFunnelRestore();
            router.replace("/(tabs)");
          }}
        />
      </View>
    </ThemeProvider>
  );
}
