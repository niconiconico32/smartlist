import { readFileSync } from "node:fs";
import { buildCredentialsEmail } from "../funnel-credentials-email";

/**
 * Mutation / regression tests for the existing-account password guard.
 *
 * The guard is the single most important property of this template: if it ever
 * regresses, a customer who already has a password would receive someone
 * else's or a stale one. These tests attack it from several directions and
 * prove the guard cannot be bypassed by the template's public surface.
 */

// Any truthy-but-not-true value must NOT unlock the password variant.
const NON_TRUE_FLAGS: unknown[] = [
  1,
  "true",
  "yes",
  {},
  [],
  -1,
  NaN,
  null,
  undefined,
  0,
  "",
  false,
];

describe("mutation: the password guard resists a non-true accountCreated flag", () => {
  for (const flag of NON_TRUE_FLAGS) {
    it(`treats ${JSON.stringify(flag) ?? String(flag)} as an EXISTING account`, () => {
      const mail = buildCredentialsEmail({
        email: "alex@example.com",
        password: "482731",
        accountCreated: flag as boolean,
      });
      expect(mail.html).not.toContain("482731");
      expect(mail.text).not.toContain("482731");
      // It must resolve to the existing-account variant, not merely lose the
      // password: the subject is the observable marker of which branch ran.
      expect(mail.subject).toBe("Brainy Pro is now active");
    });
  }

  it("unlocks the password variant ONLY for a real boolean true", () => {
    const mail = buildCredentialsEmail({
      email: "alex@example.com",
      password: "482731",
      accountCreated: true,
    });
    expect(mail.html).toContain("482731");
    expect(mail.subject).toBe("Your Brainy plan is ready");
  });

  it("ignores inherited or mutated input objects", () => {
    // A prototype carrying accountCreated=true must not affect the result.
    const hostile = Object.create({ accountCreated: true });
    hostile.email = "alex@example.com";
    hostile.password = "482731";
    hostile.accountCreated = false;
    const mail = buildCredentialsEmail(hostile);
    expect(mail.html).not.toContain("482731");

    // A frozen input must not throw.
    const frozen = Object.freeze({ email: "alex@example.com", password: "482731", accountCreated: true });
    expect(() => buildCredentialsEmail(frozen)).not.toThrow();
    expect(buildCredentialsEmail(frozen).html).toContain("482731");
  });

  it("does not mutate its input", () => {
    const input = { email: "alex@example.com", password: "482731", accountCreated: false };
    const snapshot = JSON.stringify(input);
    buildCredentialsEmail(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("cannot be flipped by an attacker-controlled email value", () => {
    // The email is rendered as data, never interpreted as a branch condition.
    const hostile = "true@x.com\"><script>accountCreated=true</script>";
    const mail = buildCredentialsEmail({ email: hostile, password: "482731", accountCreated: false });
    expect(mail.html).not.toContain("482731");
    expect(mail.html).not.toContain("<script>");
    expect(mail.subject).toBe("Brainy Pro is now active");
  });
});

describe("mutation: the plaintext guard mirrors the HTML guard", () => {
  it("leaks no password in plaintext for any non-true flag", () => {
    for (const flag of NON_TRUE_FLAGS) {
      const mail = buildCredentialsEmail({
        email: "alex@example.com",
        password: "482731",
        accountCreated: flag as boolean,
      });
      expect(mail.text).not.toContain("482731");
      expect(mail.text).not.toMatch(/Password:/);
    }
  });

  it("keeps the plaintext and HTML variants in agreement", () => {
    for (const flag of [true, false, 1, null]) {
      const mail = buildCredentialsEmail({
        email: "alex@example.com",
        password: "482731",
        accountCreated: flag as boolean,
      });
      const htmlHas = mail.html.includes("482731");
      const textHas = mail.text.includes("482731");
      expect(htmlHas).toBe(textHas);
    }
  });
});

describe("mutation: the module surface exposes no alternate entry point", () => {
  it("the core module does not leak a second, unguarded builder", async () => {
    // funnel-identity-core is imported by every function; it must not offer a
    // way to render the email that bypasses the guard.
    const mod = require("../funnel-identity-core");
    const keys = Object.keys(mod).sort();
    expect(keys).not.toContain("buildCredentialsEmail");
    expect(keys).not.toContain("sendCredentialsEmail");
    expect(keys).not.toContain("renderEmail");
    // Sanity: it still exports what the functions rely on.
    expect(keys).toEqual(expect.arrayContaining(["normalizeEmail", "isUuid", "sha256Hex"]));
  });

  it("the shared identity module keeps delivery, not rendering", () => {
    const mod = require("../funnel-identity");
    // Delivery helpers live here; the builder does not.
    expect(mod).toHaveProperty("issueFunnelCredentials");
    expect(Object.keys(mod)).not.toContain("buildCredentialsEmail");
  });
});

describe("regression: delivery semantics are untouched by the template", () => {
  it("the module is pure: no clock, network or env access", () => {
    const source = readFileSync(
      require("node:path").join(__dirname, "..", "funnel-credentials-email.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/\bDate\.now\b/);
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/Deno\.env/);
    expect(source).not.toMatch(/\bconsole\.(log|error|warn|info)\b/);
    expect(source).not.toMatch(/Math\.random/);
  });

  it("never emits the Resend idempotency key or any plan identifier", async () => {
    const mail = buildCredentialsEmail({ email: "alex@example.com", password: "482731", accountCreated: true });
    const rendered = `${mail.subject}${mail.preheader}${mail.text}${mail.html}`;
    expect(rendered).not.toContain("brainy-funnel-credentials");
    expect(rendered).not.toMatch(/Idempotency-Key/i);
    expect(rendered).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });
});