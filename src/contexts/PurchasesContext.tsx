import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

import { useAuth } from "@/src/contexts/AuthContext";
import { useProStore } from "@/src/store/proStore";
import {
    configurePurchases,
    getCustomerInfo,
    getOfferings,
    isPremiumActive,
    loginUser,
    logoutUser,
    purchasePackage as purchasePackageFn,
    restorePurchases as restorePurchasesFn,
    type CustomerInfo,
    type PurchaseResult,
    type PurchasesPackage,
} from "@/src/utils/purchases";

interface PurchasesContextType {
  isPremium: boolean;
  isLoadingPurchases: boolean;
  packages: PurchasesPackage[];
  purchasePackage: (pkg: PurchasesPackage) => Promise<PurchaseResult>;
  restorePurchases: () => Promise<boolean>;
  refreshCustomerInfo: () => Promise<void>;
}

const PurchasesContext = createContext<PurchasesContextType>({
  isPremium: false,
  isLoadingPurchases: true,
  packages: [],
  purchasePackage: async () => ({ success: false }),
  restorePurchases: async () => false,
  refreshCustomerInfo: async () => {},
});

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const { user, session, isLoading } = useAuth();
  const appUserId = user?.id ?? null;

  // Seed from the persisted store so a paid Pro survives the cold start even
  // before RevenueCat has answered. _layout awaits loadPro() before this
  // provider mounts, so this reads the hydrated value.
  const [isPremium, setIsPremium] = useState(() => useProStore.getState().isPro);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);

  const syncPremiumStatus = useCallback(
    async (info: CustomerInfo, opts?: { identified?: boolean }) => {
      const hasPro = isPremiumActive(info);
      setIsPremium(hasPro);

      const proStore = useProStore.getState();
      if (hasPro && !proStore.isPro) {
        await proStore.activatePermanentPro();
        return;
      }

      // Never revoke Pro from a read that is not tied to the identified user.
      // A customerInfo obtained before logIn (anonymous identity) says nothing
      // about whether THIS user is entitled, and using it to clear the store
      // wiped a paid entitlement on every cold start.
      const identified =
        opts?.identified ??
        Boolean(
          appUserId && info.originalAppUserId && info.originalAppUserId === appUserId,
        );

      if (!identified) return;

      if (!hasPro && proStore.isPro) {
        await proStore.cancelPermanentPro();
      }
    },
    [appUserId],
  );

  const refreshCustomerInfo = useCallback(async () => {
    try {
      const info = await getCustomerInfo();
      await syncPremiumStatus(info);
    } catch (error) {
      console.error("Error refreshing customer info:", error);
    }
  }, [syncPremiumStatus]);

  useEffect(() => {
    let mounted = true;

    // Do not touch RevenueCat until the auth state is known. Reading before
    // this point operates on the anonymous identity.
    if (isLoading) return;

    const init = async () => {
      try {
        await configurePurchases();

        if (appUserId && session) {
          // Identify FIRST, then read. Previously the anonymous read ran first
          // and its result was applied to the store.
          try {
            const info = await loginUser(appUserId);
            if (mounted) await syncPremiumStatus(info, { identified: true });
          } catch (error) {
            console.error("Error logging into RevenueCat:", error);
            // Keep whatever is persisted rather than dropping to non-Pro
            // because the network or the SDK was unavailable.
            if (mounted) setIsPremium(useProStore.getState().isPro);
          }
        }

        const nextPackages = await getOfferings();
        if (mounted && nextPackages) {
          setPackages(nextPackages);
        }
      } catch (error) {
        console.error("Error initializing purchases:", error);
      } finally {
        if (mounted) setIsLoadingPurchases(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [appUserId, session, isLoading, syncPremiumStatus]);

  useEffect(() => {
    // Only act on a REAL logout. Previously this fired while the session was
    // still being resolved, logging RevenueCat out to anonymous on every start.
    if (isLoading) return;
    if (session || appUserId) return;

    logoutUser().catch(() => {});
    setIsPremium(false);
    const proStore = useProStore.getState();
    if (proStore.isPro) {
      proStore.cancelPermanentPro().catch(() => {});
    }
  }, [session, appUserId, isLoading]);

  const handlePurchase = useCallback(
    async (pkg: PurchasesPackage): Promise<PurchaseResult> => {
      const result = await purchasePackageFn(pkg);
      if (result.success && result.customerInfo) {
        await syncPremiumStatus(result.customerInfo);
      }
      return result;
    },
    [syncPremiumStatus],
  );

  const handleRestore = useCallback(async (): Promise<boolean> => {
    try {
      const info = await restorePurchasesFn();
      await syncPremiumStatus(info);
      return isPremiumActive(info);
    } catch (error) {
      console.error("Error restoring purchases:", error);
      return false;
    }
  }, [syncPremiumStatus]);

  return (
    <PurchasesContext.Provider
      value={{
        isPremium,
        isLoadingPurchases,
        packages,
        purchasePackage: handlePurchase,
        restorePurchases: handleRestore,
        refreshCustomerInfo,
      }}
    >
      {children}
    </PurchasesContext.Provider>
  );
}

export function usePurchases(): PurchasesContextType {
  return useContext(PurchasesContext);
}
