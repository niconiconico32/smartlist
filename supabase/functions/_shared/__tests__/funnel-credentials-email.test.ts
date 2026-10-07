import { buildCredentialsEmail, escapeHtml } from "../funnel-credentials-email";

const EMAIL = "user@example.com";
const PASSWORD = "004207";

describe("credentials email: the account the funnel created", () => {
  const mail = buildCredentialsEmail({ email: EMAIL, password: PASSWORD, accountCreated: true });

  it("has a clear, professional subject", () => {
    expect(mail.subject).toBe("Tus datos de acceso a Brainy");
    // No emoji or exclamation in the subject: it reads as a transactional
    // credential notice, not a marketing blast.
    expect(mail.subject).not.toMatch(/[!¡🎉]/);
  });

  it("delivers both the email and the derived password", () => {
    expect(mail.text).toContain(`Email: ${EMAIL}`);
    expect(mail.text).toContain(`Contraseña: ${PASSWORD}`);
    expect(mail.html).toContain(EMAIL);
    expect(mail.html).toContain(PASSWORD);
  });

  it("renders a complete, self-contained HTML document", () => {
    expect(mail.html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(mail.html).toContain('<html lang="es">');
    expect(mail.html).toContain("<title>");
    expect(mail.html.trimEnd().endsWith("</html>")).toBe(true);
    // Balanced head/body.
    expect((mail.html.match(/<head>/g) ?? []).length).toBe(1);
    expect((mail.html.match(/<\/head>/g) ?? []).length).toBe(1);
    expect((mail.html.match(/<body/g) ?? []).length).toBe(1);
    expect((mail.html.match(/<\/body>/g) ?? []).length).toBe(1);
  });

  it("has a preheader so inbox previews are not the first heading", () => {
    expect(mail.html).toMatch(/display:none;max-height:0;overflow:hidden;opacity:0/);
    expect(mail.html).toContain("Tu plan Brainy ya está activo.");
  });

  it("uses inline styles only, so no client strips the design", () => {
    // No external stylesheet, no web font, no background image, no <style> block.
    expect(mail.html).not.toMatch(/<link\b/i);
    expect(mail.html).not.toMatch(/<style\b/i);
    expect(mail.html).not.toMatch(/url\(/i);
    expect(mail.html).not.toMatch(/@import/i);
  });

  it("is mobile friendly: fixed max width plus a responsive viewport", () => {
    expect(mail.html).toContain('name="viewport"');
    expect(mail.html).toContain("max-width:600px");
    // The container is capped at 600px and declared with a width:100% fallback, so
    // it collapses on narrow phones. The invariant that matters: NOTHING may pin
    // a fixed pixel width wider than that container, or the mail would overflow.
    const fixedWidths = [...mail.html.matchAll(/width:(\d{3,})px/g)].map((m) => Number(m[1]));
    for (const width of fixedWidths) {
      expect(width).toBeLessThanOrEqual(600);
    }
    expect(mail.html).toContain("width:100%;max-width:600px");
    // Small fixed widths are only the step-number badge and its column.
    for (const m of [...mail.html.matchAll(/width:(\d{1,2})px/g)].map((x) => Number(x[1]))) {
      expect([24, 40]).toContain(m);
    }
  });

  it("uses table based layout, which email clients actually honour", () => {
    const tables = (mail.html.match(/<table/g) ?? []).length;
    expect(tables).toBeGreaterThanOrEqual(4);
    expect(mail.html).toContain('role="presentation"');
    expect(mail.html).toContain('cellpadding="0"');
  });

  it("states the steps in order, in both formats", () => {
    const steps = [
      "Abre Brainy en tu teléfono.",
      "Pulsa «Iniciar sesión».",
      "Introduce este email y esta contraseña.",
    ];
    let cursor = 0;
    for (const step of steps) {
      const at = mail.text.indexOf(step, cursor);
      expect(at).toBeGreaterThanOrEqual(0);
      cursor = at;
      expect(mail.html).toContain(escapeHtml(step));
    }
    // Numbered badges 1..4.
    expect(mail.html).toContain(">1</div>");
    expect(mail.html).toContain(">4</div>");
  });

  it("tells the user to keep the email", () => {
    expect(mail.text).toContain("Guarda este correo");
    expect(mail.html).toContain("Guarda este correo");
  });

  it("offers a help path instead of an alarming warning", () => {
    expect(mail.html).toContain("escríbenos");
    expect(mail.html).not.toMatch(/urgent|actúa|inmediatamente|verifica tu cuenta/i);
  });
});

describe("credentials email: a pre-existing account", () => {
  const mail = buildCredentialsEmail({ email: EMAIL, password: null, accountCreated: false });

  it("never includes a password, even if one is passed in", () => {
    // Defence in depth: the variant must not leak a password under any input.
    const withPassword = buildCredentialsEmail({ email: EMAIL, password: PASSWORD, accountCreated: false });
    expect(withPassword.text).not.toContain(PASSWORD);
    expect(withPassword.html).not.toContain(PASSWORD);
    expect(mail.text).not.toContain("Contraseña");
    expect(mail.html).not.toContain("Contraseña");
  });

  it("tells the user to sign in with their existing password", () => {
    expect(mail.text).toContain("tu contraseña habitual");
    expect(mail.html).toContain("contraseña habitual");
    expect(mail.subject).toBe("Brainy Pro ya está activo en tu cuenta");
  });

  it("explains that no new account was created", () => {
    expect(mail.html).toContain("no creamos una nueva");
    expect(mail.html).toContain("No enviamos ninguna contraseña nueva");
  });

  it("still carries the email so the user knows which account", () => {
    expect(mail.text).toContain(EMAIL);
    expect(mail.html).toContain(EMAIL);
  });

  it("is a complete HTML document like the other variant", () => {
    expect(mail.html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(mail.html.trimEnd().endsWith("</html>")).toBe(true);
  });
});

describe("credentials email: escaping and robustness", () => {
  it("escapes HTML metacharacters in the email address", () => {
    const hostile = 'evil"><script>alert(1)</script>@x.com';
    const mail = buildCredentialsEmail({ email: hostile, password: PASSWORD, accountCreated: true });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).toContain("&quot;");
    // The plain-text part keeps the raw value: it is never rendered as markup.
    expect(mail.text).toContain(hostile);
  });

  it("escapes HTML metacharacters in the password", () => {
    const mail = buildCredentialsEmail({ email: EMAIL, password: '<b>"x"</b>', accountCreated: true });
    expect(mail.html).not.toContain("<b>");
    expect(mail.html).toContain("&lt;b&gt;");
  });

  it("escapes every dangerous character", () => {
    expect(escapeHtml(`&<>'"`)).toBe("&amp;&lt;&gt;&#39;&quot;");
  });

  it("degrades safely when the password is missing", () => {
    const mail = buildCredentialsEmail({ email: EMAIL, password: null, accountCreated: true });
    expect(mail.html).toContain("Contraseña");
    expect(mail.text).toContain("Contraseña:");
    // No "null" leaking into the message.
    expect(mail.html).not.toContain(">null<");
    expect(mail.text).not.toContain("null");
  });

  it("is deterministic: the same input yields byte-identical output", () => {
    const a = buildCredentialsEmail({ email: EMAIL, password: PASSWORD, accountCreated: true });
    const b = buildCredentialsEmail({ email: EMAIL, password: PASSWORD, accountCreated: true });
    expect(a).toEqual(b);
  });

  it("never embeds a raw http link that could be spoofed", () => {
    const mail = buildCredentialsEmail({ email: EMAIL, password: PASSWORD, accountCreated: true });
    expect(mail.html).not.toMatch(/href=/i);
  });

  it("keeps the language declared for screen readers", () => {
    const mail = buildCredentialsEmail({ email: EMAIL, password: PASSWORD, accountCreated: true });
    expect(mail.html).toContain('lang="es"');
    expect(mail.html).toContain("<title>");
  });

  it("does not log or throw on sensitive input", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => buildCredentialsEmail({ email: EMAIL, password: PASSWORD, accountCreated: true })).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
    expect(errSpy).not.toHaveBeenCalled();
    spy.mockRestore();
    errSpy.mockRestore();
  });
});

describe("credentials email: both variants stay in sync", () => {
  it("never exposes the password in the pre-existing-account variant", () => {
    for (const created of [true, false]) {
      const mail = buildCredentialsEmail({ email: EMAIL, password: PASSWORD, accountCreated: created });
      if (!created) {
        expect(mail.html).not.toContain(PASSWORD);
        expect(mail.text).not.toContain(PASSWORD);
      }
    }
  });

  it("always contains the recipient address", () => {
    for (const created of [true, false]) {
      const mail = buildCredentialsEmail({ email: EMAIL, password: PASSWORD, accountCreated: created });
      expect(mail.text).toContain(EMAIL);
      expect(mail.html).toContain(EMAIL);
    }
  });
});