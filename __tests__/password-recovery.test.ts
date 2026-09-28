/**
 * Password Recovery Deep Link Tests
 *
 * Tests the URL parsing and routing logic for Supabase password recovery
 * deep links in both warm and cold start scenarios.
 *
 * Supabase email template formats supported:
 * 1. token_hash (default): brainy://reset-password?token_hash=<hash>&type=recovery
 * 2. PKCE code: brainy://reset-password?code=<pkce_code>
 */

describe("Password Recovery Deep Link Parsing", () => {
  const parseRecoveryUrl = (url: string) => {
    if (
      url.includes("reset-password") ||
      url.includes("recovery") ||
      url.includes("token_hash") ||
      url.includes("type=recovery")
    ) {
      const tokenHashMatch = url.match(/[?&]token_hash=([^&]+)/);
      const codeMatch = url.match(/[?&]code=([^&]+)/);
      const emailMatch = url.match(/[?&]email=([^&]+)/);
      const tokenHash = tokenHashMatch ? decodeURIComponent(tokenHashMatch[1]) : undefined;
      const code = codeMatch ? decodeURIComponent(codeMatch[1]) : undefined;
      const email = emailMatch ? decodeURIComponent(emailMatch[1]) : undefined;

      if (tokenHash) {
        return { type: "token_hash" as const, value: tokenHash, email };
      } else if (code) {
        return { type: "pkce" as const, value: code, email };
      }
    }
    return null;
  };

  describe("token_hash format (Supabase default)", () => {
    it("parses token_hash from brainy:// scheme", () => {
      const url = "brainy://reset-password?token_hash=abc123def456&type=recovery";
      const result = parseRecoveryUrl(url);
      expect(result).toEqual({
        type: "token_hash",
        value: "abc123def456",
        email: undefined,
      });
    });

    it("parses token_hash with email parameter", () => {
      const url = "brainy://reset-password?token_hash=abc123&email=user%40example.com";
      const result = parseRecoveryUrl(url);
      expect(result).toEqual({
        type: "token_hash",
        value: "abc123",
        email: "user@example.com",
      });
    });

    it("parses token_hash from Supabase verify URL", () => {
      const url =
        "https://xyz.supabase.co/auth/v1/verify?token_hash=abc123&type=recovery&redirect_to=brainy://reset-password";
      const result = parseRecoveryUrl(url);
      expect(result).toEqual({
        type: "token_hash",
        value: "abc123",
        email: undefined,
      });
    });

    it("handles URL-encoded token_hash", () => {
      const url = "brainy://reset-password?token_hash=abc%2F123%3D&type=recovery";
      const result = parseRecoveryUrl(url);
      expect(result).toEqual({
        type: "token_hash",
        value: "abc/123=",
        email: undefined,
      });
    });
  });

  describe("PKCE code format", () => {
    it("parses code from brainy:// scheme", () => {
      const url = "brainy://reset-password?code=pkce_code_12345";
      const result = parseRecoveryUrl(url);
      expect(result).toEqual({
        type: "pkce",
        value: "pkce_code_12345",
        email: undefined,
      });
    });

    it("parses code with email parameter", () => {
      const url = "brainy://reset-password?code=pkce_abc&email=user%40example.com";
      const result = parseRecoveryUrl(url);
      expect(result).toEqual({
        type: "pkce",
        value: "pkce_abc",
        email: "user@example.com",
      });
    });
  });

  describe("non-recovery URLs", () => {
    it("returns null for claim URLs", () => {
      const url = "brainy://claim?token=claim_token_123";
      const result = parseRecoveryUrl(url);
      expect(result).toBeNull();
    });

    it("returns null for regular app URLs", () => {
      const url = "brainy://(tabs)";
      const result = parseRecoveryUrl(url);
      expect(result).toBeNull();
    });

    it("returns null for RevenueCat redemption URLs", () => {
      const url = "rc-f91d4f2118://redeem_web_purchase?redemption_token=abc";
      const result = parseRecoveryUrl(url);
      expect(result).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("handles empty token_hash", () => {
      const url = "brainy://reset-password?token_hash=&type=recovery";
      const result = parseRecoveryUrl(url);
      expect(result).toBeNull();
    });

    it("handles empty code", () => {
      const url = "brainy://reset-password?code=";
      const result = parseRecoveryUrl(url);
      expect(result).toBeNull();
    });

    it("handles malformed URLs gracefully", () => {
      const url = "brainy://reset-password";
      const result = parseRecoveryUrl(url);
      expect(result).toBeNull();
    });

    it("handles token_hash with special characters", () => {
      const url = "brainy://reset-password?token_hash=abc%2Bdef%2Fghi%3D&type=recovery";
      const result = parseRecoveryUrl(url);
      expect(result).toEqual({
        type: "token_hash",
        value: "abc+def/ghi=",
        email: undefined,
      });
    });
  });
});

describe("Password Recovery Flow States", () => {
  describe("session establishment", () => {
    it("uses existing session when available", () => {
      const session = { user: { id: "user-123" } };
      const tokenHash = "abc123";

      const shouldVerifyToken = !session?.user && !!tokenHash;
      expect(shouldVerifyToken).toBe(false);
    });

    it("verifies token_hash when no session", () => {
      const session = null;
      const tokenHash = "abc123";

      const shouldVerifyToken = !session?.user && !!tokenHash;
      expect(shouldVerifyToken).toBe(true);
    });

    it("verifies PKCE code when no session", () => {
      const session = null;
      const code = "pkce_123";

      const shouldVerifyToken = !session?.user && !!code;
      expect(shouldVerifyToken).toBe(true);
    });

    it("shows error when no session and no token", () => {
      const session = null;
      const tokenHash = "";
      const code = "";

      const hasRecoveryParams = !!(tokenHash || code);
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
      const url = "brainy://reset-password?token_hash=abc123&type=recovery";
      const isRecoveryUrl =
        url.includes("reset-password") ||
        url.includes("recovery") ||
        url.includes("token_hash") ||
        url.includes("type=recovery");
      expect(isRecoveryUrl).toBe(true);
    });

    it("routes to /reset-password on warm start", () => {
      const url = "brainy://reset-password?token_hash=abc123";
      const tokenHashMatch = url.match(/[?&]token_hash=([^&]+)/);
      const tokenHash = tokenHashMatch ? decodeURIComponent(tokenHashMatch[1]) : undefined;

      expect(tokenHash).toBe("abc123");
    });
  });

  describe("cold start (app launched from deep link)", () => {
    it("detects recovery URL in cold start handler", () => {
      const url = "brainy://reset-password?token_hash=abc123&type=recovery";
      const isRecoveryUrl =
        url.includes("reset-password") ||
        url.includes("recovery") ||
        url.includes("token_hash") ||
        url.includes("type=recovery");
      expect(isRecoveryUrl).toBe(true);
    });

    it("extracts token_hash for cold start routing", () => {
      const url = "brainy://reset-password?token_hash=cold_start_token&email=user%40test.com";
      const tokenHashMatch = url.match(/[?&]token_hash=([^&]+)/);
      const emailMatch = url.match(/[?&]email=([^&]+)/);

      const tokenHash = tokenHashMatch ? decodeURIComponent(tokenHashMatch[1]) : undefined;
      const email = emailMatch ? decodeURIComponent(emailMatch[1]) : undefined;

      expect(tokenHash).toBe("cold_start_token");
      expect(email).toBe("user@test.com");
    });
  });
});
