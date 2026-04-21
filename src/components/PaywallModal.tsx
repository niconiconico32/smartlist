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

    (async () => {
      try {
        if (isExpoGo) return;

        await configurePurchases();
        const offering = await getOffering();

        posthog.capture('paywall_viewed', { source: source ?? null });

        const result = await RevenueCatUI.presentPaywallIfNeeded({
          offering: offering ?? undefined,
          requiredEntitlementIdentifier: ENTITLEMENT_ID,
        });

        if (result === PAYWALL_RESULT.NOT_PRESENTED) {
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
