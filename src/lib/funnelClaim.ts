import AsyncStorage from "@react-native-async-storage/async-storage";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { posthog } from "@/src/config/posthog";
import { supabase } from "@/src/lib/supabase";

// ─── AsyncStorage keys ────────────────────────────────────────────────────────

const PENDING_TOKEN_KEY = "brainy_pending_claim_token";
export const PENDING_REDEMPTION_KEY = "brainy_pending_redemption_url";
export const PENDING_EMAIL_KEY = "brainy_pending_funnel_email";
export const CLAIM_SUMMARY_KEY = "brainy_claim_summary";

// Web handoff analytics — fired at most once per app session so the funnel
// arrival is counted just once regardless of restarts during the same launch.
let handoffTrackedInSession = false;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClaimRoutine {
  id: string;
  name: string;
  icon: string;
  steps: number;
  eggCatalogId: number | null;
}

export interface ClaimSummary {
  planId: string;
  taskCount: number;
  routineCount: number;
  eggCount: number;
  claimedAt: string;
  routines: ClaimRoutine[];
}

export type ClaimErrorCode =
  | "invalid_token"
  | "token_expired"
  | "already_claimed"
  | "plan_not_ready"
  | "forbidden"
  | "network"
  | "unknown";

export interface ClaimResult {
  success: boolean;
  alreadyClaimed: boolean;
  summary?: ClaimSummary | null;
  error?: ClaimErrorCode;
}

// ─── Pending token (survives login/reload — never sent to analytics) ─────────

/**
 * Persists the claim token exactly once. `funnel_claim_received` fires only
 * the first time a given token is stored (i.e. when the deep link lands).
 */
export async function storePendingClaimToken(token: string): Promise<void> {
  const normalized = token.trim();
  if (!normalized) return;

  const existing = await AsyncStorage.getItem(PENDING_TOKEN_KEY);
  if (existing === normalized) return;

  await AsyncStorage.setItem(PENDING_TOKEN_KEY, normalized);
  posthog.capture("funnel_claim_received");
  await trackHandoffReceivedOnce();
}

export async function getPendingClaimToken(): Promise<string | null> {
  return AsyncStorage.getItem(PENDING_TOKEN_KEY);
}

export async function clearPendingClaimToken(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_TOKEN_KEY);
}

// ─── Web handoff parsing + pending redemption ─────────────────────────────────

export interface ParsedHandoffUrl {
  claimToken?: string;
  redemptionUrl?: string;
  email?: string;
}

/**
 * Decodes a possibly double-encoded value. Redemption URLs from the funnel web
 * are commonly encoded once inside the `redeem_url` query param.
 */
function decodePossiblyEncodedUrl(value: string): string {
  let out = value;
  for (let i = 0; i < 2; i++) {
    try {
      const decoded = decodeURIComponent(out);
      if (decoded === out) break;
      out = decoded;
    } catch {
      break;
    }
  }
  return out;
}

/**
 * Parses any incoming handoff URL without emitting analytics or touching
 * storage:
 *   brainy://claim?token=CLAIM_TOKEN&redeem_url=ENCODED_RC_URL
 *   brainy://claim/<token>
 *   rc-<appId>://...   (RevenueCat Redemption Link)
 */
export function parseHandoffUrl(rawUrl: string): ParsedHandoffUrl {
  const url = (rawUrl ?? "").trim();
  if (!url) return {};

  const lower = url.toLowerCase();
  if (lower.startsWith("rc-") || lower.startsWith("revenuecat:")) {
    return { redemptionUrl: url };
  }

  if (/^brainy:\/\/claim[?/]?/i.test(url)) {
    const qIndex = url.indexOf("?");
    const query = qIndex >= 0 ? url.slice(qIndex + 1) : "";
    const params = new URLSearchParams(query);
    const token = params.get("token")?.trim() || undefined;

    const email = params.get("email")?.trim().toLowerCase() || undefined;

    const redeemRaw = params.get("redeem_url");
    let redemptionUrl: string | undefined;
    if (redeemRaw && redeemRaw.trim()) {
      redemptionUrl = decodePossiblyEncodedUrl(redeemRaw.trim());
    }

    if (!token && !redemptionUrl) {
      // Fallback path form: brainy://claim/<token>
      const m = url.match(/^brainy:\/\/claim\/([^?]+)/i);
      const pathToken = m ? m[1].trim() : "";
      if (pathToken) return { claimToken: pathToken, email };
    }

    return { claimToken: token, redemptionUrl, email };
  }

  return {};
}

/** Counts the funnel arrival once per session (no tokens/URLs/emails). */
async function trackHandoffReceivedOnce(): Promise<void> {
  if (handoffTrackedInSession) return;
  handoffTrackedInSession = true;
  const [claimToken, redemptionUrl] = await Promise.all([
    AsyncStorage.getItem(PENDING_TOKEN_KEY),
    AsyncStorage.getItem(PENDING_REDEMPTION_KEY),
  ]);
  posthog.capture("web_handoff_received", {
    hasClaimToken: !!claimToken,
    hasRedemption: !!redemptionUrl,
  });
}

/**
 * Persists a RevenueCat Redemption Link immediately when it arrives so it
 * survives app kills, OAuth/Apple redirects and restarts. Fire-and-forget
 * safe: dedupes identical URLs.
 */
export async function storePendingRedemptionUrl(
  redemptionUrl: string,
): Promise<void> {
  const normalized = redemptionUrl.trim();
  if (!normalized) return;

  const existing = await AsyncStorage.getItem(PENDING_REDEMPTION_KEY);
  if (existing === normalized) return;

  await AsyncStorage.setItem(PENDING_REDEMPTION_KEY, normalized);
  await trackHandoffReceivedOnce();
}

