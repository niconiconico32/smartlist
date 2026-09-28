import { FunctionsHttpError } from "@supabase/supabase-js";
import { posthog } from "@/src/config/posthog";
import { supabase } from "@/src/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FunnelPlanStatus = "pending" | "claiming" | "claimed";

export type RestoreDiscovery =
  | { status: "no_plan" }
  | {
      status: "found";
      planId: string;
      statusKey: FunnelPlanStatus;
      claimedByUser: boolean;
      alreadyRestored: boolean;
      hasRedemption: boolean;
      redemption?: { url: string };
    }
  | { status: "forbidden" }
  | { status: "error"; code?: string };

/**
 * DISCOVERY-only restore lookup for the NEW email+OTP flow. Identity comes ONLY
 * from the session JWT — the client never sends an email, claim token or
 * redemption URL. The edge function matches the plan by the user's verified
 * Supabase Auth email and returns MINIMAL info (planId + status + redemption
 * URL if any). It NEVER materializes: that is finalizeFunnelPlan's job, AFTER
 * a successful RevenueCat redemption + server-side entitlement verification.
 */
export async function discoverFunnelPlan(): Promise<RestoreDiscovery> {
  posthog.capture("funnel_restore_check_started");

  try {
    const { data, error } = await supabase.functions.invoke(
      "restore-funnel-plan",
      { body: {} },
    );

    if (error) {
      const code = await extractErrorCode(error);
      posthog.capture("funnel_restore_failed", { reason: code ?? "error" });
      if (code === "forbidden") return { status: "forbidden" };
      return { status: "error", code };
    }

    const result = data as {
      found?: boolean;
      planId?: string;
      status?: string;
      claimedByUser?: boolean;
      alreadyRestored?: boolean;
      hasRedemption?: boolean;
      redemption?: { url?: string };
      error?: string;
    } | null;

    if (!result || result.found !== true || !result.planId) {
      posthog.capture("funnel_restore_not_found", { reason: "no_plan" });
      return { status: "no_plan" };
    }

    posthog.capture("funnel_restore_found", {
      alreadyRestored: result.alreadyRestored === true,
    });

    const hasRedemption = result.hasRedemption === true;
    return {
      status: "found",
      planId: result.planId,
      statusKey: isFunnelPlanStatus(result.status) ? result.status : "pending",
      claimedByUser: result.claimedByUser === true,
      alreadyRestored: result.alreadyRestored === true,
      hasRedemption,
      ...(hasRedemption && result.redemption?.url
        ? { redemption: { url: result.redemption.url } }
        : {}),
    };
  } catch (e) {
    console.error("restore-funnel-plan error:", e);
    posthog.capture("funnel_restore_failed", { reason: "network_error" });
    return { status: "error", code: "network" };
  }
}

function isFunnelPlanStatus(value: unknown): value is FunnelPlanStatus {
  return value === "pending" || value === "claiming" || value === "claimed";
}

/**
 * Marks the plan's pending RevenueCat redemption as consumed (server-side,
 * guarded so only the plan owner can call it). Called AFTER a successful
 * redeem to prevent accidental URL re-use.
 */
export async function consumeFunnelRedemption(
  planId: string,
): Promise<{ success: boolean; alreadyConsumed?: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("consume_funnel_redemption", {
      p_plan_id: planId,
    });
    if (error) return { success: false, error: error.message };
    const parsed =
      typeof data === "string" ? JSON.parse(data) : (data as Record<string, any>);
    return {
      success: parsed?.success === true,
      alreadyConsumed: parsed?.alreadyConsumed === true,
      ...(parsed?.error ? { error: parsed.error } : {}),
    };
  } catch (e) {
    console.error("consume_funnel_redemption error:", e);
    return { success: false, error: "network" };
  }
}

async function extractErrorCode(error: unknown): Promise<string | undefined> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string };
      return body?.error;
    } catch {
      return undefined;
    }
  }
  return "network";
}

// ─── Analytics event names ────────────────────────────────────────────────────

export const RESTORE_ANALYTICS = {
  check_started: "funnel_restore_check_started",
  not_found: "funnel_restore_not_found",
  found: "funnel_restore_found",
  failed: "funnel_restore_failed",
} as const;