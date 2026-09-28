import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { posthog } from "@/src/config/posthog";
import { supabase } from "@/src/lib/supabase";
import {
  ensureRevenueCatLogin,
  redeemWebPurchaseFromUrl,
} from "@/src/lib/redemptionService";

// Joined the NEW restore path only (server-side redemption column). The legacy
// claim path keeps its own brainy_pending_redemption_url key; we use separate
// keys so a legacy claim cleanup can never tear down our state mid-session.
const PENDING_URL_KEY = "brainy_redemption_pending_url";
const PENDING_PLAN_KEY = "brainy_redemption_plan_id";

export type RedemptionState =
  | "idle"
  | "pending"
  | "redeeming"
  | "success"
  | "network_error"
  | "terminal_error";

interface RedemptionStore {
  planId: string | null;
  url: string | null;
  state: RedemptionState;
  hydrated: boolean;
  /** Error kind for the Home banner copy (network → retry; terminal → support). */
  lastTerminal?: string;
  load: () => Promise<void>;
  setPending: (planId: string, url: string) => Promise<void>;
  clearPending: () => Promise<void>;
  /** Terminal failure: the URL is dead. Keeps state so the banner can show a
   *  support message, but never offers another retry / auto-charge. */
  markTerminal: (kind: string) => Promise<void>;
  retry: () => Promise<"success" | "network" | "terminal" | "noop">;
}

export const useRedemptionStore = create<RedemptionStore>((set, get) => ({
  planId: null,
  url: null,
  state: "idle",
  hydrated: false,
  lastTerminal: undefined,

  load: async () => {
    try {
      const [url, planId] = await Promise.all([
        AsyncStorage.getItem(PENDING_URL_KEY),
        AsyncStorage.getItem(PENDING_PLAN_KEY),
      ]);
      set({
        url: url?.trim() || null,
        planId: planId?.trim() || null,
        state: url?.trim() ? "pending" : "idle",
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },

  setPending: async (planId, url) => {
    await Promise.all([
      AsyncStorage.setItem(PENDING_URL_KEY, url),
      AsyncStorage.setItem(PENDING_PLAN_KEY, planId),
    ]);
    set({ planId, url, state: "pending", lastTerminal: undefined });
  },

  clearPending: async () => {
    await Promise.all([
      AsyncStorage.removeItem(PENDING_URL_KEY),
      AsyncStorage.removeItem(PENDING_PLAN_KEY),
    ]);
    set({ planId: null, url: null, state: "idle", lastTerminal: undefined });
  },

  markTerminal: async (kind: string) => {
    await Promise.all([
      AsyncStorage.removeItem(PENDING_URL_KEY),
      AsyncStorage.removeItem(PENDING_PLAN_KEY),
    ]);
    set({ planId: null, url: null, state: "terminal_error", lastTerminal: kind });
  },

  retry: async () => {
    const { planId, url } = get();
    if (!url || !planId) return "noop";

    set({ state: "redeeming", lastTerminal: undefined });
    posthog.capture("web_purchase_redemption_started", { status: "retry" });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await ensureRevenueCatLogin(session.user.id);
      }

      const outcome = await redeemWebPurchaseFromUrl(url);
      if (outcome.status === "success") {
        posthog.capture("web_purchase_redemption_success", { status: "SUCCESS" });
        // Mark consumed server-side (owner-only) to prevent URL re-use.
        const r = await supabase.rpc("consume_funnel_redemption", {
          p_plan_id: planId,
        });
        if (r.error) console.error("consume_funnel_redemption error:", r.error.message);
        await get().clearPending();
        set({ state: "success" });
        return "success";
      }

      if (
        outcome.status === "expired" ||
        outcome.status === "invalid_token" ||
        outcome.status === "belongs_to_other_user" ||
        outcome.status === "not_configured"
      ) {
        // Terminal: the URL is dead (or this build can't redeem). Clear it and
        // surface the support message — never re-charge automatically.
        posthog.capture("web_purchase_redemption_failed", {
          status: outcome.status,
        });
        await get().markTerminal(outcome.status);
        return "terminal";
      }

      // Transient (network / RC error): keep pending so the banner can retry.
      posthog.capture("web_purchase_redemption_failed", { status: "ERROR" });
      set({ state: "network_error", lastTerminal: undefined });
      return "network";
    } catch (e) {
      console.error("redemption retry error:", e);
      posthog.capture("web_purchase_redemption_failed", { status: "ERROR" });
      set({ state: "network_error" });
      return "network";
    }
  },
}));