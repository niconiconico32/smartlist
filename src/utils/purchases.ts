import { Platform } from 'react-native';
import Purchases, {
    LOG_LEVEL,
    type CustomerInfo,
    type PurchasesPackage,
} from 'react-native-purchases';

// ─── Configuration ────────────────────────────────────────────────────────────

const REVENUECAT_API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
};

/** The entitlement identifier configured in RevenueCat */
export const ENTITLEMENT_ID = 'premium_access';

// ─── Initialize ───────────────────────────────────────────────────────────────

let isConfigured = false;

/**
 * Configure RevenueCat SDK. Must be called once at app startup,
 * BEFORE any purchase or customer info calls.
 */
export async function configurePurchases(): Promise<void> {
  if (isConfigured) return;

  const apiKey =
    Platform.OS === 'ios' ? REVENUECAT_API_KEYS.ios : REVENUECAT_API_KEYS.android;

  if (!apiKey) {
    console.warn('⚠️ RevenueCat API key missing for', Platform.OS);
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({ apiKey });
  isConfigured = true;
}

// ─── User Identity ────────────────────────────────────────────────────────────

/**
 * Link the RevenueCat anonymous user to a Supabase user ID.
 * Call this immediately after Supabase sign-in.
 */
export async function loginUser(supabaseUserId: string): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.logIn(supabaseUserId);
  return customerInfo;
}

/**
 * Log out the current user from RevenueCat (resets to anonymous).
 * Call this when Supabase signs out.
 */
export async function logoutUser(): Promise<void> {
  await Purchases.logOut();
}

// ─── Entitlement Helpers ──────────────────────────────────────────────────────

/**
 * Check if the user currently has the premium entitlement.
 */
export function isPremiumActive(customerInfo: CustomerInfo): boolean {
  return ENTITLEMENT_ID in (customerInfo.entitlements.active ?? {});
}

/**
 * Fetch the latest customer info from RevenueCat.
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

// ─── Offerings / Packages ─────────────────────────────────────────────────────

/**
 * Get the main offering's available packages for the paywall.
 * Returns null if no offerings are configured.
 */
export async function getOfferings(): Promise<PurchasesPackage[] | null> {
  const offerings = await Purchases.getOfferings();
  if (!offerings.current?.availablePackages.length) {
    return null;
  }
  return offerings.current.availablePackages;
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

export interface PurchaseResult {
  success: boolean;
  customerInfo?: CustomerInfo;
  cancelled?: boolean;
  errorMessage?: string;
}

/**
 * Attempt to purchase a package (subscription / trial).
 * Handles user cancellation gracefully.
 */
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<PurchaseResult> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const premium = isPremiumActive(customerInfo);

    return {
      success: premium,
      customerInfo,
    };
  } catch (error: any) {
    // RevenueCat error code 1 = user cancelled
    if (error.userCancelled) {
      return { success: false, cancelled: true };
    }

    console.error('❌ Purchase error:', error.message);
    return {
      success: false,
      cancelled: false,
      errorMessage: error.message,
    };
  }
}

/**
 * Restore previously purchased subscriptions.
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

// ─── Re-exports for convenience ───────────────────────────────────────────────

export { Purchases };
export type { CustomerInfo, PurchasesPackage };

