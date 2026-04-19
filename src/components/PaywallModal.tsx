import { posthog } from "@/src/config/posthog";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import Purchases from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { useProStore } from "../store/proStore";
import { configurePurchases } from "../utils/purchases";

const _isExpoGo = Constants.appOwnership === "expo";

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  source?: string;
}

/**
 * Presents RevenueCat's hosted paywall (designed in the dashboard).
 * Keeps the same visible/onClose interface for backward compatibility.
 */
export const PaywallModal: React.FC<PaywallModalProps> = ({
  visible,
  onClose,
  source,
}) => {
  const presentingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!visible || presentingRef.current) return;
    presentingRef.current = true;

    (async () => {
      try {
        if (_isExpoGo) {
          console.warn(
            "[PaywallModal] Skipping paywall in Expo Go (native RC not available)",
          );
          return;
        }
        await configurePurchases();

        // Bust the offerings cache so the latest paywall revision from the
        // dashboard is always used, not a stale cached version.
        await Purchases.syncAttributesAndOfferingsIfNeeded();

        // Fire before showing so we know the paywall was actually presented
        posthog.capture("paywall_viewed", { source: source ?? null });

        // presentPaywallIfNeeded uses the dashboard's current offering directly
        // and skips presentation if the user already has the entitlement active.
        const result = await RevenueCatUI.presentPaywallIfNeeded({
          requiredEntitlementIdentifier: "pro",
        });

        if (result === PAYWALL_RESULT.NOT_PRESENTED) {
          posthog.capture("paywall_not_presented", { source: source ?? null });
          return;
        }

        if (
          result === PAYWALL_RESULT.PURCHASED ||
          result === PAYWALL_RESULT.RESTORED
        ) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await useProStore.getState().activatePermanentPro();
          posthog.capture(
            result === PAYWALL_RESULT.PURCHASED
              ? "purchase_completed"
              : "purchase_restored",
            { source: source ?? null },
          );
        } else if (result === PAYWALL_RESULT.CANCELLED) {
          posthog.capture("paywall_dismissed", { source: source ?? null });
        } else if (result === PAYWALL_RESULT.ERROR) {
          posthog.capture("paywall_error", { source: source ?? null });
        }
      } catch (e) {
        console.error("❌ Hosted paywall error:", e);
      } finally {
        presentingRef.current = false;
        onCloseRef.current();
      }
    })();
  }, [visible]);

  return null;
};
