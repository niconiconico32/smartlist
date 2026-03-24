import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import { getOfferings, purchasePackage, configurePurchases } from '../utils/purchases';
import { useProStore } from '../store/proStore';

export function useRevenueCat() {
  const [currentPackage, setCurrentPackage] = useState<PurchasesPackage | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { activatePermanentPro } = useProStore();

  const fetchPackages = useCallback(async () => {
    setIsFetching(true);
    try {
      await configurePurchases(); // Prevent 'singleton not initialized' crash
      const packages = await getOfferings();
      if (packages) {
        // En RevenueCat, configuraste 'default' offering y '$rc_monthly' package
        const monthly = packages.find(pkg => pkg.identifier === '$rc_monthly');
        if (monthly) {
          setCurrentPackage(monthly);
        }
      }
    } catch (e) {
      console.error('[useRevenueCat] Error fetching packages:', e);
    } finally {
      setIsFetching(false);
    }
  }, []);

  const purchasePro = async () => {
    if (!currentPackage) return false;
    
    setIsPurchasing(true);
    try {
      await configurePurchases(); // Safety check
      const result = await purchasePackage(currentPackage);
      
      if (result.success) {
        // El purchase fue exitoso y el entitlement 'pro' está activo.
        // Esparcimos el Pro permanentemente por todo el ecosistema de Zustand.
        await activatePermanentPro();
        return true;
      }

      // Si falló pero NO fue porque el usuario canceló el popup.
      if (!result.cancelled && result.errorMessage) {
        Alert.alert('Error de compra', result.errorMessage);
      }
      
      return false;
    } catch (e: any) {
      Alert.alert('Atención', e?.message || 'Hubo un error al procesar tu compra.');
      return false;
    } finally {
      setIsPurchasing(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  return {
    currentPackage,
    isPurchasing,
    isFetching,
    purchasePro,
    fetchPackages,
  };
}
