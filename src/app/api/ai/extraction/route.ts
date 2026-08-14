import { NextRequest, NextResponse } from "next/server";
import { generateAICompletion } from "@/lib/ai";

// =============================================
// AI Ekstraksi Laporan
// Input: teks bebas dari WA
// Output: JSON terstruktur sesuai schema laporan
// Model: OpenAI GPT-4o-mini (Primary) / Gemini Flash (Fallback)
// Ref: PRD section 7
// =============================================

const SISTEM_PROMPT = `Kamu adalah ekstraktor data laporan kekeringan di Madura. Tugasmu mengubah laporan tidak terstruktur dari kepala desa atau warga menjadi JSON terstruktur.

Laporan bisa dalam Bahasa Indonesia, Madura, atau campuran. Istilah yang perlu dikenali:
- "KK" atau "kepala keluarga" = jumlah keluarga terdampak
- "rit" = satu perjalanan tangki air
- Nama desa dan kecamatan di Madura: Sampang, Bangkalan

Format output JSON (gunakan null jika tidak ada informasi):
{
  "is_laporan_kekeringan": boolean,
  "desa": string | null,
  "kecamatan": string | null,
  "estimasi_kk": number | null,
  "durasi_hari": number | null,
  "indikator_urgensi": string[],
  "harga_air_per_tangki": number | null,
  "confidence": number (0.0-1.0),
  "butuh_klarifikasi": boolean,
  "pertanyaan_klarifikasi": string | null
}

Aturan:
- is_laporan_kekeringan = false jika pesan JELAS bukan laporan kekeringan/kebutuhan air bersih
  (mis. salam "halo/assalamualaikum", ucapan terima kasih, iklan/promo, pertanyaan umum, spam,
  obrolan tidak relevan). Set true jika pesan berisi keluhan/kebutuhan air bersih walau data belum lengkap.
- Jika is_laporan_kekeringan = false, field lain boleh null dan confidence rendah.
- Jika confidence < 0.7, set butuh_klarifikasi = true dan isi pertanyaan_klarifikasi
- indikator_urgensi berisi frasa kunci dari laporan (max 5 item)
- confidence mencerminkan seberapa yakin kamu dengan hasil ekstraksi
- harga_air_per_tangki = harga beli air mandiri per tangki/rit jika disebut. Konversi notasi uang ke rupiah penuh: "rb"/"ribu" = ×1000, "jt"/"juta" = ×1000000, "k" = ×1000. Contoh: "125rb" → 125000, "250 ribu" → 250000, "1,5jt" → 1500000, "rp 200.000" → 200000
- Jangan mengarang data yang tidak ada di laporan`;

export async function POST(request: NextRequest) {
  try {
    const { teks, nomor_wa, desa_hint } = await request.json();

    if (!teks || typeof teks !== "string") {
      return NextResponse.json(
        { error: "Teks laporan diperlukan" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      // Fallback mock untuk demo jika belum ada API Key
      return NextResponse.json(mockEkstraksi(teks));
    }

    const userMessage = desa_hint
      ? `Konteks: Laporan berasal dari desa dengan ID ${desa_hint}.\n\nLaporan:\n${teks}`
      : `Laporan:\n${teks}`;

    const completion = await generateAICompletion({
      systemPrompt: SISTEM_PROMPT,
      prompt: userMessage,
      jsonMode: true,
    });

    const jsonMatch = completion.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Respons AI tidak berisi JSON valid");
    }

    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      ...result,
      provider: completion.provider,
      model: completion.model,
    });
  } catch (err) {
    console.error("[AI Ekstraksi Error]", err);
    return NextResponse.json(
      { error: "Gagal memproses laporan", detail: String(err) },
      { status: 500 }
    );
  }
}

function mockEkstraksi(teks: string) {
  const kkMatch = teks.match(/(\d+)\s*(?:kk|kepala keluarga)/i);
  const hariMatch = teks.match(/(\d+)\s*(?:hari|minggu)/i);
  const airMatch = /air|kering|kemarau|sumur|dropping|tangki|bersih/i.test(teks);

  return {
    is_laporan_kekeringan: Boolean(kkMatch || hariMatch || airMatch),
    desa: null,
    kecamatan: null,
    estimasi_kk: kkMatch ? parseInt(kkMatch[1]) : null,
    durasi_hari: hariMatch
      ? parseInt(hariMatch[1]) * (teks.toLowerCase().includes("minggu") ? 7 : 1)
      : null,
    indikator_urgensi: ["laporan masuk", "butuh bantuan air"],
    harga_air_per_tangki: teks.includes("250.000") ? 250000 : null,
    confidence: 0.65,
    butuh_klarifikasi: true,
    pertanyaan_klarifikasi:
      "Nama desa dan kecamatan tidak terdeteksi. Mohon sebutkan nama desa dan kecamatan Anda.",
    provider: "Mock",
    model: "demo-fallback",
  };
}
