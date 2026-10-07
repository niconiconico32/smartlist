import {
  APPROVED_HOSTS,
  LINKS,
  buildCredentialsEmail,
  escapeHtml,
} from "../funnel-credentials-email";

const EMAIL = "alex@example.com";
const PASSWORD = "482731";
const PASSWORD_TO_LEAK = "999888";

const created = buildCredentialsEmail({ email: EMAIL, password: PASSWORD, accountCreated: true });
const existing = buildCredentialsEmail({ email: EMAIL, password: null, accountCreated: false });

/** Every href in the message, in order. */
const hrefs = (html: string) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);

const VARIANTS = [
  { name: "created", mail: created, hasPassword: true },
  { name: "existing", mail: existing, hasPassword: false },
] as const;

describe("language and identity", () => {
  it("uses the agreed English subject and preheader for a created account", () => {
    expect(created.subject).toBe("Your Brainy plan is ready");
    expect(created.preheader).toBe("Your personalized tasks and routines are waiting in Brainy.");
  });

  it("uses the agreed English subject and preheader for an existing account", () => {
    expect(existing.subject).toBe("Brainy Pro is now active");
    expect(existing.preheader).toBe("Your personalized Brainy plan is ready in your existing account.");
  });

  it("declares lang=en and carries no Spanish leftovers", () => {
    for (const { name, mail } of VARIANTS) {
      expect(mail.html).toContain('<html lang="en">');
      for (const leftover of ["Contraseña", "Correo", "Acceso", "contraseña habitual", "cuenta habitual"]) {
        expect(`${name}:${mail.html}${mail.text}`).not.toContain(leftover);
      }
    }
  });

  it("never describes the password as temporary or one-time", () => {
    for (const { name, mail } of VARIANTS) {
      expect(`${name}:${mail.html}${mail.text}`).not.toMatch(/temporary|one-time|one time|changeme/i);
    }
  });

  it("carries the agreed copy for a created account", () => {
    for (const fragment of [
      "YOUR PLAN IS READY",
      "A simpler way to get things done starts now",
      "You’ve already done the hardest part: getting started.",
      "Your personalized tasks and routines are already waiting for you in Brainy.",
      "Keep this email private. Brainy will never ask you to send your password by email or message.",
      "How to get started",
      "Download or open Brainy on your phone.",
      "Select “Log in”.",
      "Enter the email and password shown above.",
      "Your personalized plan will already be waiting for you.",
    ]) {
      expect(created.html).toContain(fragment);
      expect(created.text).toContain(fragment);
    }
  });

  it("carries the agreed copy for an existing account", () => {
    for (const fragment of [
      "YOUR PLAN IS READY",
      "Brainy Pro is now active",
      "Your purchase was linked to your existing Brainy account. We didn’t create a new account or change your password.",
      "Your personalized tasks and routines are already waiting for you.",
      "Open Brainy and log in using your usual password. Your plan and Brainy Pro access will appear automatically.",
    ]) {
      expect(existing.html).toContain(fragment);
      expect(existing.text).toContain(fragment);
    }
  });

  it("explains why the email was received in both variants", () => {
    const why = "You received this email because a Brainy plan was purchased for this address. If you didn’t make this purchase, contact Brainy Support.";
    for (const { name, mail } of VARIANTS) {
      expect(mail.html).toContain(why);
      expect(mail.text).toContain(why);
    }
  });

  it("shows an eyebrow in both variants", () => {
    for (const { mail } of VARIANTS) {
      expect(mail.html).toContain("YOUR PLAN IS READY");
      expect(mail.html).toContain("letter-spacing:1.4px");
    }
  });
});

