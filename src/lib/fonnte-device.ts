import "server-only";

// =============================================
// Fonnte device management (status + QR reconnect).
// Endpoint /device & /qr pakai ACCOUNT token (FONNTE_API_KEY),
// beda dengan /send yang pakai DEVICE token (FONNTE_DEVICE_TOKEN).
// =============================================

// /device & /qr menargetkan satu device → pakai DEVICE token dulu (targetkan
// device itu), fallback ke account token.
const MGMT_TOKEN = process.env.FONNTE_DEVICE_TOKEN || process.env.FONNTE_API_KEY;

export interface DeviceInfo {
  ok: boolean;
  connected: boolean;
  device: string | null; // nomor WA device (bot)
  name: string | null;
  quota: number | null;
  messages: number | null;
  packageName: string | null;
  expired: string | null;
  error?: string;
}

async function fonntePost(path: string, body: Record<string, string>) {
  if (!MGMT_TOKEN) throw new Error("FONNTE token (device/account) belum dikonfigurasi");
  const res = await fetch(`https://api.fonnte.com/${path}`, {
    method: "POST",
    headers: { Authorization: MGMT_TOKEN },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  return res.json();
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  try {
    const d = await fonntePost("device", {});
    if (!d || d.status === false) {
      return {
        ok: false,
        connected: false,
        device: null,
        name: null,
        quota: null,
        messages: null,
        packageName: null,
        expired: null,
        error: d?.reason ?? "Gagal ambil status device",
      };
    }
    const num = String(d.device ?? "").replace(/\D/g, "") || null;
    return {
      ok: true,
      connected: String(d.device_status ?? "").toLowerCase() === "connect",
      device: num,
      name: d.name ?? null,
      quota: d.quota != null ? Number(d.quota) : null,
      messages: d.messages != null ? Number(d.messages) : null,
      packageName: d.package ?? null,
      expired: d.expired ?? null,
    };
  } catch (e) {
    return {
      ok: false,
      connected: false,
      device: null,
      name: null,
      quota: null,
      messages: null,
      packageName: null,
      expired: null,
      error: String(e),
    };
  }
}

export interface QRResult {
  ok: boolean;
  alreadyConnected: boolean;
  image: string | null; // data URI PNG
  error?: string;
}

export async function getReconnectQR(): Promise<QRResult> {
  try {
    const d = await fonntePost("qr", { type: "qr" });
    if (d?.status === true && d.url) {
      return { ok: true, alreadyConnected: false, image: `data:image/png;base64,${d.url}` };
    }
    if (String(d?.reason ?? "").toLowerCase().includes("already connect")) {
      return { ok: true, alreadyConnected: true, image: null };
    }
    return { ok: false, alreadyConnected: false, image: null, error: d?.reason ?? "Gagal ambil QR" };
  } catch (e) {
    return { ok: false, alreadyConnected: false, image: null, error: String(e) };
  }
}

// --- Nomor bot dinamis (cache 60 dtk) untuk landing/publik ---
let botCache: { number: string | null; at: number } | null = null;
const BOT_TTL_MS = 60_000;

export async function getBotNumber(): Promise<string | null> {
  if (botCache && Date.now() - botCache.at < BOT_TTL_MS) return botCache.number;
  const info = await getDeviceInfo();
  const number = info.device ?? process.env.NEXT_PUBLIC_WA_NUMBER?.replace(/\D/g, "") ?? null;
  botCache = { number, at: Date.now() };
  return number;
}
