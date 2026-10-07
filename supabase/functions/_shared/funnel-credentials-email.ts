// Professional credentials email for the web funnel.
//
// Pure and dependency-free on purpose: this module only BUILDS the message.
// Delivery, retries and the Resend idempotency key live in funnel-identity.ts,
// which is the single credential issuance path shared by the webhook and the
// browser fast path. Changing the template therefore cannot change delivery
// semantics, and the template can be unit tested without any network.
//
// Two variants, same as the historical contract:
//   accountCreated = true  -> the funnel created the account, so the derived
//                             six-digit password is delivered here.
//   accountCreated = false -> the account already existed, so NO password is
//                             ever included (we must not rotate a password the
//                             user may have chosen elsewhere).
//
// Email-client constraints: table-based layout, every style inline, no external
// CSS, no web fonts, no background images, dark text on a light background for
// legibility, and a real plain-text alternative for clients that ignore HTML.

export interface CredentialsEmailInput {
  email: string;
  password: string | null;
  accountCreated: boolean;
}

export interface CredentialsEmail {
  subject: string;
  text: string;
  html: string;
}

// Palette: restrained indigo accent over neutral greys. Chosen to stay legible
// on both light and dark-mode clients (explicit colours, never `inherit`).
const INK = "#1c1c28";
const BODY = "#4a4a5a";
const MUTED = "#6b6b7b";
const ACCENT = "#4f46a8";
const HAIRLINE = "#e2e2ea";
const PANEL = "#f7f7fa";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[char] ?? char));
}

/** A credential row. The value uses a monospace stack so digits stay readable. */
function credentialRow(label: string, value: string): string {
  return `<tr>
              <td style="padding:10px 0;border-bottom:1px solid ${HAIRLINE};color:${BODY};font-size:14px;line-height:20px;white-space:nowrap;vertical-align:top;width:38%;">${escapeHtml(label)}</td>
              <td style="padding:10px 0;border-bottom:1px solid ${HAIRLINE};color:${INK};font-size:15px;line-height:20px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;word-break:break-all;">${escapeHtml(value)}</td>
            </tr>`;
}

/** Numbered step. Built as a table so the number never reflows on mobile. */
function stepRow(index: number, text: string): string {
  return `<tr>
              <td style="padding:0 12px 14px 0;vertical-align:top;width:40px;">
                <div style="width:24px;height:24px;line-height:24px;text-align:center;background:${ACCENT};color:#ffffff;font-size:12px;font-weight:700;border-radius:12px;">${index}</div>
              </td>
              <td style="padding:2px 0 14px 0;vertical-align:top;color:${BODY};font-size:15px;line-height:22px;">${escapeHtml(text)}</td>
            </tr>`;
}

function layout(options: {
  preheader: string;
  heading: string;
  intro: string;
  rows: string;
  stepsTitle: string;
  steps: string[];
  footnote: string;
}): string {
  const stepsHtml = options.steps
    .map((step, i) => stepRow(i + 1, step))
    .join("\n            ");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(options.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#eceef3;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(options.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eceef3;">
  <tr>
    <td align="center" style="padding:28px 14px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;border:1px solid ${HAIRLINE};">

        <tr>
          <td style="padding:26px 32px 22px 32px;border-bottom:1px solid ${HAIRLINE};">
            <div style="font-size:17px;font-weight:700;letter-spacing:-0.2px;color:${INK};">Brainy</div>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 32px 0 32px;">
            <h1 style="margin:0 0 12px 0;font-size:23px;line-height:30px;font-weight:700;letter-spacing:-0.4px;color:${INK};">${escapeHtml(options.heading)}</h1>
            <p style="margin:0 0 22px 0;font-size:15px;line-height:23px;color:${BODY};">${escapeHtml(options.intro)}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PANEL};border:1px solid ${HAIRLINE};border-radius:10px;">
              ${options.rows}
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:26px 32px 0 32px;">
            <h2 style="margin:0 0 14px 0;font-size:15px;font-weight:700;letter-spacing:-0.1px;color:${INK};">${escapeHtml(options.stepsTitle)}</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${stepsHtml}
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:6px 32px 26px 32px;">
            <p style="margin:0;font-size:13px;line-height:20px;color:${MUTED};">${escapeHtml(options.footnote)}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:18px 32px;background:${PANEL};border-top:1px solid ${HAIRLINE};border-radius:0 0 13px 13px;">
            <p style="margin:0;font-size:12px;line-height:18px;color:${MUTED};">Recibes este correo porque completaste una compra en Brainy. Tu plan ya está activo.</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Plain-text alternative: no markup, same information, same order. */
function plainText(lines: string[]): string {
  return lines.join("\n");
}

/**
 * Builds the credentials email. Pure: no clock, no network, no env access, so
 * the same input always produces the same output.
 */
export function buildCredentialsEmail(input: CredentialsEmailInput): CredentialsEmail {
  const { email, password, accountCreated } = input;

  if (accountCreated) {
    return {
      subject: "Tus datos de acceso a Brainy",
      text: plainText([
        "Tu plan Brainy ya está activo.",
        "",
        "Tus datos de acceso",
        `Email: ${email}`,
        `Contraseña: ${password ?? ""}`,
        "",
        "Cómo entrar",
        "1. Abre Brainy en tu teléfono.",
        "2. Pulsa «Iniciar sesión».",
        "3. Introduce este email y esta contraseña.",
        "4. Tu plan aparecerá automáticamente, sin pasos extra.",
        "",
        "Guarda este correo: contiene tus datos de acceso.",
      ]),
      html: layout({
        preheader: "Tu plan Brainy ya está activo. Aquí están tus datos de acceso.",
        heading: "Tus datos de acceso a Brainy",
        intro: "Tu plan ya está activo. Estos son tus datos de acceso para entrar en Brainy.",
        rows: [
          credentialRow("Email", email),
          credentialRow("Contraseña", password ?? ""),
        ].join("\n            "),
        stepsTitle: "Cómo entrar",
        steps: [
          "Abre Brainy en tu teléfono.",
          "Pulsa «Iniciar sesión».",
          "Introduce este email y esta contraseña.",
          "Tu plan aparecerá automáticamente, sin pasos extra.",
        ],
        footnote: "Guarda este correo: contiene tus datos de acceso. Si no solicitaste esta compra, ignóralo y escríbenos.",
      }),
    };
  }

  // Pre-existing account: never include or rotate a password.
  return {
    subject: "Brainy Pro ya está activo en tu cuenta",
    text: plainText([
      "Brainy Pro ya está activo en tu cuenta.",
      "",
      `Email: ${email}`,
      "",
      "Abre Brainy e inicia sesión con tu contraseña habitual.",
      "No necesitas cambiar nada: tu plan se aplica automáticamente.",
    ]),
    html: layout({
      preheader: "Brainy Pro ya está activo en tu cuenta.",
      heading: "Brainy Pro ya está activo",
      intro: "Tu compra se aplicó a una cuenta que ya existía, así que no creamos una nueva.",
      rows: [credentialRow("Email", email)].join("\n            "),
      stepsTitle: "Qué hacer ahora",
      steps: [
        "Abre Brainy e inicia sesión con tu contraseña habitual.",
        "No necesitas cambiar nada: tu plan se aplica automáticamente.",
      ],
      footnote: "No enviamos ninguna contraseña nueva porque tu cuenta ya tenía una.",
    }),
  };
}