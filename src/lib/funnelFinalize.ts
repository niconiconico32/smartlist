import { FunctionsHttpError } from "@supabase/supabase-js";
import { posthog } from "@/src/config/posthog";
import { supabase } from "@/src/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FunnelSummary {
  planId: string;
  taskCount: number;
  routineCount: number;
  eggCount: number;
  claimedAt: string;
  routines: {
    id: string;
    name: string;
    icon: string;
    steps: number;
    eggCatalogId: number | null;
  }[];
}

export type FinalizeResult =
  | { status: "finalized_fresh"; planId: string; summary: FunnelSummary }
  | { status: "finalized_replay"; planId: string; summary: FunnelSummary }
  | { status: "entitlement_inactive" }
  | { status: "verification_unavailable" }
  | { status: "token_expired" }
  | { status: "forbidden" }
  | { status: "error"; code?: string };

/**
 * Server-side finalize for the NEW email+OTP flow. Input is { planId } ONLY —
 * no claimToken, no client email, no redemption token. The edge function:
 *   * derives identity from the session JWT (auth.uid() + verified email),
 *   * checks plan ownership + idempotency,
 *   * verifies the ACTIVE "brainy Pro" entitlement SERVER-SIDE via RevenueCat
 *     SECRET API KEY (never in the app),
 *   * and ONLY then materializes tasks/routines/steps/eggs atomically.
 *
 * Returns real materialized counts; replays return alreadyFinalized info and
 * never touch data again.
 */
export async function finalizeFunnelPlan(
  planId: string,
): Promise<FinalizeResult> {
  posthog.capture("funnel_finalize_started", { planId });

  try {
    const { data, error } = await supabase.functions.invoke(
      "finalize-funnel-plan",
      { body: { planId } },
    );

    if (error) {
      return classifyFinalizeError(error);
    }

    const result = data as {
      success?: boolean;
      alreadyFinalized?: boolean;
      planId?: string;
      taskCount?: number;
      routineCount?: number;
      eggCount?: number;
      claimedAt?: string | null;
      routines?: FunnelSummary["routines"];
    } | null;

    if (!result?.success) {
      posthog.capture("funnel_finalize_failed", { reason: "unknown" });
      return { status: "error", code: "unknown" };
    }

    const summary: FunnelSummary = {
      planId: result.planId ?? planId,
      taskCount: result.taskCount ?? 0,
      routineCount: result.routineCount ?? 0,
      eggCount: result.eggCount ?? 0,
      claimedAt: result.claimedAt ?? new Date().toISOString(),
      routines: result.routines ?? [],
    };

    if (result.alreadyFinalized === true) {
      posthog.capture("funnel_finalize_replay", { planId });
      return { status: "finalized_replay", planId: summary.planId, summary };
    }

    posthog.capture("funnel_finalize_success", {
      planId,
      taskCount: summary.taskCount,
      routineCount: summary.routineCount,
      eggCount: summary.eggCount,
    });

    return { status: "finalized_fresh", planId: summary.planId, summary };
  } catch (e) {
    console.error("finalize-funnel-plan error:", e);
    posthog.capture("funnel_finalize_failed", { reason: "network_error" });
    return { status: "error", code: "network" };
  }
}

async function classifyFinalizeError(
  error: unknown,
): Promise<FinalizeResult> {
  if (error instanceof FunctionsHttpError) {
    let body: { error?: string } | null = null;
    let status = 500;
    try {
      body = (await error.context.json()) as { error?: string };
      status = error.context.status;
    } catch {
      // fall through with default status
    }

    const code = body?.error;

    if (status === 503 || code === "verification_unavailable") {
      posthog.capture("funnel_finalize_failed", {
        reason: "verification_unavailable",
      });
      return { status: "verification_unavailable" };
    }
    if (code === "entitlement_inactive") {
      posthog.capture("funnel_finalize_failed", { reason: "entitlement_inactive" });
      return { status: "entitlement_inactive" };
    }
    if (status === 401) {
      posthog.capture("funnel_finalize_failed", { reason: "unauthorized" });
      return { status: "error", code: "unauthorized" };
    }
    if (status === 403 || code === "forbidden") {
      posthog.capture("funnel_finalize_failed", { reason: "forbidden" });
      return { status: "forbidden" };
    }
    if (status === 410 || code === "token_expired") {
      posthog.capture("funnel_finalize_failed", { reason: "token_expired" });
      return { status: "token_expired" };
    }

    posthog.capture("funnel_finalize_failed", { reason: code ?? "error" });
    return { status: "error", code: code ?? "error" };
  }

  posthog.capture("funnel_finalize_failed", { reason: "network_error" });
  return { status: "error", code: "network" };
}