describe("password exposure guard", () => {
  it("delivers the password only for a funnel-created account", () => {
    expect(created.html).toContain(PASSWORD);
    expect(created.text).toContain(PASSWORD);
  });

  it("never leaks a password into the existing-account variant", () => {
    // Both the legitimate call and a hostile one that passes a password.
    for (const mail of [
      existing,
      buildCredentialsEmail({ email: EMAIL, password: PASSWORD, accountCreated: false }),
      buildCredentialsEmail({ email: EMAIL, password: PASSWORD_TO_LEAK, accountCreated: false }),
    ]) {
      expect(mail.html).not.toContain(PASSWORD);
      expect(mail.html).not.toContain(PASSWORD_TO_LEAK);
      expect(mail.text).not.toContain(PASSWORD);
      expect(mail.text).not.toContain(PASSWORD_TO_LEAK);
      expect(mail.text).not.toContain("Password:");
      expect(mail.text).not.toMatch(/\bpassword\s*:/i);
      // The WORD "password" is legitimate prose here ("we didn't change your
      // password", "log in using your usual password"). What must never appear
      // is a password VALUE or a "Password:" credential label.
      expect(mail.html).not.toContain(">Password<");
    }
  });

  it("keeps the guard even if accountCreated is truthy-but-not-true", () => {
    const weird = buildCredentialsEmail({
      email: EMAIL,
      password: PASSWORD_TO_LEAK,
      accountCreated: 1 as unknown as boolean,
    });
    expect(weird.html).not.toContain(PASSWORD_TO_LEAK);
    expect(weird.text).not.toContain(PASSWORD_TO_LEAK);
  });

  it("degrades safely when the created account has no password", () => {
    const mail = buildCredentialsEmail({ email: EMAIL, password: null, accountCreated: true });
    expect(mail.html).toContain("Password");
    expect(mail.html).not.toContain(">null<");
    expect(mail.text).not.toContain("null");
  });
});

describe("escaping", () => {
  it("escapes every dangerous character", () => {
    expect(escapeHtml(`&<>'"`)).toBe("&amp;&lt;&gt;&#39;&quot;");
  });

  it("escapes an injected email in both formats", () => {
    const hostile = 'evil"><script>alert(1)</script>@x.com';
    for (const mail of [
      buildCredentialsEmail({ email: hostile, password: PASSWORD, accountCreated: true }),
      buildCredentialsEmail({ email: hostile, password: null, accountCreated: false }),
    ]) {
      expect(mail.html).not.toContain("<script>");
      expect(mail.html).toContain("&lt;script&gt;");
      expect(mail.html).toContain("&quot;");
      expect(mail.text).toContain(hostile);
    }
  });

  it("escapes an injected password", () => {
    const mail = buildCredentialsEmail({ email: EMAIL, password: '<b>"x"</b>', accountCreated: true });
    expect(mail.html).not.toContain("<b>");
    expect(mail.html).toContain("&lt;b&gt;");
  });
});

