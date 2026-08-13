import { NextRequest, NextResponse } from "next/server";
import { kirimWA } from "@/lib/wa";
import { normalizePhone } from "@/lib/reporter-session";
import { transcribeAudioFromUrl } from "@/lib/ai";
import { processIncomingReport } from "@/lib/report-intake";
import { buildReplyText } from "@/lib/reply";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseYaBelum, pendingConfirmationReport, setReceipt } from "@/lib/receipt";

const AUDIO_RE = /\.(ogg|oga|opus|mp3|m4a|aac|wav|amr)(\?|$)/i;

// Placeholder Fonnte untuk pesan non-teks (VN/gambar/dokumen/stiker/tombol).
// Di paket FREE, media tidak menyertakan URL — Fonnte kirim string ini saja.
const FONNTE_PLACEHOLDERS = new Set([
  "non-text message",
  "non-button message",
  "non-media message",
]);

// =============================================
// Fonnte WhatsApp Webhook
// Menerima pesan masuk dari nomor WA terdaftar
// Ref: PRD section 6.1 Flow A
// =============================================

// Fonnte memvalidasi webhook via GET — balas 200 agar URL diterima.
export async function GET() {
  return NextResponse.json({ ok: true, service: "rekah-fonnte-webhook" });
}

export async function POST(request: NextRequest) {
  try {
    // Verifikasi token Fonnte (opsional tapi dianjurkan)
    const authHeader = request.headers.get("authorization");
    if (
      process.env.FONNTE_WEBHOOK_SECRET &&
      authHeader !== `Bearer ${process.env.FONNTE_WEBHOOK_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Fonnte payload: { device, sender, message, name, member, location, url, extension, ... }
    const { sender } = body;
    if (!sender) {
      return NextResponse.json({ error: "Sender kosong" }, { status: 400 });
    }

    // Normalize nomor WA (hilangkan @s.whatsapp.net jika ada)
    const nomorFormatted = normalizePhone(
      String(sender).replace("@s.whatsapp.net", "")
    );

    // Teks laporan. Kalau kosong tapi ada VN/audio → transkrip jadi teks.
    let message: string = typeof body.message === "string" ? body.message.trim() : "";
    const mediaUrl: string | null = body.url || body.file || null;
    const looksAudio =
      !!mediaUrl &&
      (AUDIO_RE.test(String(mediaUrl)) ||
        /audio|voice|ptt|ogg|opus/i.test(String(body.extension ?? body.type ?? "")));

    // VN/media dengan URL (paket berbayar Fonnte) → transkrip jadi teks.
    if ((!message || FONNTE_PLACEHOLDERS.has(message.toLowerCase())) && mediaUrl && looksAudio) {
      try {
        message = (await transcribeAudioFromUrl(String(mediaUrl))).trim();
        console.log("[Webhook] VN ditranskrip:", message.slice(0, 80));
      } catch (e) {
        console.error("[Webhook] transkrip VN gagal:", e);
      }
    }

    // Placeholder Fonnte (media tanpa URL, paket free) → anggap tak ada teks.
    if (FONNTE_PLACEHOLDERS.has(message.toLowerCase())) message = "";

    // Tidak ada teks (VN/gambar/dokumen tanpa URL) → minta kirim teks, jangan buat laporan.
    if (!message) {
      await kirimWA(
        nomorFormatted,
        "Maaf, laporan berupa pesan suara/gambar/dokumen belum bisa diproses otomatis. Mohon *ketik* laporan Anda dalam teks: nama desa, jumlah KK terdampak, dan sudah berapa lama air kering."
      );
      return NextResponse.json({ ok: false, reason: "media_no_text" });
    }

    // Konfirmasi penerimaan air (YA/BELUM) untuk laporan yang sudah 'done'.
    // Cek dulu sebelum intake supaya "ya"/"belum" tak jadi laporan baru.
    const jawab = parseYaBelum(message);
    if (jawab !== null) {
      const supabase = createAdminClient();
      const pending = await pendingConfirmationReport(supabase, nomorFormatted);
      if (pending) {
        await setReceipt(supabase, pending.id, jawab);
        await kirimWA(
          nomorFormatted,
          jawab
            ? "Terima kasih. Konfirmasi *air diterima* sudah kami catat sebagai bukti penyaluran. 🙏"
            : "Baik, kami catat air *belum diterima*. Petugas BPBD akan menindaklanjuti secepatnya."
        );
        return NextResponse.json({ ok: true, reason: "receipt_confirmed", received_ok: jawab });
      }
      // Tak ada laporan menunggu konfirmasi → lanjut ke intake biasa.
    }

    // Proses lewat pipeline bersama (match desa, threading, ekstraksi, filter, skor).
    const result = await processIncomingReport({
      phone: nomorFormatted,
      text: message,
      source: "wa",
    });

    if (result.kind === "out_of_context") {
      await kirimWA(
        nomorFormatted,
        "Halo! Nomor ini khusus *laporan kekeringan air bersih* di Madura. Jika Anda ingin melapor, kirim: nama desa, jumlah KK terdampak, dan sudah berapa lama air kering."
      );
      return NextResponse.json({ ok: false, reason: "out_of_context" });
    }

    // Balasan WA (helper bersama). Field kurang → chatbot nanya lagi.
    const linkPortal = `${process.env.NEXT_PUBLIC_APP_URL}/portal`;
    await kirimWA(
      nomorFormatted,
      buildReplyText(result, { portalLink: linkPortal, suppressPriceAsk: result.priceResolved }),
    );

    return NextResponse.json({
      success: true,
      laporan_id: result.reportId,
      merged: result.merged,
      status_nomor: result.isRegistered ? "verified" : "unverified",
    });
  } catch (err) {
    console.error("[Fonnte Webhook Error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
