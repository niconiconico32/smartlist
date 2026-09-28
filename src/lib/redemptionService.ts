import Purchases, {
  WebPurchaseRedemptionResult,
  WebPurchaseRedemptionResultType,
  type CustomerInfo,
} from "react-native-purchases";
import { posthog } from "@/src/config/posthog";
import { isPremiumActive } from "@/src/utils/purchases";

/**
 * Redemption Link service.
 *
 * RevenueCat Redemption Links (STRIPE web purchases) are redeemed against the
 * RevenueCat backend for the CURRENTLY LOGGED IN app user. Before redeeming we
 * must ensure Purchases is identified with the Supabase user id (anonymous RC
 * users must never receive the entitlement).
 */

export type RedemptionStatus =
  | "success"
  | "error"
  | "invalid_token"
  | "expired"
  | "belongs_to_other_user"
  | "not_configured";

export interface RedemptionOutcome {
  status: RedemptionStatus;
  /** RevenueCat provides this ONLY for the EXPIRED result. Never logged. */
  obfuscatedEmail?: string;
  customerInfo?: CustomerInfo;
  message?: string;
}

export type RedemptionStepResult =
  | { step: "login_revenuecat"; ok: boolean }
  | { step: "redeem"; outcome: RedemptionOutcome };

/**
 * Binds the RevenueCat app user id to the Brainy user id. Safe to call
 * repeatedly — if already bound it's a no-op. Returns false when RC is not
 * configured (e.g. Expo Go) or the call fails.
 */
export async function ensureRevenueCatLogin(userId: string): Promise<boolean> {
  try {
    const info = await Purchases.getCustomerInfo();
    if (info?.originalAppUserId === userId) return true;
    await Purchases.logIn(userId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Redeems a web purchase Redemption Link. Never throws into the caller —
 * every documented outcome maps to a RedemptionOutcome.
 */
export async function redeemWebPurchaseFromUrl(
  redemptionUrl: string,
): Promise<RedemptionOutcome> {
  posthog.capture("web_redemption_started", { status: "pending" });

  try {
    const redemption =
      await Purchases.parseAsWebPurchaseRedemption(redemptionUrl);
    if (!redemption) {
      posthog.capture("web_redemption_failed", { status: "INVALID_TOKEN" });
      return { status: "invalid_token" };
    }

    const result = await Purchases.redeemWebPurchase(redemption);
    return classifyRedemptionResult(result);
  } catch (error) {
    posthog.capture("web_redemption_failed", { status: "ERROR" });
    return {
      status: "error",
      message: error instanceof Error ? error.message : undefined,
    };
  }
}

function classifyRedemptionResult(
  result: WebPurchaseRedemptionResult,
): RedemptionOutcome {
  switch (result.result) {
    case WebPurchaseRedemptionResultType.SUCCESS: {
      const customerInfo = result.customerInfo;
      if (!isPremiumActive(customerInfo)) {
        // Purchase associated but entitlement not active on this device yet.
        posthog.capture("web_redemption_failed", { status: "ERROR" });
        return { status: "error", customerInfo };
      }
      posthog.capture("web_redemption_success", { status: "SUCCESS" });
      return { status: "success", customerInfo };
    }
    case WebPurchaseRedemptionResultType.ERROR:
      posthog.capture("web_redemption_failed", { status: "ERROR" });
      return {
        status: "error",
        message: result.error?.message ?? "redemption_error",
      };
    case WebPurchaseRedemptionResultType.PURCHASE_BELONGS_TO_OTHER_USER:
      posthog.capture("web_redemption_failed", {
        status: "PURCHASE_BELONGS_TO_OTHER_USER",
      });
      return { status: "belongs_to_other_user" };
    case WebPurchaseRedemptionResultType.INVALID_TOKEN:
      posthog.capture("web_redemption_failed", { status: "INVALID_TOKEN" });
      return { status: "invalid_token" };
    case WebPurchaseRedemptionResultType.EXPIRED:
      posthog.capture("web_redemption_failed", { status: "EXPIRED" });
      return { status: "expired", obfuscatedEmail: result.obfuscatedEmail };
    default:
      posthog.capture("web_redemption_failed", { status: "ERROR" });
      return { status: "error" };
  }
}