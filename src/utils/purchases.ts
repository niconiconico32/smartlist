import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

export const ENTITLEMENT_ID = 'brainy Pro';
export const OFFERING_ID = process.env.EXPO_PUBLIC_REVENUECAT_OFFERING_ID ?? 'default';

const API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
};

let configured = false;

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export async function configurePurchases(): Promise<void> {
  if (configured) return;

  if (isExpoGo()) {
    configured = true;
    return;
  }

  const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android;
  if (!apiKey) {
    console.warn('RevenueCat API key missing for', Platform.OS);
    return;
  }

  // Modo dios RevenueCat: debug y log handler
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    Purchases.setLogHandler((...args: any[]) => {
      console.log(`[RC DETECTIVE RAW]`, ...args);
    });
  }

  Purchases.configure({ apiKey });
  configured = true;
}

export async function loginUser(userId: string): Promise<CustomerInfo> {
  if (isExpoGo()) return { entitlements: { active: {} } } as CustomerInfo;
  const { customerInfo } = await Purchases.logIn(userId);
  return customerInfo;
}

export async function logoutUser(): Promise<void> {
  if (isExpoGo()) return;
  await Purchases.logOut();
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  if (isExpoGo()) return { entitlements: { active: {} } } as CustomerInfo;
  return Purchases.getCustomerInfo();
}

export function isPremiumActive(customerInfo: CustomerInfo): boolean {
  return ENTITLEMENT_ID in (customerInfo.entitlements.active ?? {});
}

export async function getOffering(): Promise<PurchasesOffering | null> {
  if (isExpoGo()) return null;
  let offerings;
  try {
    // Forzar fetch desde la nube si el SDK lo soporta
    offerings = await Purchases.getOfferings({ fetchPolicy: 'fetchCurrent' });
  } catch (e) {
    // Si la opción no está soportada, fallback a la llamada normal
    offerings = await Purchases.getOfferings();
  }
  return offerings.all[OFFERING_ID] ?? offerings.current ?? null;
}

export async function getOfferings(): Promise<PurchasesPackage[] | null> {
  const offering = await getOffering();
  return offering?.availablePackages ?? null;
}

export interface PurchaseResult {
  success: boolean;
  customerInfo?: CustomerInfo;
  cancelled?: boolean;
  errorMessage?: string;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
  if (isExpoGo()) {
    return { success: false, errorMessage: 'Unavailable in Expo Go' };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return {
      success: isPremiumActive(customerInfo),
      customerInfo,
    };
  } catch (error: any) {
    if (error?.userCancelled) {
      return { success: false, cancelled: true };
    }

    return {
      success: false,
      cancelled: false,
      errorMessage: error?.message ?? 'Purchase failed',
    };
  }
}

export async function restorePurchases(): Promise<CustomerInfo> {
  if (isExpoGo()) return { entitlements: { active: {} } } as CustomerInfo;
  return Purchases.restorePurchases();
}

export type { CustomerInfo, PurchasesOffering, PurchasesPackage };

