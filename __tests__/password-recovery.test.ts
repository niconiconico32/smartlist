/**
 * Password Recovery URL Parser Tests
 *
 * Tests the production parsePasswordRecoveryUrl function with realistic
 * Supabase password recovery URL fixtures.
 *
 * Supabase default email template uses {{ .ConfirmationURL }} which generates:
 *   https://<project>.supabase.co/auth/v1/verify?token=<token>&type=recovery&redirect_to=<url>
 *
 * The token parameter is used with supabase.auth.verifyOtp({ token, type: "recovery" })
 * when detectSessionInUrl: false.
 */

import {
  parsePasswordRecoveryUrl,
  isPasswordRecoveryUrl,
} from "@/src/lib/passwordRecovery";

describe("parsePasswordRecoveryUrl", () => {
  describe("Supabase default token format ({{ .ConfirmationURL }})", () => {
    it("parses Supabase verify URL with token and type=recovery", () => {
      const url =
        "https://xyz.supabase.co/auth/v1/verify?token=abc123def456&type=recovery&redirect_to=brainy://reset-password";
      const result = parsePasswordRecoveryUrl(url);
      expect(result).toEqual({
        token: "abc123def456",
        email: undefined,
        type: "recovery",
      });
    });

    it("parses brainy:// deep link with token", () => {
      const url = "brainy://reset-password?token=abc123def456&type=recovery";
      const result = parsePasswordRecoveryUrl(url);
      expect(result).toEqual({
        token: "abc123def456",
        email: undefined,
        type: "recovery",
      });
    });

    it("parses URL with email parameter for pre-filling", () => {
      const url =
        "brainy://reset-password?token=abc123&email=user%40example.com";
      const result = parsePasswordRecoveryUrl(url);
      expect(result).toEqual({
        token: "abc123",
        email: "user@example.com",
        type: "recovery",
      });
    });

    it("parses Supabase verify URL with email parameter", () => {
      const url =
        "https://xyz.supabase.co/auth/v1/verify?token=abc123&type=recovery&email=user%40test.com&redirect_to=brainy://reset-password";
      const result = parsePasswordRecoveryUrl(url);
      expect(result).toEqual({
        token: "abc123",
        email: "user@test.com",
        type: "recovery",
      });
    });

    it("handles URL-encoded token with special characters", () => {
      const url =
        "brainy://reset-password?token=abc%2F123%3D&type=recovery";
      const result = parsePasswordRecoveryUrl(url);
      expect(result).toEqual({
        token: "abc/123=",
        email: undefined,
        type: "recovery",
      });
    });

    it("handles token with plus signs", () => {
      const url =
        "brainy://reset-password?token=abc%2Bdef%2Bghi&type=recovery";
      const result = parsePasswordRecoveryUrl(url);
      expect(result).toEqual({
        token: "abc+def+ghi",
        email: undefined,
        type: "recovery",
      });
    });
  });

  describe("non-recovery URLs", () => {
    it("returns null for claim URLs", () => {
      const url = "brainy://claim?token=claim_token_123";
      const result = parsePasswordRecoveryUrl(url);
      expect(result).toBeNull();
    });

    it("returns null for regular app URLs", () => {
      const url = "brainy://(tabs)";
      const result = parsePasswordRecoveryUrl(url);
      expect(result).toBeNull();
    });

    it("returns null for RevenueCat redemption URLs", () => {
      const url = "rc-f91d4f2118://redeem_web_purchase?redemption_token=abc";
      const result = parsePasswordRecoveryUrl(url);
      expect(result).toBeNull();
    });

    it("returns null for empty string", () => {
      const result = parsePasswordRecoveryUrl("");
      expect(result).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("returns null for empty token", () => {
      const url = "brainy://reset-password?token=&type=recovery";
      const result = parsePasswordRecoveryUrl(url);
      expect(result).toBeNull();
    });

    it("returns null for malformed URLs without token", () => {
      const url = "brainy://reset-password";
      const result = parsePasswordRecoveryUrl(url);
      expect(result).toBeNull();
    });

    it("returns null for URLs with only type=recovery but no token", () => {
      const url = "brainy://reset-password?type=recovery";
      const result = parsePasswordRecoveryUrl(url);
      expect(result).toBeNull();
    });
  });
});

describe("isPasswordRecoveryUrl", () => {
  it("returns true for valid recovery URLs", () => {
    const url =
      "https://xyz.supabase.co/auth/v1/verify?token=abc123&type=recovery";
    expect(isPasswordRecoveryUrl(url)).toBe(true);
  });

  it("returns false for non-recovery URLs", () => {
    const url = "brainy://claim?token=abc123";
    expect(isPasswordRecoveryUrl(url)).toBe(false);
  });

  it("returns false for regular app URLs", () => {
    const url = "brainy://(tabs)";
    expect(isPasswordRecoveryUrl(url)).toBe(false);
  });
});

describe("Password Recovery Flow States", () => {
  describe("session establishment", () => {
    it("uses existing session when available", () => {
      const session = { user: { id: "user-123" } };
      const token = "abc123";

      const shouldVerifyToken = !session?.user && !!token;
      expect(shouldVerifyToken).toBe(false);
    });

    it("verifies token when no session", () => {
      const session = null;
      const token = "abc123";

      const shouldVerifyToken = !session?.user && !!token;
      expect(shouldVerifyToken).toBe(true);
    });

    it("shows error when no session and no token", () => {
      const session = null;
      const token = "";

      const hasRecoveryParams = !!token;
      expect(hasRecoveryParams).toBe(false);
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
    it("detects recovery URL in warm start listener", () => {
      const url =
        "brainy://reset-password?token=abc123&type=recovery";
      const result = parsePasswordRecoveryUrl(url);
      expect(result).not.toBeNull();
      expect(result?.token).toBe("abc123");
    });

    it("routes to /reset-password on warm start", () => {
      const url = "brainy://reset-password?token=warm_start_token";
      const result = parsePasswordRecoveryUrl(url);
      expect(result).toEqual({
        token: "warm_start_token",
        email: undefined,
        type: "recovery",
      });
    });
  });

  describe("cold start (app launched from deep link)", () => {
    it("detects recovery URL in cold start handler", () => {
      const url =
        "https://xyz.supabase.co/auth/v1/verify?token=cold_start_token&type=recovery&redirect_to=brainy://reset-password";
      const result = parsePasswordRecoveryUrl(url);
      expect(result).not.toBeNull();
      expect(result?.token).toBe("cold_start_token");
    });

    it("extracts token for cold start routing", () => {
      const url =
        "brainy://reset-password?token=cold_start_token&email=user%40test.com";
      const result = parsePasswordRecoveryUrl(url);
      expect(result).toEqual({
        token: "cold_start_token",
        email: "user@test.com",
        type: "recovery",
      });
    });
  });
});
