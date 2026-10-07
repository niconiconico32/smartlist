// Professional credentials email for the web funnel (English).
//
// Pure and dependency-free on purpose: this module only BUILDS the message.
// Delivery, retries and the Resend idempotency key live in funnel-identity.ts,
// which is the single credential issuance path shared by the webhook and the
// browser fast path. Changing the template therefore cannot change delivery
// semantics, and no already-sent mail can ever be resent.
//
// Two variants, same contract as before:
//   accountCreated = true  -> the funnel created the account, so the derived
//                             six-digit password is delivered here.
//   accountCreated = false -> the account already existed, so NO password is
//                             included under any input. We must not rotate a
//                             password the user may have chosen elsewhere.
//
// Email-client constraints, all deliberate:
//   - table based layout with every style inline (no <style>, no <link>);
//   - no remote images, fonts, scripts, forms or tracking pixels;
//   - only HTTPS links, to hosts and paths pinned by LINKS below, so a
//     template change can never introduce an unapproved destination;
//   - no brainy:// deep link: mail clients silently block custom schemes;
//   - no Stripe URL: subscription management always goes through Brainy;
//   - mobile first: 24px card padding, 44px minimum button height, actions
//     stacked so nothing can overflow a 375px screen;
//   - credentials stack label-over-value with break-all, so a long address
//     wraps instead of tearing the card.

export interface CredentialsEmailInput {
  email: string;
  password: string | null;
  accountCreated: boolean;
}

export interface CredentialsEmail {
  subject: string;
  preheader: string;
  text: string;
  html: string;
}

/**
 * The only destinations this template may link to. Tests assert every href
 * matches one of these exactly, so an accidental edit cannot ship a link
 * somewhere unexpected.
 */
export const LINKS = {
  appStore: "https://apps.apple.com/app/id6747673851",
  googlePlay: "https://play.google.com/store/apps/details?id=com.brainyahhd.app",
  manageSubscription: "https://brainyadhd.com/manage-subscription/",
  support: "https://brainyadhd.com/support.html",
  privacy: "https://brainyadhd.com/privacy.html",
  terms: "https://brainyadhd.com/terms.html",
} as const;

export const APPROVED_HOSTS = [
  "apps.apple.com",
  "play.google.com",
  "brainyadhd.com",
] as const;

export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[char] ?? char));
}

// Explicit colours on a light background (never `inherit`) so the message stays
// legible for clients that force their own colour scheme.
const INK = "#16161d";
const BODY = "#43434f";
const MUTED = "#6a6a78";
const ACCENT = "#4f46a8";
const HAIRLINE = "#e3e3ea";
const PANEL = "#f7f7fa";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Courier New',monospace";

/** Card horizontal padding: 24px keeps a 375px screen comfortable. */
const PAD = 24;

/** 14px padding + 16px line box = the 44px minimum touch target. */
const BUTTON_PADDING = "14px 22px";

/**
 * Eyebrow label. The visible text is written in caps directly rather than via
 * `text-transform:uppercase`, because a client that strips the style attribute
 * would otherwise show lowercase text that no longer matches the plaintext
 * alternative.
 */
function eyebrow(text: string): string {
  return `<p style="margin:0 0 10px 0;font-family:${FONT};font-size:12px;line-height:16px;font-weight:700;letter-spacing:1.4px;color:${ACCENT};">${escapeHtml(text)}</p>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 14px 0;font-family:${FONT};font-size:24px;line-height:31px;font-weight:700;letter-spacing:-0.4px;color:${INK};">${escapeHtml(text)}</h1>`;
}

function paragraph(text: string, last = false): string {
  return `<p style="margin:0${last ? "" : " 0 14px 0"};font-family:${FONT};font-size:15px;line-height:23px;color:${BODY};">${escapeHtml(text)}</p>`;
}

/**
 * One credential field. The label sits above the value instead of beside it,
 * so a long address wraps on its own line and never widens the card.
 */
function credentialField(label: string, value: string): string {
  return `<tr>
            <td style="padding:12px 16px;border-bottom:1px solid ${HAIRLINE};">
              <div style="font-family:${FONT};font-size:12px;line-height:16px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase;color:${MUTED};">${escapeHtml(label)}</div>
              <div style="margin-top:3px;font-family:${MONO};font-size:15px;line-height:22px;color:${INK};word-break:break-all;overflow-wrap:break-word;">${escapeHtml(value)}</div>
            </td>
          </tr>`;
}

