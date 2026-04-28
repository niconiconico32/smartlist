import { posthog } from '@/src/config/posthog';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import {
  configurePurchases,
  ENTITLEMENT_ID,
  getCustomerInfo,
  getOffering,
  isPremiumActive,
} from '@/src/utils/purchases';
import { useProStore } from '@/src/store/proStore';

const isExpoGo = Constants.appOwnership === 'expo';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  source?: string;
}

export function PaywallModal({ visible, onClose, source }: PaywallModalProps) {
  const presentingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!visible || presentingRef.current) return;
    presentingRef.current = true;
    
    console.log('[PaywallModal] visible is true, presenting paywall flow started...');

    (async () => {
      try {
        if (isExpoGo) {
          console.warn('[PaywallModal] ⚠️ No se puede mostrar el Paywall en Expo Go. Se requiere un Development Build. Retornando silenciosamente.');
          return;
        }

        console.log('[PaywallModal] Configuring purchases...');
        await configurePurchases();
        
        console.log('[PaywallModal] Fetching offerings...');
        const offering = await getOffering();
        console.log('[PaywallModal] Offering fetched:', offering ? offering.identifier : 'null');
        console.log('[PaywallModal] Does this offering have a custom paywall?', !!offering?.paywall);
        if (offering?.paywall) {
          console.log('[PaywallModal] Paywall revision:', offering.paywall.revision);
        } else {
          console.log('[PaywallModal] ⚠️ NO PAYWALL CONFIGURATION FOUND IN OFFERING. RevenueCat will show the default generic paywall.');
        }

        posthog.capture('paywall_viewed', { source: source ?? null });

        console.log('[PaywallModal] Calling RevenueCatUI.presentPaywallIfNeeded...');
        const result = await RevenueCatUI.presentPaywallIfNeeded({
          offering: offering ?? undefined,
          requiredEntitlementIdentifier: ENTITLEMENT_ID,
        });
        
        console.log('[PaywallModal] Paywall result received:', result);

        if (result === PAYWALL_RESULT.NOT_PRESENTED) {
          console.log('[PaywallModal] Paywall NOT_PRESENTED (user might already be Pro).');
          posthog.capture('paywall_not_presented', { source: source ?? null });
          return;
        }

        if (
          result === PAYWALL_RESULT.PURCHASED ||
          result === PAYWALL_RESULT.RESTORED
        ) {
          const info = await getCustomerInfo();
          if (isPremiumActive(info)) {
            await useProStore.getState().activatePermanentPro();
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            posthog.capture(
              result === PAYWALL_RESULT.PURCHASED
                ? 'purchase_completed'
                : 'purchase_restored',
              { source: source ?? null },
            );
          }
          return;
        }

        if (result === PAYWALL_RESULT.CANCELLED) {
          posthog.capture('paywall_dismissed', { source: source ?? null });
          return;
        }

        posthog.capture('paywall_error', { source: source ?? null });
      } catch (error) {
        console.error('Paywall error:', error);
      } finally {
        presentingRef.current = false;
        onCloseRef.current();
      }
    })();
  }, [visible, source]);

  return null;
}
