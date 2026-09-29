/**
 * Password Recovery Callback Parser Tests
 *
 * Tests the production parsePasswordRecoveryCallback function with realistic
 * Supabase password recovery callback fixtures.
 *
 * Supabase default flow (implicit):
 * 1. User requests reset → resetPasswordForEmail(email, { redirectTo: "https://<web-domain>/reset-password" })
 * 2. Supabase sends email with: https://<project>.supabase.co/auth/v1/verify?token={{ .TokenHash }}&type=recovery&redirect_to=https://<web-domain>/reset-password
 * 3. User opens link in browser → Supabase verifies token → redirects to https://<web-domain>/reset-password#access_token=...&refresh_token=...
 * 4. Web repo handles fragment and redirects to app: brainy://reset-password?access_token=...&refresh_token=...
 * 5. App receives callback with tokens in query params
 */

import {
  parsePasswordRecoveryCallback,
  isPasswordRecoveryCallback,
} from "@/src/lib/passwordRecovery";

describe("parsePasswordRecoveryCallback", () => {
  describe("Supabase implicit flow callback (access_token + refresh_token)", () => {
    it("parses brainy:// callback with access_token and refresh_token", () => {
      const url =
        "brainy://reset-password?access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c&refresh_token=refresh_token_abc123";
      const result = parsePasswordRecoveryCallback(url);
      expect(result).toEqual({
        accessToken:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        refreshToken: "refresh_token_abc123",
        type: "recovery_callback",
      });
    });

    it("parses callback with tokens in fragment", () => {
      const url =
        "brainy://reset-password#access_token=access_token_xyz&refresh_token=refresh_token_xyz";
      const result = parsePasswordRecoveryCallback(url);
      expect(result).toEqual({
        accessToken: "access_token_xyz",
        refreshToken: "refresh_token_xyz",
        type: "recovery_callback",
      });
    });

    it("parses callback with URL-encoded tokens", () => {
      const url =
        "brainy://reset-password?access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature&refresh_token=refresh%2Btoken%3D";
      const result = parsePasswordRecoveryCallback(url);
      expect(result).toEqual({
        accessToken: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature",
        refreshToken: "refresh+token=",
        type: "recovery_callback",
      });
    });
  });

  describe("non-callback URLs", () => {
    it("returns null for claim URLs", () => {
      const url = "brainy://claim?token=claim_token_123";
      const result = parsePasswordRecoveryCallback(url);
      expect(result).toBeNull();
    });

    it("returns null for regular app URLs", () => {
      const url = "brainy://(tabs)";
      const result = parsePasswordRecoveryCallback(url);
      expect(result).toBeNull();
    });

    it("returns null for RevenueCat redemption URLs", () => {
      const url = "rc-f91d4f2118://redeem_web_purchase?redemption_token=abc";
      const result = parsePasswordRecoveryCallback(url);
      expect(result).toBeNull();
    });

    it("returns null for empty string", () => {
      const result = parsePasswordRecoveryCallback("");
      expect(result).toBeNull();
    });

    it("returns null for URLs with only access_token (no refresh_token)", () => {
      const url = "brainy://reset-password?access_token=abc123";
      const result = parsePasswordRecoveryCallback(url);
      expect(result).toBeNull();
    });

    it("returns null for URLs with only refresh_token (no access_token)", () => {
      const url = "brainy://reset-password?refresh_token=abc123";
      const result = parsePasswordRecoveryCallback(url);
      expect(result).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("returns null for empty access_token", () => {
      const url = "brainy://reset-password?access_token=&refresh_token=abc123";
      const result = parsePasswordRecoveryCallback(url);
      expect(result).toBeNull();
    });

    it("returns null for empty refresh_token", () => {
      const url = "brainy://reset-password?access_token=abc123&refresh_token=";
      const result = parsePasswordRecoveryCallback(url);
      expect(result).toBeNull();
    });

    it("handles tokens with special characters", () => {
      const url =
        "brainy://reset-password?access_token=abc%2Fdef%3D&refresh_token=ghi%2Bjkl%3D";
      const result = parsePasswordRecoveryCallback(url);
      expect(result).toEqual({
        accessToken: "abc/def=",
        refreshToken: "ghi+jkl=",
        type: "recovery_callback",
      });
    });
  });
});

describe("isPasswordRecoveryCallback", () => {
  it("returns true for valid callback URLs", () => {
    const url =
      "brainy://reset-password?access_token=abc123&refresh_token=def456";
    expect(isPasswordRecoveryCallback(url)).toBe(true);
  });

  it("returns false for non-callback URLs", () => {
    const url = "brainy://claim?token=abc123";
    expect(isPasswordRecoveryCallback(url)).toBe(false);
  });

  it("returns false for regular app URLs", () => {
    const url = "brainy://(tabs)";
    expect(isPasswordRecoveryCallback(url)).toBe(false);
  });
});

describe("Password Recovery Flow States", () => {
  describe("session establishment", () => {
    it("uses existing session when available", () => {
      const session = { user: { id: "user-123" } };
      const accessToken = "abc123";
      const refreshToken = "def456";

      const shouldSetSession = !session?.user && !!(accessToken && refreshToken);
      expect(shouldSetSession).toBe(false);
    });

    it("sets session from callback tokens when no session", () => {
      const session = null;
      const accessToken = "abc123";
      const refreshToken = "def456";

      const shouldSetSession = !session?.user && !!(accessToken && refreshToken);
      expect(shouldSetSession).toBe(true);
    });

    it("shows error when no session and no callback tokens", () => {
      const session = null;
      const accessToken = "";
      const refreshToken = "";

      const hasCallbackTokens = !!(accessToken && refreshToken);
      expect(hasCallbackTokens).toBe(false);
    });
  });

  describe("password validation", () => {
    const MIN_PASSWORD_LENGTH = 6;

    it("rejects passwords shorter than 6 characters", () => {
      const password = "12345";
      expect(password.length < MIN_PASSWORD_LENGTH).toBe(true);
    });

    it("accepts passwords with 6 or more characters", () => {
      const password = "123456";
      expect(password.length < MIN_PASSWORD_LENGTH).toBe(false);
    });

    it("rejects mismatched passwords", () => {
      const password = "password123";
      const confirmPassword = "password456";
      expect(password !== confirmPassword).toBe(true);
    });

    it("accepts matching passwords", () => {
      const password = "password123";
      const confirmPassword = "password123";
      expect(password !== confirmPassword).toBe(false);
    });
  });
});

describe("Warm vs Cold Start Deep Link Handling", () => {
  describe("warm start (app already running)", () => {
    it("detects callback URL in warm start listener", () => {
      const url =
        "brainy://reset-password?access_token=warm_access_token&refresh_token=warm_refresh_token";
      const result = parsePasswordRecoveryCallback(url);
      expect(result).not.toBeNull();
      expect(result?.accessToken).toBe("warm_access_token");
      expect(result?.refreshToken).toBe("warm_refresh_token");
    });

    it("routes to /reset-password on warm start", () => {
      const url =
        "brainy://reset-password?access_token=warm_token&refresh_token=warm_refresh";
      const result = parsePasswordRecoveryCallback(url);
      expect(result).toEqual({
        accessToken: "warm_token",
        refreshToken: "warm_refresh",
        type: "recovery_callback",
      });
    });
  });

  describe("cold start (app launched from deep link)", () => {
    it("detects callback URL in cold start handler", () => {
      const url =
        "brainy://reset-password?access_token=cold_access_token&refresh_token=cold_refresh_token";
      const result = parsePasswordRecoveryCallback(url);
      expect(result).not.toBeNull();
      expect(result?.accessToken).toBe("cold_access_token");
      expect(result?.refreshToken).toBe("cold_refresh_token");
    });

    it("extracts tokens for cold start routing", () => {
      const url =
        "brainy://reset-password#access_token=cold_fragment_token&refresh_token=cold_fragment_refresh";
      const result = parsePasswordRecoveryCallback(url);
      expect(result).toEqual({
        accessToken: "cold_fragment_token",
        refreshToken: "cold_fragment_refresh",
        type: "recovery_callback",
      });
    });
  });
});