function credentialsPanel(fields: Array<[string, string]>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${PANEL};border:1px solid ${HAIRLINE};border-radius:10px;">
            ${fields.map(([label, value]) => credentialField(label, value)).join("\n            ")}
          </table>`;
}

/** Numbered step. Table based, so the badge never reflows on narrow screens. */
function stepRow(index: number, text: string): string {
  return `<tr>
              <td style="padding:0 12px 14px 0;vertical-align:top;width:38px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:26px;"><tr>
                  <td align="center" bgcolor="${ACCENT}" style="width:26px;height:26px;border-radius:13px;font-family:${FONT};font-size:12px;line-height:26px;font-weight:700;color:#ffffff;">${index}</td>
                </tr></table>
              </td>
              <td style="padding:3px 0 14px 0;vertical-align:top;font-family:${FONT};font-size:15px;line-height:22px;color:${BODY};">${escapeHtml(text)}</td>
            </tr>`;
}

function stepsTable(steps: string[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
            ${steps.map((step, i) => stepRow(i + 1, step)).join("\n            ")}
          </table>`;
}

/**
 * A store action. Table + bgcolor (not just a styled <a>) so Outlook renders it
 * as a real button. Full width and stacked, so 375px screens never overflow.
 */
function storeButton(href: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 10px 0;">
            <tr>
              <td align="center" bgcolor="${ACCENT}" style="border-radius:9px;">
                <a href="${escapeHtml(href)}" style="display:block;padding:${BUTTON_PADDING};font-family:${FONT};font-size:15px;line-height:16px;font-weight:600;color:#ffffff;text-decoration:none;text-align:center;">${escapeHtml(label)}</a>
              </td>
            </tr>
          </table>`;
}

function sectionTitle(text: string): string {
  return `<h2 style="margin:0 0 14px 0;font-family:${FONT};font-size:15px;line-height:20px;font-weight:700;letter-spacing:-0.1px;color:${INK};">${escapeHtml(text)}</h2>`;
}

/** Small print under the credentials panel. */
function securityNote(text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:14px 0 0 0;"><tr>
              <td style="padding:11px 14px;background:#f2f2f7;border-radius:8px;font-family:${FONT};font-size:13px;line-height:19px;color:${MUTED};">${escapeHtml(text)}</td>
            </tr></table>`;
}

/** Footer navigation: manage subscription, support, then the legal pair. */
function footerLinks(): string {
  const link = (href: string, label: string) =>
    `<a href="${escapeHtml(href)}" style="font-family:${FONT};font-size:13px;line-height:19px;color:${ACCENT};text-decoration:underline;">${escapeHtml(label)}</a>`;
  const sep = `<span style="color:${HAIRLINE};padding:0 8px;">·</span>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tr>
            <td align="center" style="font-family:${FONT};font-size:13px;line-height:24px;color:${MUTED};">
              ${link(LINKS.manageSubscription, "Manage your subscription")}${sep}${link(LINKS.support, "Support")}<br>
              ${link(LINKS.privacy, "Privacy")}${sep}${link(LINKS.terms, "Terms")}
            </td>
          </tr></table>`;
}

