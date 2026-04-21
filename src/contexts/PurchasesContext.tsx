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
  const { user, session } = useAuth();

  const [isPremium, setIsPremium] = useState(false);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);

  const syncPremiumStatus = useCallback(async (info: CustomerInfo) => {
    const hasPro = isPremiumActive(info);
    setIsPremium(hasPro);

    const proStore = useProStore.getState();
    if (hasPro && !proStore.isPro) {
      await proStore.activatePermanentPro();
    } else if (!hasPro && proStore.isPro && !proStore.trialExpiresAt) {
      await proStore.cancelPermanentPro();
    }
  }, []);

  const refreshCustomerInfo = useCallback(async () => {
    try {
      const info = await getCustomerInfo();
      await syncPremiumStatus(info);
    } catch (error) {
      console.error('Error refreshing customer info:', error);
    }
  }, [syncPremiumStatus]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await configurePurchases();

        if (user && session) {
          const info = await loginUser(user.id);
          if (mounted) await syncPremiumStatus(info);
        } else {
          const info = await getCustomerInfo();
          if (mounted) await syncPremiumStatus(info);
        }

        const nextPackages = await getOfferings();
        if (mounted && nextPackages) {
          setPackages(nextPackages);
        }
      } catch (error) {
        console.error('Error initializing purchases:', error);
      } finally {
        if (mounted) setIsLoadingPurchases(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [user, session, syncPremiumStatus]);

  useEffect(() => {
    if (!session && !user) {
      logoutUser().catch(() => {});
      setIsPremium(false);
    }
  }, [session, user]);

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
      console.error('Error restoring purchases:', error);
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
