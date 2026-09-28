import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  claimFunnelPlan,
  clearPendingRedemptionUrl,
  clearPendingFunnelEmail,
  getPendingClaimToken,
  getPendingRedemptionUrl,
  storePendingClaimToken,
  storePendingRedemptionUrl,
} from "@/src/lib/funnelClaim";
import {
  ensureRevenueCatLogin,
  redeemWebPurchaseFromUrl,
  type RedemptionOutcome,
} from "@/src/lib/redemptionService";
import { syncEggsWithCloud } from "@/src/lib/userEggService";
import { useOnboardingStore } from "@/src/store/onboardingStore";
import { useProStore } from "@/src/store/proStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Wizard types ────────────────────────────────────────────────────────────

type VisibleStep = "pro" | "plan" | "routines" | "pets";

type ErrorKind =
  | "network"
  | "invalid_redemption"
  | "expired_redemption"
  | "other_user"
  | "claim_failed"
  | "redemption_failed";

interface ErrorConfig {
  titleKey: string;
  messageKey: string;
}

type Phase =
  | { kind: "stream"; active: VisibleStep | null; done: VisibleStep[] }
  | { kind: "error"; error: ErrorKind; email?: string; code?: string }
  | { kind: "done"; route: "plan_ready" | "home" };

function buildSteps(hasRedemption: boolean, hasClaim: boolean): VisibleStep[] {
  const steps: VisibleStep[] = [];
  if (hasRedemption) steps.push("pro");
  if (hasClaim) steps.push("plan");
  steps.push("routines", "pets");
  return steps;
}

function terminalRedemption(status: RedemptionOutcome["status"]): boolean {
  return (
    status === "expired" ||
    status === "invalid_token" ||
    status === "belongs_to_other_user"
  );
}

function terminalError(outcome: RedemptionOutcome): { kind: "error"; error: ErrorKind; email?: string } {
  if (outcome.status === "expired") {
    return { kind: "error", error: "expired_redemption", email: outcome.obfuscatedEmail };
  }
  if (outcome.status === "belongs_to_other_user") {
    return { kind: "error", error: "other_user" };
  }
  return { kind: "error", error: "invalid_redemption" };
}

