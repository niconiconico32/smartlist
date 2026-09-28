import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { checkEntitlementActive } from "./rc.ts";
export { deriveSixDigitPassword, isUuid, normalizeEmail, sha256Hex } from "./funnel-identity-core.ts";
import { deriveSixDigitPassword, normalizeEmail } from "./funnel-identity-core.ts";

const RESEND_URL = "https://api.resend.com/emails";
const LEASE_MS = 2 * 60 * 1000;

export type IssueResult =
  | { ok: true; status: "sent" | "already_completed" }
  | { ok: false; status: "in_progress" | "entitlement_inactive" | "verification_unavailable" | "retryable" };

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[char] ?? char));
}

function emailContent(email: string, password: string | null, accountCreated: boolean) {
  const safeEmail = escapeHtml(email);
  if (accountCreated) {
    return {
      subject: "Tu Brainy está listo 🎉",
      text: [
        "Tu plan Brainy ya está activado.", "", "Tus datos de acceso:",
        `Email: ${email}`, `Contraseña: ${password}`, "", "Cómo entrar:",
        "1. Descarga o abre Brainy.", "2. Pulsa \"Iniciar sesión\".",
        "3. Ingresa este email y esta contraseña.",
        "4. Tu plan y Brainy Pro estarán disponibles automáticamente.", "",
        "Guarda este correo: contiene tus datos de acceso.",
      ].join("\n"),
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;line-height:1.5"><h1>Tu Brainy está listo 🎉</h1><p>Tu plan Brainy ya está activado.</p><h2>Tus datos de acceso</h2><p><b>Email:</b> ${safeEmail}<br><b>Contraseña:</b> ${escapeHtml(password ?? "")}</p><h2>Cómo entrar</h2><ol><li>Descarga o abre Brainy.</li><li>Pulsa “Iniciar sesión”.</li><li>Ingresa este email y esta contraseña.</li><li>Tu plan y Brainy Pro estarán disponibles automáticamente.</li></ol><p><b>Guarda este correo: contiene tus datos de acceso.</b></p></div>`,
    };
  }
  return {
    subject: "Tu Brainy Pro está activado 🎉",
    text: `Brainy Pro ya está activo en tu cuenta.\n\nEmail: ${email}\n\nAbre Brainy e inicia sesión con tu contraseña habitual.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;line-height:1.5"><h1>Tu Brainy Pro está activado 🎉</h1><p>Brainy Pro ya está activo en tu cuenta.</p><p><b>Email:</b> ${safeEmail}</p><p>Abre Brainy e inicia sesión con tu contraseña habitual.</p></div>`,
  };
}

async function sendResend(email: string, password: string | null, accountCreated: boolean, apiKey: string, from: string, planId: string) {
  const content = emailContent(email, password, accountCreated);
  const response = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `brainy-funnel-credentials-${planId}`,
    },
    body: JSON.stringify({ from, to: [email], subject: content.subject, html: content.html, text: content.text }),
  });
  if (!response.ok) return { accepted: false as const, id: null };
  const body = await response.json().catch(() => ({})) as { id?: string };
  return { accepted: true as const, id: typeof body.id === "string" ? body.id : null };
}

/** The sole credential issuance path shared by webhook and browser fast path. */
export async function issueFunnelCredentials(admin: SupabaseClient, planId: string, userId: string): Promise<IssueResult> {
  const { data: plan, error: loadError } = await admin.from("web_funnel_plans")
    .select("id, email, funnel_user_id, account_created_by_funnel, purchase_confirmed_at, credentials_issuing_started_at, credentials_issued_at")
    .eq("id", planId).maybeSingle();
  if (loadError || !plan || plan.funnel_user_id !== userId) return { ok: false, status: "retryable" };
  if (plan.credentials_issued_at) return { ok: true, status: "already_completed" };
  if (!plan.purchase_confirmed_at) return { ok: false, status: "retryable" };

  const rcSecret = Deno.env.get("REVENUECAT_SECRET_API_KEY") ?? "";
  const rc = await checkEntitlementActive(userId, rcSecret);
  if (!rc.ok) return { ok: false, status: "verification_unavailable" };
  if (!rc.active) return { ok: false, status: "entitlement_inactive" };

  const cutoff = new Date(Date.now() - LEASE_MS).toISOString();
  const { data: lease, error: leaseError } = await admin.from("web_funnel_plans")
    .update({ credentials_issuing_started_at: new Date().toISOString() })
    .eq("id", planId).is("credentials_issued_at", null)
    .or(`credentials_issuing_started_at.is.null,credentials_issuing_started_at.lt.${cutoff}`)
    .select("id, email, account_created_by_funnel, credentials_issued_at")
    .maybeSingle();
  if (leaseError) return { ok: false, status: "retryable" };
  if (!lease) {
    const { data: current } = await admin.from("web_funnel_plans").select("credentials_issued_at").eq("id", planId).maybeSingle();
    return current?.credentials_issued_at ? { ok: true, status: "already_completed" } : { ok: false, status: "in_progress" };
  }

  const email = normalizeEmail(String(lease.email ?? ""));
  let accountCreated = lease.account_created_by_funnel === true;
  if (accountCreated) {
    const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(userId);
    if (authUserError || !authUser.user) return { ok: false, status: "retryable" };
    const metadata = authUser.user.user_metadata ?? {};
    const hasUsedAccount = Boolean(
      authUser.user.last_sign_in_at ||
      metadata.brainy_funnel_account_used === true ||
      metadata.brainy_funnel_account_used_at,
    );
    if (hasUsedAccount) {
      // The account started as funnel-created but has since been used. Never
      // replace a password that may have been chosen through another path.
      accountCreated = false;
      await admin.from("web_funnel_plans").update({ account_created_by_funnel: false }).eq("id", planId).is("credentials_issued_at", null);
    }
  }
  const password = accountCreated ? await deriveSixDigitPassword(planId, Deno.env.get("FUNNEL_PASSWORD_SECRET") ?? "") : null;
  try {
    if (accountCreated) {
      const { error } = await admin.auth.admin.updateUserById(userId, { password: password! });
      if (error) throw error;
    }
    const sent = await sendResend(email, password, accountCreated, Deno.env.get("RESEND_API_KEY") ?? "", Deno.env.get("BRAINY_FROM_EMAIL") ?? "", planId);
    if (!sent.accepted) throw new Error("resend_not_accepted");
    const { error: markIssuedError } = await admin.from("web_funnel_plans").update({ credentials_issued_at: new Date().toISOString(), credentials_email_id: sent.id, credentials_email_status: "sent", credentials_issuing_started_at: null }).eq("id", planId).is("credentials_issued_at", null);
    if (markIssuedError) throw markIssuedError;
    return { ok: true, status: "sent" };
  } catch (_error) {
    // Resend was not accepted: leave issued_at NULL so retry is allowed. HMAC makes
    // a retry use the same password, while no password is stored in the database.
    await admin.from("web_funnel_plans").update({ credentials_issuing_started_at: null }).eq("id", planId).is("credentials_issued_at", null);
    return { ok: false, status: "retryable" };
  }
}
