import { NextRequest, NextResponse } from "next/server";
import { generateAICompletion } from "@/lib/ai";

// =============================================
// AI Skoring Prioritas
// Input: data terstruktur laporan + histori + kategori BPBD
// Output: skor 0-100 + alasan tertulis
// Ref: PRD section 7, feature #5
//
// PENTING: Kategori resmi BPBD adalah bobot dominan (rule-based)
// supaya keputusan darurat tidak sepenuhnya bergantung AI.
// =============================================

const BOBOT_KATEGORI_BPBD: Record<string, number> = {
  kritis: 40,
  langka: 25,
  terbatas: 10,
};

function hitungSkorRuleBased(data: {
  kategori_bpbd: string | null;
  estimasi_kk: number | null;
  durasi_hari: number | null;
  terakhir_dropping_at: string | null;
  harga_air?: number | null;
}): number {
  let skor = 0;

  // 1. Kategori BPBD (dominan, rule-based — max 40)
  skor += BOBOT_KATEGORI_BPBD[data.kategori_bpbd || ""] ?? 0;

  // 2. Durasi tanpa air (max 25)
  if (data.durasi_hari) {
    const durasiSkor = Math.min(25, Math.floor(data.durasi_hari * 1.2));
    skor += durasiSkor;
  }

  // 3. Jumlah KK terdampak (max 15)
  if (data.estimasi_kk) {
    const kkSkor = Math.min(15, Math.floor(data.estimasi_kk / 35));
    skor += kkSkor;
  }

  // 4. Lama sejak dropping terakhir (max 10)
  if (data.terakhir_dropping_at) {
    const hariSejak = Math.floor(
      (Date.now() - new Date(data.terakhir_dropping_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const hariSkor = Math.min(10, Math.floor(hariSejak / 2));
    skor += hariSkor;
  } else {
    skor += 10; // belum pernah dropping = skor penuh
  }

  // 5. Sinyal harga air mandiri tinggi (max 10)
  if (data.harga_air && data.harga_air >= 250000) {
    skor += 10;
  }

  return Math.min(100, skor);
}

const SISTEM_SKORING = `Kamu adalah asisten prioritas dropping air bersih BPBD di Madura. 
Berikan alasan tertulis yang jelas, ringkas (3-4 kalimat), dan bisa diaudit manusia mengapa sebuah laporan mendapat skor tertentu.
Hindari bahasa teknis berlebihan. Tulis dalam Bahasa Indonesia formal.

Format output JSON:
{
  "alasan_teks": string,
  "faktor_utama": string[] (max 4 item, singkat)
}`;

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const skorRuleBased = hitungSkorRuleBased(data);

    let alasanTeks = "";
    let faktorUtama: string[] = [];
    let providerInfo = { provider: "Rule-based", model: "calculators" };

    if (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY) {
      const prompt = `Laporan kekeringan:
- Desa: ${data.desa || "tidak diketahui"}
- Kategori BPBD: ${data.kategori_bpbd || "tidak ada"}
- Estimasi KK terdampak: ${data.estimasi_kk || "tidak diketahui"}
- Durasi tanpa air: ${data.durasi_hari || "tidak diketahui"} hari
- Dropping terakhir: ${data.terakhir_dropping_at ? new Date(data.terakhir_dropping_at).toLocaleDateString("id-ID") : "belum pernah"}
- Harga air mandiri: ${data.harga_air ? `Rp${data.harga_air.toLocaleString("id-ID")}` : "tidak dilaporkan"}

Skor yang dihitung sistem: ${skorRuleBased}/100

Berikan alasan mengapa skor ini layak.`;

      const completion = await generateAICompletion({
        systemPrompt: SISTEM_SKORING,
        prompt,
        jsonMode: true,
      });

      providerInfo = { provider: completion.provider, model: completion.model };
      const jsonMatch = completion.text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        alasanTeks = parsed.alasan_teks || "";
        faktorUtama = parsed.faktor_utama || [];
      }
    } else {
      alasanTeks = `Kategori resmi BPBD '${data.kategori_bpbd || "tidak ada"}' memberikan kontribusi terbesar pada skor. Durasi ${data.durasi_hari || 0} hari tanpa air bersih menunjukkan urgensi yang signifikan. Estimasi ${data.estimasi_kk || 0} KK terdampak turut meningkatkan prioritas penanganan.`;
      faktorUtama = [
        `Kategori BPBD: ${data.kategori_bpbd || "-"}`,
        `Durasi: ${data.durasi_hari || 0} hari`,
        `${data.estimasi_kk || 0} KK terdampak`,
      ];
    }

    return NextResponse.json({
      skor: skorRuleBased,
      alasan_teks: alasanTeks,
      faktor_utama: faktorUtama,
      provider: providerInfo.provider,
      model: providerInfo.model,
      breakdown: {
        kategori_bpbd: BOBOT_KATEGORI_BPBD[data.kategori_bpbd || ""] ?? 0,
        durasi: Math.min(25, Math.floor((data.durasi_hari || 0) * 1.2)),
        estimasi_kk: Math.min(15, Math.floor((data.estimasi_kk || 0) / 35)),
        sejak_dropping: data.terakhir_dropping_at ? Math.min(10, Math.floor((Date.now() - new Date(data.terakhir_dropping_at).getTime()) / (1000 * 60 * 60 * 24 * 2))) : 10,
        sinyal_harga: data.harga_air >= 250000 ? 10 : 0,
      },
    });
  } catch (err) {
    console.error("[AI Skoring Error]", err);
    return NextResponse.json(
      { error: "Gagal menghitung skor", detail: String(err) },
      { status: 500 }
    );
  }
}
