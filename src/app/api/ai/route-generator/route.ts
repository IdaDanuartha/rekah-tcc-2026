import { NextRequest, NextResponse } from "next/server";
import { generateAICompletion } from "@/lib/ai";

// =============================================
// Generator Rute Dropping
// Input: daftar desa + kapasitas armada
// Output: urutan kunjungan optimal
// Ref: PRD feature #8, section 6.1 step 7
// =============================================

interface DesaInput {
  desa_id: string;
  nama: string;
  kecamatan: string;
  koordinat_lat: number | null;
  koordinat_lng: number | null;
  estimasi_kk: number;
  skor_prioritas: number;
}

const SISTEM_RUTE = `Kamu adalah optimizer rute dropping air bersih untuk BPBD di Madura.
Tugasmu menyusun urutan kunjungan armada yang mempertimbangkan:
1. Skor prioritas desa (bobot utama)
2. Estimasi volume kebutuhan per desa (estimasi_kk × 20 liter = kebutuhan)
3. Kapasitas tangki per rit

Kapasitas standar tangki air = 5.000 liter per rit.
Satu KK membutuhkan sekitar 20 liter air bersih.

Output JSON:
{
  "urutan": [
    {
      "urutan_ke": number,
      "desa_id": string,
      "nama_desa": string,
      "kecamatan": string,
      "estimasi_kk": number,
      "volume_liter": number,
      "alasan": string (singkat, 1 kalimat)
    }
  ],
  "total_liter": number,
  "estimasi_waktu_jam": number,
  "catatan": string
}

Jika total kebutuhan melebihi kapasitas per rit, bagi menjadi beberapa rit yang ditunjukkan di catatan.`;

export async function POST(request: NextRequest) {
  try {
    const {
      desa_list,
      kapasitas_liter = 5000,
    }: { desa_list: DesaInput[]; kapasitas_liter?: number } = await request.json();

    if (!desa_list || !Array.isArray(desa_list) || desa_list.length === 0) {
      return NextResponse.json(
        { error: "Daftar desa diperlukan" },
        { status: 400 }
      );
    }

    const sorted = [...desa_list].sort(
      (a, b) => b.skor_prioritas - a.skor_prioritas
    );

    if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json(mockGeneratorRute(sorted, kapasitas_liter));
    }

    const prompt = `Daftar desa yang perlu dilayani (sudah diurutkan berdasarkan skor prioritas):
${sorted
  .map(
    (d, i) =>
      `${i + 1}. ${d.nama} (Kec. ${d.kecamatan}) — Skor: ${d.skor_prioritas}, KK: ${d.estimasi_kk}, Kebutuhan: ${d.estimasi_kk * 20} L`
  )
  .join("\n")}

Kapasitas tangki: ${kapasitas_liter.toLocaleString("id-ID")} liter per rit.

Susun rute optimal untuk satu rit armada.`;

    const completion = await generateAICompletion({
      systemPrompt: SISTEM_RUTE,
      prompt,
      jsonMode: true,
    });

    const jsonMatch = completion.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Respons AI tidak berisi JSON valid");

    const result = JSON.parse(jsonMatch[0]);

    result.urutan = result.urutan?.map((item: Record<string, unknown>, idx: number) => ({
      ...item,
      desa_id: sorted[idx]?.desa_id || item.desa_id,
    }));

    return NextResponse.json({
      ...result,
      provider: completion.provider,
      model: completion.model,
    });
  } catch (err) {
    console.error("[Generator Rute Error]", err);
    return NextResponse.json(
      { error: "Gagal generate rute", detail: String(err) },
      { status: 500 }
    );
  }
}

function mockGeneratorRute(sorted: DesaInput[], kapasitas_liter: number) {
  let sisa = kapasitas_liter;
  const urutan = [];

  for (const desa of sorted) {
    const kebutuhan = Math.min(desa.estimasi_kk * 20, kapasitas_liter);
    if (sisa <= 0) break;

    const volume = Math.min(kebutuhan, sisa);
    urutan.push({
      urutan_ke: urutan.length + 1,
      desa_id: desa.desa_id,
      nama_desa: desa.nama,
      kecamatan: desa.kecamatan,
      estimasi_kk: desa.estimasi_kk,
      volume_liter: volume,
      alasan: `Skor prioritas ${desa.skor_prioritas} — urgensi ${desa.skor_prioritas >= 70 ? "tinggi" : "menengah"}`,
    });
    sisa -= volume;
  }

  const totalLiter = urutan.reduce((s, d) => s + d.volume_liter, 0);

  return {
    urutan,
    total_liter: totalLiter,
    estimasi_waktu_jam: Math.ceil(urutan.length * 1.5),
    catatan:
      sorted.length > urutan.length
        ? `${sorted.length - urutan.length} desa tidak terlayani rit ini, diperlukan rit tambahan.`
        : "Semua desa terlayani dalam satu rit.",
    provider: "Mock",
    model: "demo-fallback",
  };
}
