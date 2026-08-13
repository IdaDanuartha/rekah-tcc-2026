import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { kirimWA, sha256Hex } from "@/lib/wa";
import { normalizePhone } from "@/lib/reporter-session";

// =============================================
// POST /api/reporter/otp
// Body: { nomor: string }
// Generate kode OTP 6 digit, simpan hash, kirim via WhatsApp.
// =============================================

const OTP_TTL_MENIT = 5;
const RESEND_COOLDOWN_DETIK = 45;

export async function POST(request: NextRequest) {
  try {
    const { nomor } = await request.json();
    if (!nomor || typeof nomor !== "string") {
      return NextResponse.json({ error: "Nomor WA diperlukan" }, { status: 400 });
    }

    const nomorWa = normalizePhone(nomor);
    // Validasi kasar: +62 diikuti 8-13 digit
    if (!/^\+62\d{8,13}$/.test(nomorWa)) {
      return NextResponse.json(
        { error: "Format nomor WA tidak valid" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Rate limit: tolak jika ada OTP dibuat < cooldown terakhir
    const { data: last } = await supabase
      .from("reporter_otps")
      .select("created_at")
      .eq("phone", nomorWa)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (last) {
      const elapsed = (Date.now() - new Date(last.created_at).getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_DETIK) {
        return NextResponse.json(
          {
            error: `Mohon tunggu ${Math.ceil(
              RESEND_COOLDOWN_DETIK - elapsed
            )} detik sebelum meminta kode lagi.`,
          },
          { status: 429 }
        );
      }
    }

    const kode = String(Math.floor(100000 + Math.random() * 900000));
    const kodeHash = await sha256Hex(`${nomorWa}:${kode}`);
    const expiresAt = new Date(Date.now() + OTP_TTL_MENIT * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("reporter_otps").insert({
      phone: nomorWa,
      code_hash: kodeHash,
      expires_at: expiresAt,
    });
    if (insertError) throw insertError;

    const pesan = `Kode masuk Portal Rekah Anda: *${kode}*\n\nBerlaku ${OTP_TTL_MENIT} menit. Jangan bagikan kode ini ke siapa pun.`;
    const wa = await kirimWA(nomorWa, pesan);

    const demoAktif = Boolean(process.env.REPORTER_DEMO_OTP);

    // Jika WA gagal & bukan mode demo, beri tahu (kode tetap tersimpan)
    if (!wa.ok && !demoAktif) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[OTP kirim] Fonnte gagal:", wa.detail);
      }
      return NextResponse.json(
        {
          error:
            "Gagal mengirim kode via WhatsApp. Pastikan nomor terhubung WhatsApp aktif.",
          // Detail Fonnte hanya di non-produksi untuk memudahkan debug
          ...(process.env.NODE_ENV !== "production" ? { debug: wa.detail } : {}),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      nomor: nomorWa,
      expires_in: OTP_TTL_MENIT * 60,
      demo: demoAktif,
    });
  } catch (err) {
    console.error("[OTP kirim] error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengirim kode." },
      { status: 500 }
    );
  }
}
