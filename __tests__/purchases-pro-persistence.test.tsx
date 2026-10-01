import React from "react";
import { Text } from "react-native";
import { render, waitFor } from "@testing-library/react-native";

/**
 * Regression coverage for "Pro disappears after reopening the app".
 *
 * Cold start order was:
 *   1. PurchasesProvider mounts while AuthContext has not resolved yet
 *      -> user/session are null
 *   2. the logout effect fired and called Purchases.logOut()  (anonymous identity)
 *   3. the init effect read getCustomerInfo() on that ANONYMOUS identity
 *   4. that read had no "brainy Pro" entitlement, so syncPremiumStatus ran
 *      cancelPermanentPro() and OVERWROTE the persisted isPro:true
 *
 * The entitlement was therefore destroyed on every cold start and only came
 * back by luck, if Purchases.logIn happened to succeed in the same session.
 *
 * PurchasesContext talks to @/src/utils/purchases (the wrapper), so that is the
 * only SDK boundary we need to mock.
 */

const mockAuthState: { user: any; session: any; isLoading: boolean } = {
  user: null,
  session: null,
  isLoading: true,
};

jest.mock("@/src/contexts/AuthContext", () => ({
  useAuth: () => mockAuthState,
}));

jest.mock("@/src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  },
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { appOwnership: null }, // native build, not Expo Go
}));

const mockStore: { isPro: boolean } = { isPro: false };
const mockCancel = jest.fn(async () => {
  mockStore.isPro = false;
});
const mockActivate = jest.fn(async () => {
  mockStore.isPro = true;
});

jest.mock("@/src/store/proStore", () => ({
  useProStore: {
    getState: () => ({
      isPro: mockStore.isPro,
      activatePermanentPro: mockActivate,
      cancelPermanentPro: mockCancel,
    }),
  },
}));

jest.mock("@/src/utils/purchases", () => ({
  ENTITLEMENT_ID: "brainy Pro",
  configurePurchases: jest.fn(async () => {}),
  getCustomerInfo: jest.fn(async () => ({ entitlements: { active: {} } })),
  getOfferings: jest.fn(async () => []),
  isPremiumActive: (info: any) => "brainy Pro" in (info?.entitlements?.active ?? {}),
  loginUser: jest.fn(async () => ({ entitlements: { active: {} } })),
  logoutUser: jest.fn(async () => {}),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
}));

import { PurchasesProvider, usePurchases } from "@/src/contexts/PurchasesContext";
import * as purchases from "@/src/utils/purchases";

function Probe() {
  const { isPremium } = usePurchases();
  return <Text>{isPremium ? "PRO" : "FREE"}</Text>;
}

const wrap = (children: React.ReactNode) => (
  <PurchasesProvider>{children}</PurchasesProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthState.user = null;
  mockAuthState.session = null;
  mockAuthState.isLoading = true;
  mockStore.isPro = false;
});

it("never revokes a persisted Pro just because auth is still loading", async () => {
  mockStore.isPro = true; // entitlement owned from the previous session

  const { getByText } = render(wrap(<Probe />));

  await waitFor(() => {
    expect(mockCancel).not.toHaveBeenCalled();
  });
  // RevenueCat must not be logged out to anonymous during startup.
  expect(purchases.logoutUser).not.toHaveBeenCalled();
  // The persisted Pro must still be driving the UI.
  expect(getByText("PRO")).toBeTruthy();
});

it("logs in and keeps Pro when the session resolves with an active entitlement", async () => {
  mockStore.isPro = true;
  (purchases.loginUser as jest.Mock).mockResolvedValue({
    originalAppUserId: "user-123",
    entitlements: { active: { "brainy Pro": {} } },
  });

  const { rerender, getByText } = render(wrap(<Probe />));

  mockAuthState.user = { id: "user-123" };
  mockAuthState.session = { user: { id: "user-123" } };
  mockAuthState.isLoading = false;
  rerender(wrap(<Probe />));

  await waitFor(() => {
    expect(purchases.loginUser).toHaveBeenCalledWith("user-123");
  });
  await waitFor(() => {
    expect(getByText("PRO")).toBeTruthy();
  });
  expect(mockCancel).not.toHaveBeenCalled();
});

it("does revoke Pro when the identified user genuinely has no entitlement", async () => {
  mockStore.isPro = true;
  (purchases.loginUser as jest.Mock).mockResolvedValue({
    originalAppUserId: "user-123",
    entitlements: { active: {} },
  });

  const { rerender } = render(wrap(<Probe />));

  mockAuthState.user = { id: "user-123" };
  mockAuthState.session = { user: { id: "user-123" } };
  mockAuthState.isLoading = false;
  rerender(wrap(<Probe />));

  // The read IS for this user, so revoking is correct here.
  await waitFor(() => {
    expect(mockCancel).toHaveBeenCalled();
  });
});

it("survives a failed logIn and keeps the persisted Pro", async () => {
  mockStore.isPro = true;
  (purchases.loginUser as jest.Mock).mockRejectedValue(new Error("network down"));

  const { rerender, getByText } = render(wrap(<Probe />));

  mockAuthState.user = { id: "user-123" };
  mockAuthState.session = { user: { id: "user-123" } };
  mockAuthState.isLoading = false;
  rerender(wrap(<Probe />));

  await waitFor(() => {
    expect(purchases.loginUser).toHaveBeenCalled();
  });
  // A RevenueCat outage must not downgrade a paying user to FREE.
  await waitFor(() => {
    expect(getByText("PRO")).toBeTruthy();
  });
  expect(mockCancel).not.toHaveBeenCalled();
});

it("clears Pro on a real logout, once auth has resolved", async () => {
  mockStore.isPro = true;
  mockAuthState.user = null;
  mockAuthState.session = null;
  mockAuthState.isLoading = false;

  render(wrap(<Probe />));

  await waitFor(() => {
    expect(purchases.logoutUser).toHaveBeenCalled();
  });
  await waitFor(() => {
    expect(mockCancel).toHaveBeenCalled();
  });
});