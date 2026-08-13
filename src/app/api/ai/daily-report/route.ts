import { NextRequest, NextResponse } from "next/server";
import { generateAICompletion } from "@/lib/ai";

// =============================================
// Laporan Harian Otomatis
// Input: data agregat harian dari Supabase
// Output: draf narasi laporan resmi
// Model: OpenAI GPT-4o-mini (Primary) / Gemini Flash Cascade (Fallback)
// Ref: PRD feature #13, section 6.3 Flow C
// =============================================

const SISTEM_LAPORAN = `Kamu adalah asisten penyusun laporan resmi BPBD. 
Tugasmu menyusun draf laporan harian dropping air bersih yang formal, akurat, dan siap dikirim ke Bupati/Pemprov.

Format laporan:
- Judul resmi
- Tanggal dan lokasi
- Ringkasan pelaksanaan
- Daftar desa yang dilayani (dengan detail armada dan volume)
- Kendala yang dicatat
- Status antrean yang masih aktif
- Rekomendasi tindak lanjut (jika ada)

Gunakan Bahasa Indonesia formal. Hindari singkatan tidak baku. 
Tambahkan catatan bahwa laporan ini adalah draf otomatis dan perlu tinjauan petugas.`;

interface AgregatHarian {
  tanggal: string;
  kabupaten: string[];
  desa_dilayani: {
    nama: string;
    kecamatan: string;
    kabupaten: string;
    armada: string;
    volume_liter: number;
    status: string;
  }[];
  total_liter: number;
  total_kk_terbantu: number;
  kendala: string | null;
  desa_antrean: {
    nama: string;
    kecamatan: string;
    skor: number;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const agregat: AgregatHarian = await request.json();

    if (!agregat.tanggal || !agregat.desa_dilayani) {
      return NextResponse.json(
        { error: "Data agregat tidak lengkap" },
        { status: 400 }
      );
    }

    const tanggalFormatted = new Date(agregat.tanggal).toLocaleDateString(
      "id-ID",
      { weekday: "long", year: "numeric", month: "long", day: "numeric" }
    );

    if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        draft: mockDraftLaporan(agregat, tanggalFormatted),
        provider: "Mock",
        model: "demo-fallback",
      });
    }

    const prompt = `Data agregat harian untuk laporan:

Tanggal: ${tanggalFormatted}
Kabupaten yang dilayani: ${agregat.kabupaten.join(", ")}

DESA YANG DILAYANI (${agregat.desa_dilayani.length} desa):
${agregat.desa_dilayani
  .map(
    (d, i) =>
      `${i + 1}. ${d.nama}, Kec. ${d.kecamatan}, Kab. ${d.kabupaten} — Armada: ${d.armada}, Volume: ${d.volume_liter.toLocaleString("id-ID")} liter`
  )
  .join("\n")}

Total liter disalurkan: ${agregat.total_liter.toLocaleString("id-ID")} liter
Estimasi KK terbantu: ${agregat.total_kk_terbantu.toLocaleString("id-ID")} KK

KENDALA:
${agregat.kendala || "Tidak ada kendala yang dilaporkan."}

DESA MASIH DALAM ANTREAN (${agregat.desa_antrean.length} desa):
${agregat.desa_antrean
  .map((d) => `- ${d.nama}, Kec. ${d.kecamatan} (skor prioritas: ${d.skor})`)
  .join("\n")}

Susun draf laporan resmi berdasarkan data di atas.`;

    const completion = await generateAICompletion({
      systemPrompt: SISTEM_LAPORAN,
      prompt,
    });

    return NextResponse.json({
      draft: completion.text,
      provider: completion.provider,
      model: completion.model,
    });
  } catch (err) {
    console.error("[Laporan Harian Error]", err);
    return NextResponse.json(
      { error: "Gagal generate laporan", detail: String(err) },
      { status: 500 }
    );
  }
}

function mockDraftLaporan(agregat: AgregatHarian, tanggalFormatted: string) {
  return `LAPORAN HARIAN KOORDINASI AIR BERSIH
Tanggal: ${tanggalFormatted}
Kabupaten: ${agregat.kabupaten.join(" dan ")}

RINGKASAN PELAKSANAAN

Pada hari ${tanggalFormatted}, telah dilaksanakan dropping air bersih ke ${agregat.desa_dilayani.length} desa terdampak kekeringan di ${agregat.kabupaten.join(" dan ")} dengan total volume ${agregat.total_liter.toLocaleString("id-ID")} liter, melayani estimasi ${agregat.total_kk_terbantu.toLocaleString("id-ID")} kepala keluarga.

DESA YANG DILAYANI

${agregat.desa_dilayani
  .map(
    (d, i) =>
      `${i + 1}. ${d.nama}, Kec. ${d.kecamatan}, Kab. ${d.kabupaten}\n   Armada: ${d.armada}, Volume: ${d.volume_liter.toLocaleString("id-ID")} liter`
  )
  .join("\n\n")}

KENDALA

${agregat.kendala || "Tidak ada kendala yang dilaporkan pada hari ini."}

ANTREAN MASIH AKTIF

Terdapat ${agregat.desa_antrean.length} desa yang masih dalam antrean dan belum mendapat layanan pada hari ini, dengan rincian sebagai berikut:
${agregat.desa_antrean
  .map((d) => `- ${d.nama}, Kec. ${d.kecamatan} (skor prioritas: ${d.skor}/100)`)
  .join("\n")}

REKOMENDASI

Penanganan segera diperlukan untuk desa-desa dengan skor prioritas tinggi yang belum terlayani.

---
Dibuat otomatis oleh sistem Rekah.
Petugas BPBD wajib meninjau dan menyunting sebelum pengiriman resmi ke pimpinan.`;
}