const ERROR_CONFIG: Record<ErrorKind, ErrorConfig> = {
  network: {
    titleKey: "funnel.handoff.error_network_title",
    messageKey: "funnel.handoff.error_network_message",
  },
  invalid_redemption: {
    titleKey: "funnel.handoff.error_invalid_title",
    messageKey: "funnel.handoff.error_invalid_message",
  },
  expired_redemption: {
    titleKey: "funnel.handoff.error_expired_title",
    messageKey: "funnel.handoff.error_expired_message",
  },
  other_user: {
    titleKey: "funnel.handoff.error_other_user_title",
    messageKey: "funnel.handoff.error_other_user_message",
  },
  claim_failed: {
    titleKey: "funnel.handoff.error_claim_title",
    messageKey: "funnel.handoff.error_claim_message",
  },
  redemption_failed: {
    titleKey: "funnel.handoff.error_redemption_title",
    messageKey: "funnel.handoff.error_redemption_message",
  },
};

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ClaimScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; redeem_url?: string }>();
  const { session, isLoading: authLoading, signOut } = useAuth();

  const [phase, setPhase] = useState<Phase>({
    kind: "stream",
    active: null,
    done: [],
  });

  const startedRef = useRef(false);
  const claimTokenRef = useRef<string | null>(null);
  const redemptionUrlRef = useRef<string | null>(null);
  const claimOkRef = useRef(false);
  const redemptionOkRef = useRef(false);
  const claimErrorRef = useRef<string | null>(null);

  const isRealUser =
    !!session?.user?.id && session.user.is_anonymous !== true;

  const goHome = useCallback(() => {
    router.replace(isRealUser ? "/(tabs)" : "/login");
  }, [isRealUser, router]);

  // ── Orchestration ─────────────────────────────────────────────────────────

  const process = useCallback(async () => {
    const claimToken = claimTokenRef.current;
    const redemptionUrl = redemptionUrlRef.current;

    console.log("[e2e-trace] claim process start", {
      hasToken: !!claimToken,
      hasRedeem: !!redemptionUrl,
      realUser: isRealUser,
    });

    if (!claimToken && !redemptionUrl) {
      goHome();
      return;
    }
    if (!isRealUser) {
      // Anonymous (or missing) session: keep the handoff pending and ask for
      // a real login. Pending values survive the whole login round trip.
      router.replace("/login");
      return;
    }

    const userId = session!.user.id;
    const steps = buildSteps(!!redemptionUrl, !!claimToken);
    setPhase({ kind: "stream", active: steps[0] ?? "routines", done: [] });

    const markActive = (step: VisibleStep) =>
      setPhase((p) =>
        p.kind === "stream" ? { ...p, active: step } : p,
      );
    const markDone = (step: VisibleStep) =>
      setPhase((p) =>
        p.kind === "stream"
          ? { ...p, done: Array.from(new Set([...p.done, step])) }
          : p,
      );

    let outcome: RedemptionOutcome | null = null;

    // 1) Bind RevenueCat to the Supabase user, THEN redeem the web purchase.
    if (redemptionUrl) {
      markActive("pro");
      const rcReady = await ensureRevenueCatLogin(userId);
      if (rcReady) {
        outcome = await redeemWebPurchaseFromUrl(redemptionUrl);
        if (outcome.status === "success") {
          await clearPendingRedemptionUrl();
          await useProStore.getState().activatePermanentPro();
          redemptionOkRef.current = true;
          markDone("pro");
        }
      } else {
        outcome = { status: "error", message: "not_configured" };
      }
    }

    // 2) Claim the funnel plan (idempotent; alreadyClaimed counts as success).
    if (claimToken) {
      markActive("plan");
      const result = await claimFunnelPlan(claimToken);
      console.log("[e2e-trace] claim result", {
        ok: result.success,
        already: result.alreadyClaimed,
        error: result.error ?? null,
      });
      claimErrorRef.current = result.error ?? null;
      if (result.success) {
        claimOkRef.current = true;
        markDone("plan");
      }
    }

    // 3) Sync local state so the user sees funnel data immediately.
    markActive("routines");
    if (claimOkRef.current) {
      await useOnboardingStore.getState().completeOnboarding();
    }
    await syncEggsWithCloud(userId).catch(() => {});
    markDone("routines");
    markDone("pets");

    // 4) Decide where to land — never re-charge, never re-create the plan.
    let next: Phase;
    if (redemptionUrl && outcome) {
      const status = outcome.status;
      if (status === "success") {
        if (claimOkRef.current) {
          next = { kind: "done", route: "plan_ready" };
        } else if (claimToken) {
          next = {
            kind: "error",
            error: "claim_failed",
            code: claimErrorRef.current ?? undefined,
          };
        } else {
          next = { kind: "done", route: "home" };
        }
      } else if (claimOkRef.current) {
        next = { kind: "error", error: "redemption_failed" };
      } else if (claimToken) {
        next = terminalRedemption(status)
          ? terminalError(outcome)
          : {
              kind: "error",
              error: "claim_failed",
              code: claimErrorRef.current ?? undefined,
            };
      } else {
        next = terminalRedemption(status)
          ? terminalError(outcome)
          : { kind: "error", error: "network" };
      }
    } else if (claimToken) {
      next = claimOkRef.current
        ? { kind: "done", route: "plan_ready" }
        : {
            kind: "error",
            error: "claim_failed",
            code: claimErrorRef.current ?? undefined,
          };
    } else {
      next = { kind: "error", error: "network" };
    }

    setPhase(next);
    console.log("[e2e-trace] claim phase", {
      kind: next.kind,
      route: next.kind === "done" ? next.route : undefined,
      error: next.kind === "error" ? next.error : undefined,
    });

    // Funnel fully completed → the pending funnel email is no longer needed
    // (token + redemption URL are already cleared by the steps above).
    if (next.kind === "done") {
      clearPendingFunnelEmail().catch(() => {});
    }
  }, [goHome, isRealUser, router, session]);

  const gatherAndRun = useCallback(async () => {
    const paramToken =
      typeof params.token === "string" ? params.token.trim() : null;
    const paramRedeem =
      typeof params.redeem_url === "string" ? params.redeem_url.trim() : null;

    const [pendingToken, pendingRedeem] = await Promise.all([
      getPendingClaimToken(),
      getPendingRedemptionUrl(),
    ]);

    const claimToken = paramToken || pendingToken?.trim() || null;
    const redemptionUrl = paramRedeem || pendingRedeem?.trim() || null;

    claimTokenRef.current = claimToken;
    redemptionUrlRef.current = redemptionUrl;

    await Promise.all([
      claimToken ? storePendingClaimToken(claimToken).catch(() => {}) : Promise.resolve(),
      redemptionUrl
        ? storePendingRedemptionUrl(redemptionUrl).catch(() => {})
        : Promise.resolve(),
    ]);

    await process();
  }, [params, process]);

  useEffect(() => {
    if (authLoading || startedRef.current) return;
    startedRef.current = true;
    gatherAndRun().catch(() => {
      setPhase({ kind: "error", error: "network" });
    });
  }, [authLoading, gatherAndRun]);

  // Navigate when the flow finished successfully.
  useEffect(() => {
    if (phase.kind === "done") {
      if (phase.route === "plan_ready") {
        router.replace("/plan-ready");
      } else {
        goHome();
      }
    }
  }, [phase, router, goHome]);

  // ── Recovery actions ──────────────────────────────────────────────────────

  const retryAll = useCallback(() => {
    claimOkRef.current = false;
    redemptionOkRef.current = false;
    claimErrorRef.current = null;
    process().catch(() => setPhase({ kind: "error", error: "network" }));
  }, [process]);

  const retryClaim = useCallback(async () => {
    const token = claimTokenRef.current;
    if (!token || !isRealUser) return;
    setPhase({ kind: "stream", active: "plan", done: [] });
    const result = await claimFunnelPlan(token);
    claimErrorRef.current = result.error ?? null;
    if (result.success) {
      claimOkRef.current = true;
      await useOnboardingStore.getState().completeOnboarding();
      await syncEggsWithCloud(session!.user.id).catch(() => {});
      setPhase({ kind: "done", route: "plan_ready" });
    } else {
      setPhase({
        kind: "error",
        error: "claim_failed",
        code: result.error ?? undefined,
      });
    }
  }, [isRealUser, session]);

  const retryRedemption = useCallback(async () => {
    const url = redemptionUrlRef.current;
    if (!url || !isRealUser) return;
    setPhase({ kind: "stream", active: "pro", done: [] });
    const outcome = await redeemWebPurchaseFromUrl(url);
    if (outcome.status === "success") {
      await clearPendingRedemptionUrl();
      await useProStore.getState().activatePermanentPro();
      redemptionOkRef.current = true;
      setPhase(
        claimOkRef.current
          ? { kind: "done", route: "plan_ready" }
          : { kind: "done", route: "home" },
      );
      return;
    }
    if (terminalRedemption(outcome.status)) {
      setPhase(terminalError(outcome));
      return;
    }
    setPhase({ kind: "error", error: "redemption_failed" });
  }, [isRealUser, session]);

  const switchAccount = useCallback(async () => {
    await signOut().catch(() => {});
    router.replace("/login");
  }, [signOut, router]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase.kind === "error") {
    const cfg = ERROR_CONFIG[phase.error];
    const showEmail = phase.error === "expired_redemption" && !!phase.email;

    let primary: { label: string; onPress: () => void } | null = null;
    let secondary: { label: string; onPress: () => void } | null = null;

    switch (phase.error) {
      case "network":
        primary = { label: t("funnel.handoff.retry"), onPress: retryAll };
        break;
      case "invalid_redemption":
      case "expired_redemption":
        primary = { label: t("funnel.handoff.home"), onPress: goHome };
        break;
      case "other_user":
        primary = {
          label: t("funnel.handoff.error_other_user_cta"),
          onPress: switchAccount,
        };
        secondary = { label: t("funnel.handoff.home"), onPress: goHome };
        break;
      case "claim_failed":
        primary = {
          label: t("funnel.handoff.retry_claim"),
          onPress: retryClaim,
        };
        secondary = { label: t("funnel.handoff.home"), onPress: goHome };
        break;
      case "redemption_failed":
        primary = {
          label: t("funnel.handoff.retry_redemption"),
          onPress: retryRedemption,
        };
        secondary = { label: t("funnel.handoff.home"), onPress: goHome };
        break;
    }

    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.center}>
          <Text
            testID={`handoffError_${phase.error}`}
            style={styles.errorTitle}
          >
            {t(cfg.titleKey)}
          </Text>
          <Text style={styles.errorMessage}>
            {showEmail
              ? t("funnel.handoff.error_expired_message_email", {
                  email: phase.email,
                })
              : t(cfg.messageKey)}
          </Text>
          {primary && (
            <Pressable
              testID="handoffPrimaryCta"
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
              onPress={primary.onPress}
            >
              <Text style={styles.ctaText}>{primary.label}</Text>
            </Pressable>
          )}
          {secondary && (
            <Pressable testID="handoffSecondaryCta" style={styles.secondaryCta} onPress={secondary.onPress}>
              <Text style={styles.secondaryCtaText}>{secondary.label}</Text>
            </Pressable>
          )}
        </SafeAreaView>
      </View>
    );
  }

  if (phase.kind === "done") {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </SafeAreaView>
      </View>
    );
  }

  const steps = buildSteps(
    !!redemptionUrlRef.current,
    !!claimTokenRef.current,
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Text
          testID="handoffPreparing"
          style={styles.title}
        >
          {t("funnel.handoff.preparing_title")}
        </Text>
        <View style={styles.steps}>
          {steps.map((step) => {
            const done = phase.done.includes(step);
            const active = phase.active === step;
            return (
              <View key={step} style={styles.stepRow}>
                {done ? (
                  <Text style={styles.stepStateDone}>●</Text>
                ) : active ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.stepState}>○</Text>
                )}
                <Text
                  style={[
                    styles.stepLabel,
                    active && styles.stepLabelActive,
                    done && styles.stepLabelDone,
                  ]}
                >
                  {t(`funnel.handoff.step_${step}`)}
                </Text>
              </View>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  steps: {
    alignSelf: "stretch",
    paddingHorizontal: 40,
    gap: 18,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepState: {
    width: 24,
    textAlign: "center",
    color: colors.textTertiary,
    fontSize: 16,
  },
  stepStateDone: {
    width: 24,
    textAlign: "center",
    color: colors.primary,
    fontSize: 16,
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  stepLabelActive: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  stepLabelDone: {
    color: colors.textTertiary,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  errorMessage: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  cta: {
    marginTop: 18,
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    alignSelf: "stretch",
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primaryContent,
  },
  secondaryCta: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryCtaText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
});