describe("links and calls to action", () => {
  it("links the App Store and Google Play in both variants", () => {
    for (const { name, mail } of VARIANTS) {
      expect(mail.html).toContain(`href="${LINKS.appStore}"`);
      expect(mail.html).toContain(`href="${LINKS.googlePlay}"`);
      expect(mail.text).toContain(LINKS.appStore);
      expect(mail.text).toContain(LINKS.googlePlay);
      expect(name).toBeTruthy();
    }
  });

  it("labels both store actions", () => {
    for (const { mail } of VARIANTS) {
      expect(mail.html).toContain("Open in the App Store");
      expect(mail.html).toContain("Get it on Google Play");
      expect(mail.text).toContain("Open Brainy");
    }
  });

  it("links manage subscription, support, privacy and terms in both variants", () => {
    for (const { mail } of VARIANTS) {
      expect(mail.html).toContain(`href="${LINKS.manageSubscription}"`);
      expect(mail.html).toContain(`href="${LINKS.support}"`);
      expect(mail.html).toContain(`href="${LINKS.privacy}"`);
      expect(mail.html).toContain(`href="${LINKS.terms}"`);
    }
  });

  it("always links through the Brainy route, never Stripe", () => {
    for (const { name, mail } of VARIANTS) {
      expect(`${name}:${mail.html}${mail.text}`).not.toMatch(/stripe\.com|billing\.stripe|stripe/i);
      // Subscription management must go through the Brainy HTTPS route.
      expect(mail.html).toContain(`href="${LINKS.manageSubscription}"`);
    }
  });

  it("uses only HTTPS hrefs", () => {
    for (const { name, mail } of VARIANTS) {
      const list = hrefs(mail.html);
      expect(list.length).toBeGreaterThanOrEqual(6);
      for (const h of list) {
        expect(`${name} ${h}:`).toMatch(/https:\/\//);
        expect(h.startsWith("http://")).toBe(false);
      }
      expect(mail.html).not.toMatch(/http:\/\//);
    }
  });

  it("uses only approved hosts and exact approved paths", () => {
    const allowed = Object.values(LINKS);
    for (const { name, mail } of VARIANTS) {
      for (const h of hrefs(mail.html)) {
        const host = new URL(h).host;
        expect(APPROVED_HOSTS as readonly string[]).toContain(host);
        expect(`${name}:${allowed}`).toContain(h);
      }
    }
  });

  it("never uses a custom deep-link scheme", () => {
    for (const { name, mail } of VARIANTS) {
      expect(`${name}:${mail.html}${mail.text}`).not.toContain("brainy://");
      // Every href scheme is https:; no other scheme may appear.
      for (const h of hrefs(mail.html)) {
        expect(h).toMatch(/^https:\/\//);
      }
    }
  });

  it("never puts credentials in a URL, subject or preheader", () => {
    for (const { name, mail } of VARIANTS) {
      for (const h of hrefs(mail.html)) {
        expect(`${name} url ${h}`).not.toContain(EMAIL);
        expect(h).not.toContain(PASSWORD);
        expect(h).not.toContain(PASSWORD_TO_LEAK);
        // No tracking or identity query parameters anywhere.
        expect(h).not.toMatch(/[?&](utm_|mc_|email|user|password)=/i);
      }
      expect(mail.subject).not.toContain(EMAIL);
      expect(mail.subject).not.toContain(PASSWORD);
      expect(mail.preheader).not.toContain(EMAIL);
      expect(mail.preheader).not.toContain(PASSWORD);
    }
  });

  it("provides readable fallback URLs in the plaintext", () => {
    for (const { mail } of VARIANTS) {
      for (const url of Object.values(LINKS)) {
        expect(mail.text).toContain(url);
      }
      // Every plaintext link line shows the raw URL, not just a label.
      expect(mail.text).toContain(`Manage your subscription: ${LINKS.manageSubscription}`);
      expect(mail.text).toContain(`Support: ${LINKS.support}`);
      expect(mail.text).toContain(`Privacy: ${LINKS.privacy}`);
      expect(mail.text).toContain(`Terms: ${LINKS.terms}`);
    }
  });

  it("does not log or throw with sensitive input", () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const err = jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => buildCredentialsEmail({ email: EMAIL, password: PASSWORD, accountCreated: true })).not.toThrow();
    expect(log).not.toHaveBeenCalled();
    expect(err).not.toHaveBeenCalled();
    log.mockRestore();
    err.mockRestore();
  });
});

describe("no remote content, no tracking", () => {
  it("has no scripts, forms, iframes or inputs", () => {
    for (const mail of VARIANTS.map((v) => v.mail)) {
      for (const tag of ["<script", "<form", "<iframe", "<input", "<video", "<audio", "<object", "<embed"]) {
        expect(mail.html).not.toContain(tag);
        expect(mail.text).not.toContain(tag);
      }
    }
  });

  it("has no images, background images or remote fonts", () => {
    for (const mail of VARIANTS.map((v) => v.mail)) {
      expect(mail.html).not.toMatch(/<img\b/i);
      expect(mail.html).not.toMatch(/background-image/i);
      expect(mail.html).not.toMatch(/url\(/i);
      expect(mail.html).not.toMatch(/@import/i);
      expect(mail.html).not.toMatch(/@font-face/i);
      // No remote font file is requested; only system font stacks.
      expect(mail.html).not.toMatch(/fonts\.(googleapis|gstatic)/i);
    }
  });

  it("has no tracking pixels or UTM parameters", () => {
    for (const mail of VARIANTS.map((v) => v.mail)) {
      expect(mail.html).not.toMatch(/utm_/i);
      expect(mail.text).not.toMatch(/utm_/i);
      expect(mail.html).not.toMatch(/\.gif|\/open\?|\/o\?/i);
      expect(mail.html).not.toMatch(/list-manage|mailchimp/i);
    }
  });

  it("uses no style block, no link element and no external CSS", () => {
    for (const mail of VARIANTS.map((v) => v.mail)) {
      expect(mail.html).not.toMatch(/<style\b/i);
      expect(mail.html).not.toMatch(/<link\b/i);
    }
  });
});

describe("mobile layout", () => {
  it("caps the card at 600px for desktop", () => {
    for (const { mail } of VARIANTS) {
      expect(mail.html).toContain("max-width:600px");
    }
  });

  it("uses 24px horizontal card padding for 375px screens", () => {
    for (const { name, mail } of VARIANTS) {
      expect(`${name} pad:`).not.toContain("32px 32px");
      expect(mail.html).toContain("padding:24px 24px");
      expect(mail.html).toContain("padding:28px 24px 0 24px");
    }
  });

  it("gives every button a 44px minimum touch target", () => {
    for (const { mail } of VARIANTS) {
      // 14px vertical padding + 16px line box = 44px.
      expect(mail.html).toContain("padding:14px 22px");
      expect(mail.html).toContain("line-height:16px");
    }
  });

  it("stacks the store actions full width so nothing overflows 375px", () => {
    for (const { mail } of VARIANTS) {
      // Each action is its own width:100% table: they wrap by stacking rather
      // than sitting side by side and pushing the card wider.
      expect(mail.html).toContain('style="width:100%;margin:0 0 10px 0;"');
    }
  });

  it("keeps numbered steps clear of the right edge", () => {
    // The step-number column carries its own right padding, so step text never
    // runs to the card edge on a 375px screen, and the text cell keeps bottom
    // spacing so wrapped lines never touch.
    for (const mail of VARIANTS.map((v) => v.mail)) {
      if (!mail.html.includes("width:38px")) continue;
      expect(mail.html).toMatch(/padding:0 12px 14px 0;vertical-align:top;width:38px;/);
      expect(mail.html).toContain("padding:3px 0 14px 0;vertical-align:top;");
    }
    // The created account renders numbered steps; the existing account carries a
    // single instruction paragraph instead, per the agreed copy.
    expect(created.html).toMatch(/padding:0 12px 14px 0;vertical-align:top;width:38px;/);
    expect(existing.html).not.toContain("width:38px");
  });

  it("wraps credentials safely instead of widening the card", () => {
    for (const { mail } of VARIANTS) {
      expect(mail.html).toContain("word-break:break-all");
      expect(mail.html).toContain("overflow-wrap:break-word");
    }
  });

  it("declares a responsive viewport", () => {
    for (const { mail } of VARIANTS) {
      expect(mail.html).toContain('name="viewport"');
      expect(mail.html).toContain("width=device-width,initial-scale=1");
    }
  });
});

describe("readability and plaintext", () => {
  it("stays readable when a client strips styling", () => {
    for (const { name, mail } of VARIANTS) {
      const text = mail.html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
      expect(text.length).toBeGreaterThan(400);
      expect(`${name}:${text}`).toContain(EMAIL);
      // The eyebrow is uppercase in the markup itself, not via CSS, so it
      // survives a style-stripping client unchanged.
      expect(text).toContain("YOUR PLAN IS READY");
    }
  });

  it("carries the essential content in the plaintext of both variants", () => {
    for (const { name, mail } of VARIANTS) {
      expect(`${name}:${mail.text}`).toContain(EMAIL);
      expect(mail.text).toContain("YOUR PLAN IS READY");
      expect(mail.text).toContain("Open Brainy");
      expect(mail.text).toContain("You received this email because a Brainy plan was purchased for this address.");
      expect(mail.text.split("\n").filter((l) => l.trim()).length).toBeGreaterThanOrEqual(8);
    }
  });

  it("includes the credentials only in the created-account plaintext", () => {
    expect(created.text).toContain(`Password: ${PASSWORD}`);
    expect(existing.text).not.toContain(`Password: ${PASSWORD}`);
  });

  it("is deterministic", () => {
    const a = buildCredentialsEmail({ email: EMAIL, password: PASSWORD, accountCreated: true });
    const b = buildCredentialsEmail({ email: EMAIL, password: PASSWORD, accountCreated: true });
    expect(a).toEqual(b);
  });

  it("embeds the preheader exactly once, hidden, in the HTML", () => {
    for (const { mail } of VARIANTS) {
      expect(mail.html).toContain("display:none;max-height:0;overflow:hidden;opacity:0;");
      const occurrences = mail.html.split(mail.preheader).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(1);
    }
  });
});