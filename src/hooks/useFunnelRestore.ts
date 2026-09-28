import { posthog } from "@/src/config/posthog";
import { useCallback, useRef, useState } from "react";
import Purchases from "react-native-purchases";
import {
  RESTORE_ANALYTICS as A,
  discoverFunnelPlan,
} from "@/src/lib/funnelRestore";
import { finalizeFunnelPlan } from "@/src/lib/funnelFinalize";
import {
  ensureRevenueCatLogin,
  redeemWebPurchaseFromUrl,
} from "@/src/lib/redemptionService";
import { useOnboardingStore } from "@/src/store/onboardingStore";
import { useRedemptionStore } from "@/src/store/redemptionStore";
import { isPremiumActive } from "@/src/utils/purchases";

export type RestoreOutcome =
  | "restored_fresh"
  | "restored_replay"
  | "no_plan"
  | "redeem_expired"
  | "redeem_blocked"
  | "error"
  | "skipped";
export type RestoreUiState = "idle" | "checking" | "redeeming" | "finalizing" | "ready" | "retryable";

export interface RestoreReadySummary {
  taskCount: number;
  routineCount: number;
  eggCount: number;
}

/**
 * Post-login restore orchestrator for the NEW email+OTP happy path:
 *
 *   authenticated → restore-funnel-plan (DISCOVERY, verified-email lookup)
 *   → ensure RevenueCat login → redeem redemption link (or reuse an
 *     already-active entitlement on reopen/recovery)
 *   → finalize-funnel-plan (authoritative SERVER-side "brainy Pro" check)
 *   → materialization (idempotent RPC) → completeOnboarding → HOME.
 *
 * The ONLY happy exit is a successful finalize: an expired redemption NEVER
 * materializes — RevenueCat auto-emails a fresh link to the billing email, the
 * plan is kept for recovery, and a reopen finds it again. A transient failure
 * keeps the pending redemption in the store so the Home banner can retry it.
 *
 * Runs EXACTLY once per authenticated session (single-flight per user id).
 */
