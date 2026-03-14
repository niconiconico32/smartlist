import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useAuth } from '@/src/contexts/AuthContext';
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

  const updatePremiumStatus = useCallback((info: CustomerInfo) => {
    setIsPremium(isPremiumActive(info));
  }, []);

  const refreshCustomerInfo = useCallback(async () => {
    try {
      const info = await getCustomerInfo();
      updatePremiumStatus(info);
    } catch (error) {
      console.error('❌ Error refreshing customer info:', error);
    }
  }, [updatePremiumStatus]);

  // ── Initialize RevenueCat & sync with Supabase user ─────────────────────

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // 1. Configure SDK (idempotent)
        await configurePurchases();

        // 2. If user is logged in, link to RevenueCat
        if (user && session) {
          const info = await loginUser(user.id);
          if (mounted) updatePremiumStatus(info);
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
  }, [user, session, updatePremiumStatus]);

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
        updatePremiumStatus(result.customerInfo);
      }
      return result;
    },
    [updatePremiumStatus],
  );

  // ── Restore purchases ──────────────────────────────────────────────────

  const handleRestore = useCallback(async (): Promise<boolean> => {
    try {
      const info = await restorePurchasesFn();
      updatePremiumStatus(info);
      return isPremiumActive(info);
    } catch (error) {
      console.error('❌ Error restoring purchases:', error);
      return false;
    }
  }, [updatePremiumStatus]);

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
