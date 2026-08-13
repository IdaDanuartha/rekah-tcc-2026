// =============================================
// Fonnte WhatsApp — helper kirim pesan (server-only)
// =============================================

export async function kirimWA(
  to: string,
  message: string
): Promise<{ ok: boolean; detail?: unknown }> {
  // Fonnte /send butuh TOKEN DEVICE (per WhatsApp yang konek), bukan token akun.
  // Utamakan FONNTE_DEVICE_TOKEN; FONNTE_API_KEY hanya fallback.
  const apiKey = process.env.FONNTE_DEVICE_TOKEN || process.env.FONNTE_API_KEY;
  if (!apiKey) {
    console.warn("[Fonnte] FONNTE_DEVICE_TOKEN / FONNTE_API_KEY belum dikonfigurasi");
    return { ok: false, detail: "no_api_key" };
  }

  // Fonnte butuh target tanpa "+" (mis. 62812xxxx), bukan +62812xxxx.
  const target = to.replace(/\D/g, "");

  try {
    // Fonnte /send butuh form-encoded (x-www-form-urlencoded), BUKAN JSON.
    // Kirim JSON → body tak ter-parse → "invalid/empty body value".
    const body = new URLSearchParams({ target, message });

    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: apiKey },
      body,
    });
    const result = await res.json();
    if (!result.status) {
      console.error("[Fonnte] Gagal kirim:", result);
      return { ok: false, detail: result };
    }
    return { ok: true, detail: result };
  } catch (err) {
    console.error("[Fonnte] Error kirim WA:", err);
    return { ok: false, detail: String(err) };
  }
}

// SHA-256 hex — untuk menyimpan hash kode OTP (bukan plaintext)
export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