export function useFunnelRestore() {
  const [state, setState] = useState<RestoreUiState>("idle");
  const [summary, setSummary] = useState<RestoreReadySummary | null>(null);
  const doneForRef = useRef<Record<string, Promise<RestoreOutcome> | undefined>>(
    {},
  );

  const finish = useCallback(() => {
    setSummary(null);
    setState("idle");
  }, []);

  const run = useCallback(async (userId: string): Promise<RestoreOutcome> => {
    if (!userId) return "skipped";
    const inFlight = doneForRef.current[userId];
    if (inFlight) return inFlight;

    const p = (async (): Promise<RestoreOutcome> => {
      setState("checking");
      const discovery = await discoverFunnelPlan();

      if (discovery.status === "no_plan" || discovery.status === "forbidden") {
        delete doneForRef.current[userId];
        setState("idle");
        return "no_plan";
      }
      if (discovery.status !== "found") {
        delete doneForRef.current[userId];
        setState("idle");
        return "error";
      }

      const { planId } = discovery;

      // Already materialized in a previous session → replay straight to HOME.
      if (discovery.alreadyRestored) {
        setState("idle");
        return "restored_replay";
      }

      // ── 1) Ensure RC identity + reuse an already-active entitlement ─────
      await ensureRevenueCatLogin(userId).catch(() => {});
      let customerInfo = await Purchases.getCustomerInfo().catch(() => null);
      let entitled = customerInfo !== null && isPremiumActive(customerInfo);

      // ── 2) Redeem the persisted redemption link (if not entitled yet) ────
      if (!entitled && discovery.hasRedemption && discovery.redemption?.url) {
        const url = discovery.redemption.url;
        setState("redeeming");
        await useRedemptionStore
          .getState()
          .setPending(planId, url)
          .catch(() => {});

        const outcome = await redeemWebPurchaseFromUrl(url);
        if (outcome.status === "success") {
          // Entitlement granted on THIS device. NOTE: we do NOT consume here —
          // the plan is still pending (owner not assigned yet); finalize
          // consumes the server-side URL right after a successful claim.
          customerInfo = outcome.customerInfo ?? null;
          entitled = customerInfo !== null && isPremiumActive(customerInfo);
        } else if (outcome.status === "expired") {
          // Recovery: NO claim. RevenueCat sends a new redemption link to the
          // billing email (links expire ~60 min; an expired link triggers a
          // fresh one). Keep the plan + clear the dead local URL.
          posthog.capture(A.failed, { reason: "redeem_expired" });
          const r = useRedemptionStore.getState();
          await r.clearPending().catch(() => {});
          await r.markTerminal("expired").catch(() => {});
          setState("idle");
          return "redeem_expired";
        } else if (
          outcome.status === "invalid_token" ||
          outcome.status === "belongs_to_other_user" ||
          outcome.status === "not_configured"
        ) {
          posthog.capture(A.failed, { reason: `redeem_${outcome.status}` });
          const r = useRedemptionStore.getState();
          await r.clearPending().catch(() => {});
          await r.markTerminal(outcome.status).catch(() => {});
          setState("idle");
          return "redeem_blocked";
        } else {
          // Transient (network / RC error): keep the pending URL so the Home
          // banner owns the retry; plan stays for a later finalize.
          posthog.capture(A.failed, { reason: "redeem_error" });
          setState("idle");
          return "error";
        }
      }

      if (!entitled) {
        // No active entitlement and no usable redemption → nothing commercial
        // to finalize. Legacy claim-token plans keep working via /claim.
        posthog.capture(A.failed, { reason: "not_entitled" });
        setState("idle");
        return "no_plan";
      }

      // ── 3) FINALIZE — the server-side RevenueCat check is the gate ───────
      setState("finalizing");
      const fin = await finalizeFunnelPlan(planId);

      if (fin.status === "finalized_fresh" || fin.status === "finalized_replay") {
        try {
          await useOnboardingStore.getState().completeOnboarding();
        } catch (e) {
          console.error("restore completeOnboarding error:", e);
        }

        if (fin.status === "finalized_replay") {
          posthog.capture("funnel_restore_complete", { replay: true });
          setState("idle");
          return "restored_replay";
        }

        posthog.capture("funnel_restore_complete", { replay: false });
        setSummary({
          taskCount: fin.summary.taskCount,
          routineCount: fin.summary.routineCount,
          eggCount: fin.summary.eggCount,
        });
        setState("ready");
        return "restored_fresh";
      }

      if (fin.status === "entitlement_inactive") {
        // Server says NOT entitled now (e.g. lapsed / wrong owner). Do NOT
        // materialize; recover like an expired redemption.
        const r = useRedemptionStore.getState();
        await r.clearPending().catch(() => {});
        await r.markTerminal("entitlement_inactive").catch(() => {});
        delete doneForRef.current[userId];
        setState("idle");
        return "redeem_blocked";
      }

      if (fin.status === "token_expired" || fin.status === "forbidden") {
        posthog.capture(A.failed, { reason: fin.status });
        delete doneForRef.current[userId];
        setState("retryable");
        return "error";
      }

      // verification_unavailable / network / unknown → transient; plan is kept
      // for a retry on the next session (no re-redeem needed — entitlement is
      // already active locally, so finalize re-runs directly).
      posthog.capture(A.failed, {
        reason: fin.status === "verification_unavailable"
          ? "verification_unavailable"
          : "finalize_error",
      });
      delete doneForRef.current[userId];
      setState("retryable");
      return "error";
    })();

    doneForRef.current[userId] = p;
    return p;
  }, []);

  const retry = useCallback(() => {
    if (state === "retryable") {
      setState("idle");
    }
  }, [state]);

  return { state, summary, run, finish, retry };
}