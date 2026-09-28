export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function deriveSixDigitPassword(planId: string, secret: string): Promise<string> {
  if (!secret) throw new Error("FUNNEL_PASSWORD_SECRET is required");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(planId)));
  const number = new DataView(signature.buffer).getUint32(0) % 1_000_000;
  return number.toString().padStart(6, "0");
}