export async function getPendingRedemptionUrl(): Promise<string | null> {
  return AsyncStorage.getItem(PENDING_REDEMPTION_KEY);
}

export async function clearPendingRedemptionUrl(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_REDEMPTION_KEY);
}

// ─── Pending funnel email (prefill for OTP login) ────────────────────────────

/**
 * Persists the email the funnel used for the purchase. Used to prefill the
 * login screen and drive the OTP flow in "funnel" context. NOT sent to
 * analytics and never treated as the identity of the claim (claimToken is).
 */
export async function storePendingFunnelEmail(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  const existing = await AsyncStorage.getItem(PENDING_EMAIL_KEY);
  if (existing === normalized) return;

  await AsyncStorage.setItem(PENDING_EMAIL_KEY, normalized);
}

export async function getPendingFunnelEmail(): Promise<string | null> {
  return AsyncStorage.getItem(PENDING_EMAIL_KEY);
}

export async function clearPendingFunnelEmail(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_EMAIL_KEY);
}

/** All pending handoff inputs (token, redemption URL, funnel email), in one read. */
export async function getPendingHandoff(): Promise<ParsedHandoffUrl> {
  const [claimToken, redemptionUrl, email] = await Promise.all([
    AsyncStorage.getItem(PENDING_TOKEN_KEY),
    AsyncStorage.getItem(PENDING_REDEMPTION_KEY),
    AsyncStorage.getItem(PENDING_EMAIL_KEY),
  ]);
  return {
    ...(claimToken ? { claimToken } : {}),
    ...(redemptionUrl ? { redemptionUrl } : {}),
    ...(email ? { email } : {}),
  };
}

/**
 * Clears every pending handoff input once the flow is fully complete
 * (purchase redemption + claim). Idempotent — safe to call repeatedly.
 */
export async function clearPendingHandoff(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(PENDING_TOKEN_KEY),
    AsyncStorage.removeItem(PENDING_REDEMPTION_KEY),
    AsyncStorage.removeItem(PENDING_EMAIL_KEY),
  ]);
}

// ─── Claim summary (drives the PlanReady screen) ─────────────────────────────

export async function setClaimSummary(summary: ClaimSummary): Promise<void> {
  await AsyncStorage.setItem(CLAIM_SUMMARY_KEY, JSON.stringify(summary));
}

export async function getClaimSummary(): Promise<ClaimSummary | null> {
  const raw = await AsyncStorage.getItem(CLAIM_SUMMARY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ClaimSummary;
  } catch {
    return null;
  }
}

export async function clearClaimSummary(): Promise<void> {
  await AsyncStorage.removeItem(CLAIM_SUMMARY_KEY);
}

// ─── Claim execution ──────────────────────────────────────────────────────────

let inFlight: Promise<ClaimResult> | null = null;

/**
 * Claims the funnel plan for `token`. Idempotent client-side: concurrent
 * calls for the same token share a single in-flight promise, and a
 * successful/terminal claim clears the pending token so it never replays.
 */
export function claimFunnelPlan(token: string): Promise<ClaimResult> {
  if (!inFlight) {
    inFlight = doClaimFunnelPlan(token).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function doClaimFunnelPlan(token: string): Promise<ClaimResult> {
  posthog.capture("funnel_claim_started");

  try {
    const { data, error } = await supabase.functions.invoke(
      "claim-funnel-plan",
      { body: { token } },
    );

    if (error) {
      console.log("[e2e-trace] claim invoke error:", error.message);
      const code = await extractErrorCode(error);
      return handleFailedClaim(code);
    }

    const result = data as {
      success?: boolean;
      alreadyClaimed?: boolean;
      error?: string;
      planId?: string;
      taskCount?: number;
      routineCount?: number;
      eggCount?: number;
      claimedAt?: string;
      routines?: ClaimRoutine[];
    } | null;

    if (!result || result.success === false) {
      const code = normalizeErrorCode(result?.error);
      return handleFailedClaim(code);
    }

    const summary: ClaimSummary = {
      planId: result.planId ?? "",
      taskCount: result.taskCount ?? 0,
      routineCount: result.routineCount ?? 0,
      eggCount: result.eggCount ?? 0,
      claimedAt: result.claimedAt ?? new Date().toISOString(),
      routines: result.routines ?? [],
    };

    await setClaimSummary(summary);
    await clearPendingClaimToken();

    posthog.capture("funnel_claim_success", {
      alreadyClaimed: result.alreadyClaimed === true,
      taskCount: summary.taskCount,
      routineCount: summary.routineCount,
      eggCount: summary.eggCount,
    });

    return {
      success: true,
      alreadyClaimed: result.alreadyClaimed === true,
      summary,
    };
  } catch (e) {
    console.error("claim-funnel-plan error:", e);
    return handleFailedClaim("network");
  }
}

async function handleFailedClaim(code: ClaimErrorCode): Promise<ClaimResult> {
  posthog.capture("funnel_claim_failed", { error: code });

  // Terminal errors invalidate the token; transient ones keep it for retry.
  if (code !== "network") {
    await clearPendingClaimToken();
  }

  return { success: false, alreadyClaimed: false, error: code };
}

async function extractErrorCode(error: unknown): Promise<ClaimErrorCode> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string };
      return normalizeErrorCode(body?.error);
    } catch {
      return "unknown";
    }
  }
  return "network";
}

function normalizeErrorCode(code?: string): ClaimErrorCode {
  switch (code) {
    case "invalid_token":
    case "token_expired":
    case "already_claimed":
    case "plan_not_ready":
      return code;
    case "forbidden":
    case "unauthorized":
      return "forbidden";
    default:
      return code ? "unknown" : "unknown";
  }
}