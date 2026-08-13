// =============================================
// Sesi pelapor — cookie ber-HMAC (Web Crypto, edge-safe)
// Dipakai di route handler (node) & middleware (edge).
// Format cookie: base64url(payload).base64url(hmac)
// payload = { nomor, exp }  (exp = epoch detik)
// =============================================

export const REPORTER_COOKIE = "rekah_reporter";
// Penanda UI (bukan auth) yang bisa dibaca client — untuk toggle tombol di landing.
export const REPORTER_UI_FLAG = "rekah_reporter_ui";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 hari

interface SessionPayload {
  nomor: string;
  exp: number;
}

function getSecret(): string {
  const secret =
    process.env.REPORTER_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  if (!secret) {
    throw new Error(
      "Sesi pelapor butuh REPORTER_SESSION_SECRET (atau SUPABASE_SERVICE_ROLE_KEY)"
    );
  }
  return secret;
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmac(data: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return new Uint8Array(sig);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function createSessionToken(nomor: string): Promise<string> {
  const payload: SessionPayload = {
    nomor,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };
  const payloadStr = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = b64urlEncode(await hmac(payloadStr));
  return `${payloadStr}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [payloadStr, sig] = token.split(".");
  if (!payloadStr || !sig) return null;

  try {
    const expected = await hmac(payloadStr);
    const provided = b64urlDecode(sig);
    if (!timingSafeEqual(expected, provided)) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(b64urlDecode(payloadStr))
    ) as SessionPayload;

    if (!payload.nomor || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export const REPORTER_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

// Normalisasi nomor WA ke format +62XXXXXXXXXX
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  if (!digits.startsWith("62")) digits = "62" + digits;
  return "+" + digits;
}

// Parse daftar nomor (pisah baris/koma/titik-koma) → array +62 unik.
// Baris dengan < 8 digit diabaikan (bukan nomor valid).
export function parsePhones(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const list = raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\D/g, "").length >= 8)
    .map(normalizePhone);
  return [...new Set(list)];
}
