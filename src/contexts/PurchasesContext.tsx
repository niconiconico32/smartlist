import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useAuth } from '@/src/contexts/AuthContext';
import { useProStore } from '@/src/store/proStore';
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
} from '@/src/utils/purchases';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PurchasesContextType {
  /** Whether the user has an active premium entitlement */
  isPremium: boolean;
  /** Whether RevenueCat data is still loading */
  isLoadingPurchases: boolean;
  /** Available packages from the current offering */
  packages: PurchasesPackage[];
  /** Purchase a specific package (subscription / trial) */
  purchasePackage: (pkg: PurchasesPackage) => Promise<PurchaseResult>;
  /** Restore previous purchases */
  restorePurchases: () => Promise<boolean>;
  /** Force-refresh customer info */
  refreshCustomerInfo: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const PurchasesContext = createContext<PurchasesContextType>({
  isPremium: false,
  isLoadingPurchases: true,
  packages: [],
  purchasePackage: async () => ({ success: false }),
  restorePurchases: async () => false,
  refreshCustomerInfo: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();

  const [isPremium, setIsPremium] = useState(false);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);

  // ── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Update both local React state AND the proStore (AsyncStorage)
   * so that isPro stays in sync across the two sources of truth.
   */
  const syncPremiumStatus = useCallback(async (info: CustomerInfo) => {
    const hasPro = isPremiumActive(info);
    setIsPremium(hasPro);

    // Sync proStore with RevenueCat server truth
    const proStore = useProStore.getState();
    if (hasPro && !proStore.isPro) {
      await proStore.activatePermanentPro();
    } else if (!hasPro && proStore.isPro && !proStore.trialExpiresAt) {
      // No entitlement and no active trial → cancel pro in local store
      await proStore.cancelPermanentPro();
    }
  }, []);

  const refreshCustomerInfo = useCallback(async () => {
    try {
      const info = await getCustomerInfo();
      await syncPremiumStatus(info);
    } catch (error) {
      console.error('❌ Error refreshing customer info:', error);
    }
  }, [syncPremiumStatus]);

  // ── Initialize RevenueCat & sync with Supabase user ─────────────────────

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // 1. Configure SDK (idempotent)
        await configurePurchases();

        // 2. If user is logged in, link to RevenueCat and sync Pro status
        if (user && session) {
          const info = await loginUser(user.id);
          if (mounted) await syncPremiumStatus(info);
        } else {
          // Even anonymous users: check if there's a cached entitlement
          try {
            const info = await getCustomerInfo();
            if (mounted) await syncPremiumStatus(info);
          } catch { /* no-op for anonymous */ }
        }

        // 3. Load available packages
        const pkgs = await getOfferings();
        if (mounted && pkgs) setPackages(pkgs);
      } catch (error) {
        console.error('❌ Error initializing purchases:', error);
      } finally {
        if (mounted) setIsLoadingPurchases(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [user, session, syncPremiumStatus]);

  // ── Handle sign-out: reset RevenueCat identity ──────────────────────────

  useEffect(() => {
    if (!session && !user) {
      logoutUser().catch(() => {});
      setIsPremium(false);
    }
  }, [session, user]);

  // ── Purchase a package ──────────────────────────────────────────────────

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

  // ── Restore purchases ──────────────────────────────────────────────────

  const handleRestore = useCallback(async (): Promise<boolean> => {
    try {
      const info = await restorePurchasesFn();
      await syncPremiumStatus(info);
      return isPremiumActive(info);
    } catch (error) {
      console.error('❌ Error restoring purchases:', error);
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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const usePurchases = (): PurchasesContextType => {
  const context = useContext(PurchasesContext);
  if (context === undefined) {
    throw new Error('usePurchases must be used within a PurchasesProvider');
  }
  return context;
};
