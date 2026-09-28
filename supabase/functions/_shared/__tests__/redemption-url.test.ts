import { isCanonicalRedemptionUrl } from "../redemption-url";

const FIXTURE_TOKEN = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0";

describe("isCanonicalRedemptionUrl", () => {
  it("accepts the canonical RevenueCat redemption URL (real format)", () => {
    const url = `rc-f91d4f2118://redeem_web_purchase?redemption_token=${FIXTURE_TOKEN}`;
    expect(isCanonicalRedemptionUrl(url)).toBe(true);
  });

  it("accepts a trailing-slash variant of the canonical host", () => {
    const url = `rc-f91d4f2118://redeem_web_purchase/?redemption_token=${FIXTURE_TOKEN}`;
    expect(isCanonicalRedemptionUrl(url)).toBe(true);
  });

  it("rejects https:// links (degraded / redirect URLs are not canonical)", () => {
    expect(
      isCanonicalRedemptionUrl("https://evil.example/redeem?redemption_token=x"),
    ).toBe(false);
    expect(
      isCanonicalRedemptionUrl("https://rev.cat/redeem_web_purchase?redemption_token=x"),
    ).toBe(false);
  });

  it("rejects an arbitrary rc-<other> scheme", () => {
    expect(
      isCanonicalRedemptionUrl("rc-otro://redeem_web_purchase?redemption_token=x"),
    ).toBe(false);
    expect(
      isCanonicalRedemptionUrl("rc-f91d4f2118evil://redeem_web_purchase?redemption_token=x"),
    ).toBe(false);
  });

  it("rejects an invalid scheme", () => {
    expect(
      isCanonicalRedemptionUrl("http://redeem_web_purchase?redemption_token=x"),
    ).toBe(false);
    expect(
      isCanonicalRedemptionUrl("nota url"),
    ).toBe(false);
  });

  it("rejects a missing redemption_token", () => {
    expect(
      isCanonicalRedemptionUrl("rc-f91d4f2118://redeem_web_purchase"),
    ).toBe(false);
    expect(
      isCanonicalRedemptionUrl("rc-f91d4f2118://redeem_web_purchase?foo=bar"),
    ).toBe(false);
  });

  it("rejects an empty redemption_token", () => {
    expect(
      isCanonicalRedemptionUrl("rc-f91d4f2118://redeem_web_purchase?redemption_token="),
    ).toBe(false);
    expect(
      isCanonicalRedemptionUrl("rc-f91d4f2118://redeem_web_purchase?redemption_token=%20"),
    ).toBe(false);
  });

  it("rejects a wrong host", () => {
    expect(
      isCanonicalRedemptionUrl(
        `rc-f91d4f2118://evil.example/?redemption_token=${FIXTURE_TOKEN}`,
      ),
    ).toBe(false);
  });

  it("rejects a wrong path", () => {
    expect(
      isCanonicalRedemptionUrl(
        `rc-f91d4f2118://redeem_web_purchase/other?redemption_token=${FIXTURE_TOKEN}`,
      ),
    ).toBe(false);
  });

  it("rejects a URL with credentials / port / hash", () => {
    expect(
      isCanonicalRedemptionUrl(
        `rc-f91d4f2118://user:pw@redeem_web_purchase?redemption_token=${FIXTURE_TOKEN}`,
      ),
    ).toBe(false);
    expect(
      isCanonicalRedemptionUrl(
        `rc-f91d4f2118://redeem_web_purchase:1234?redemption_token=${FIXTURE_TOKEN}`,
      ),
    ).toBe(false);
    expect(
      isCanonicalRedemptionUrl(
        `rc-f91d4f2118://redeem_web_purchase?redemption_token=${FIXTURE_TOKEN}#frag`,
      ),
    ).toBe(false);
  });

  it("rejects a URL longer than 1 KB", () => {
    const longToken = "x".repeat(1100);
    expect(
      isCanonicalRedemptionUrl(
        `rc-f91d4f2118://redeem_web_purchase?redemption_token=${longToken}`,
      ),
    ).toBe(false);
  });

  it("rejects non-strings and empty values", () => {
    expect(isCanonicalRedemptionUrl("")).toBe(false);
    expect(isCanonicalRedemptionUrl("   ")).toBe(false);
    expect(isCanonicalRedemptionUrl(null as unknown as string)).toBe(false);
    expect(isCanonicalRedemptionUrl(undefined as unknown as string)).toBe(false);
  });
});