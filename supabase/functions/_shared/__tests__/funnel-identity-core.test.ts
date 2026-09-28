import { deriveSixDigitPassword, isUuid, normalizeEmail, sha256Hex } from "../funnel-identity-core";

describe("funnel identified happy path primitives", () => {
  it("normalizes identity email and validates UUIDs", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
  });

  it("hashes claim tokens without exposing the token", async () => {
    await expect(sha256Hex("claim-token")).resolves.toBe(
      "abfc1de71d4684842800719f5d6407b1e0ef7965ad4473a1cd8632462eec1b8c",
    );
  });

  it("derives the same six-digit password on retries, including leading zeroes", async () => {
    const first = await deriveSixDigitPassword("550e8400-e29b-41d4-a716-446655440000", "test-secret");
    const second = await deriveSixDigitPassword("550e8400-e29b-41d4-a716-446655440000", "test-secret");
    expect(first).toBe(second);
    expect(first).toMatch(/^\d{6}$/);
  });

  it("requires the password derivation secret", async () => {
    await expect(deriveSixDigitPassword("plan", "")).rejects.toThrow();
  });
});