function layout(options: {
  preheader: string;
  body: string;
  why: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="x-apple-disable-message-reformatting">
</head>
<body style="margin:0;padding:0;background:#eceef3;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(options.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eceef3;">
  <tr>
    <td align="center" style="padding:20px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;border:1px solid ${HAIRLINE};">

        <tr>
          <td style="padding:24px ${PAD}px 20px ${PAD}px;border-bottom:1px solid ${HAIRLINE};">
            <div style="font-family:${FONT};font-size:17px;line-height:22px;font-weight:700;letter-spacing:-0.2px;color:${INK};">Brainy</div>
          </td>
        </tr>

        <tr>
          <td style="padding:28px ${PAD}px 0 ${PAD}px;">
            ${options.body}
          </td>
        </tr>

        <tr>
          <td style="padding:26px ${PAD}px 0 ${PAD}px;">
            ${footerLinks()}
          </td>
        </tr>

        <tr>
          <td style="padding:20px ${PAD}px 24px ${PAD}px;background:${PANEL};border-top:1px solid ${HAIRLINE};border-radius:0 0 13px 13px;">
            <p style="margin:0;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};">${escapeHtml(options.why)}</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

const WHY_RECEIVED =
  "You received this email because a Brainy plan was purchased for this address. If you didn’t make this purchase, contact Brainy Support.";

/** Store actions, identical in both variants. */
function appAccess(): string {
  return `${sectionTitle("Open Brainy")}
            ${storeButton(LINKS.appStore, "Open in the App Store")}
            ${storeButton(LINKS.googlePlay, "Get it on Google Play")}`;
}

const TEXT_FOOTER = [
  "",
  "Manage your subscription: " + LINKS.manageSubscription,
  `Support: ${LINKS.support}`,
  `Privacy: ${LINKS.privacy}`,
  `Terms: ${LINKS.terms}`,
  "",
  WHY_RECEIVED,
].join("\n");

const TEXT_STORES = [
  "",
  "Open Brainy",
  `App Store: ${LINKS.appStore}`,
  `Google Play: ${LINKS.googlePlay}`,
].join("\n");

/**
 * Builds the credentials email. Pure: no clock, no network, no env access, so
 * the same input always produces the same output.
 */
export function buildCredentialsEmail(input: CredentialsEmailInput): CredentialsEmail {
  const { email, password } = input;
  // Strict boolean: only a real `true` unlocks the variant that carries a
  // password. Anything else is treated as an existing account, which is the
  // safe direction to fail in.
  const accountCreated = input.accountCreated === true;

  if (accountCreated) {
    const steps = [
      "Download or open Brainy on your phone.",
      "Select “Log in”.",
      "Enter the email and password shown above.",
      "Your personalized plan will already be waiting for you.",
    ];
    return {
      subject: "Your Brainy plan is ready",
      preheader: "Your personalized tasks and routines are waiting in Brainy.",
      text: [
        "YOUR PLAN IS READY",
        "",
        "A simpler way to get things done starts now",
        "",
        "You’ve already done the hardest part: getting started. We turned your answers into a personalized plan built around small, manageable steps—so you can spend less time overthinking and more time moving forward.",
        "",
        "Your personalized tasks and routines are already waiting for you in Brainy.",
        "",
        "Email: " + email,
        "Password: " + (password ?? ""),
        "",
        "Keep this email private. Brainy will never ask you to send your password by email or message.",
        "",
        "How to get started",
        ...steps.map((step, i) => `${i + 1}. ${step}`),
        TEXT_STORES,
        TEXT_FOOTER,
      ].join("\n"),
      html: layout({
        preheader: "Your personalized tasks and routines are waiting in Brainy.",
        why: WHY_RECEIVED,
        body: `${eyebrow("YOUR PLAN IS READY")}
            ${heading("A simpler way to get things done starts now")}
            ${paragraph("You’ve already done the hardest part: getting started. We turned your answers into a personalized plan built around small, manageable steps—so you can spend less time overthinking and more time moving forward.")}
            ${paragraph("Your personalized tasks and routines are already waiting for you in Brainy.", true)}
            <div style="height:22px;line-height:22px;font-size:0;">&nbsp;</div>
            ${credentialsPanel([["Email", email], ["Password", password ?? ""]])}
            ${securityNote("Keep this email private. Brainy will never ask you to send your password by email or message.")}
            <div style="height:26px;line-height:26px;font-size:0;">&nbsp;</div>
            ${sectionTitle("How to get started")}
            ${stepsTable(steps)}
            <div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>
            ${appAccess()}`,
      }),
    };
  }

  // Pre-existing account: never include or rotate a password, whatever is
  // passed in. The check is a strict `=== true`, so a truthy-but-not-true flag
  // (1, "yes", an object from loose JSON) cannot flip this account into the
  // variant that prints a password.
  return {
    subject: "Brainy Pro is now active",
    preheader: "Your personalized Brainy plan is ready in your existing account.",
    text: [
      "YOUR PLAN IS READY",
      "",
      "Brainy Pro is now active",
      "",
      "Your purchase was linked to your existing Brainy account. We didn’t create a new account or change your password.",
      "",
      "Your personalized tasks and routines are already waiting for you.",
      "",
      "Email: " + email,
      "",
      "Open Brainy and log in using your usual password. Your plan and Brainy Pro access will appear automatically.",
      TEXT_STORES,
      TEXT_FOOTER,
    ].join("\n"),
    html: layout({
      preheader: "Your personalized Brainy plan is ready in your existing account.",
      why: WHY_RECEIVED,
      body: `${eyebrow("YOUR PLAN IS READY")}
            ${heading("Brainy Pro is now active")}
            ${paragraph("Your purchase was linked to your existing Brainy account. We didn’t create a new account or change your password.")}
            ${paragraph("Your personalized tasks and routines are already waiting for you.", true)}
            <div style="height:22px;line-height:22px;font-size:0;">&nbsp;</div>
            ${credentialsPanel([["Email", email]])}
            <div style="height:26px;line-height:26px;font-size:0;">&nbsp;</div>
            ${sectionTitle("How to get started")}
            ${paragraph("Open Brainy and log in using your usual password. Your plan and Brainy Pro access will appear automatically.", true)}
            <div style="height:22px;line-height:22px;font-size:0;">&nbsp;</div>
            ${appAccess()}`,
    }),
  };
}