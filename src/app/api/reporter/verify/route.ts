import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sha256Hex } from "@/lib/wa";
import {
  normalizePhone,
  createSessionToken,
  REPORTER_COOKIE,
  REPORTER_COOKIE_OPTIONS,
  REPORTER_UI_FLAG,
} from "@/lib/reporter-session";

// =============================================
// POST /api/reporter/verify
// Body: { nomor: string, kode: string }
// Verifikasi OTP → set cookie sesi pelapor.
// =============================================

const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    const { nomor, kode } = await request.json();
    if (!nomor || !kode) {
      return NextResponse.json(
        { error: "Nomor dan kode diperlukan" },
        { status: 400 }
      );
    }

    const nomorWa = normalizePhone(String(nomor));
    const kodeInput = String(kode).replace(/\D/g, "");

    // Jalur demo (juri tanpa akses WA): REPORTER_DEMO_OTP cocok → langsung sahkan
    const demoOtp = process.env.REPORTER_DEMO_OTP;
    if (demoOtp && kodeInput === demoOtp) {
      return await sukses(nomorWa);
    }

    const supabase = createAdminClient();
    const { data: otp } = await supabase
      .from("reporter_otps")
      .select("*")
      .eq("phone", nomorWa)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp) {
      return NextResponse.json(
        { error: "Kode tidak ditemukan. Minta kode baru." },
        { status: 400 }
      );
    }

    if (new Date(otp.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Kode sudah kedaluwarsa. Minta kode baru." },
        { status: 400 }
      );
    }

    if (otp.attempts >= MAX_ATTEMPTS) {
      await supabase.from("reporter_otps").update({ used: true }).eq("id", otp.id);
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Minta kode baru." },
        { status: 429 }
      );
    }

    const kodeHash = await sha256Hex(`${nomorWa}:${kodeInput}`);
    if (kodeHash !== otp.code_hash) {
      await supabase
        .from("reporter_otps")
        .update({ attempts: otp.attempts + 1 })
        .eq("id", otp.id);
      return NextResponse.json({ error: "Kode salah." }, { status: 400 });
    }

    // Sukses — tandai terpakai
    await supabase.from("reporter_otps").update({ used: true }).eq("id", otp.id);
    return await sukses(nomorWa);
  } catch (err) {
    console.error("[OTP verify] error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat verifikasi." },
      { status: 500 }
    );
  }
}

async function sukses(nomorWa: string) {
  const token = await createSessionToken(nomorWa);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(REPORTER_COOKIE, token, REPORTER_COOKIE_OPTIONS);
  // Penanda UI readable (bukan auth) agar landing bisa toggle tombol.
  res.cookies.set(REPORTER_UI_FLAG, "1", {
    ...REPORTER_COOKIE_OPTIONS,
    httpOnly: false,
  });
  return res;
}
