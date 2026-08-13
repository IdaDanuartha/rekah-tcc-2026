import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAICompletion } from "@/lib/ai";
import type { BpbdCategory, ReportStatus } from "@/lib/types";

// =============================================
// Early-warning kekeringan — prediksi desa mana yang AKAN krisis.
// Rule-based (bisa diaudit) + narasi AI (opsional). Bergeser dari reaktif
// (menunggu laporan) ke proaktif (antisipasi sebelum krisis).
// =============================================

const CAT_WEIGHT: Record<BpbdCategory, number> = { kritis: 40, langka: 25, terbatas: 10 };

// Siklus tipikal: sebuah desa mulai krisis ~14 hari setelah dropping terakhir.
const CRISIS_CYCLE_DAYS = 14;

export type RiskLevel = "tinggi" | "sedang" | "rendah";

export interface RiskVillage {
  id: string;
  name: string;
  district: string;
  regency: string;
  category: BpbdCategory | null;
  risk: number; // 0-100
  level: RiskLevel;
  daysSinceDrop: number | null; // null = belum pernah dropping
  activeReports: number;
  avgDurationDays: number | null;
  etaDays: number; // prediksi hari menuju krisis (0 = sudah/segera)
  reason: string;
}

export interface EarlyWarning {
  villages: RiskVillage[];
  insight: string | null;
  generatedAt: string;
}

function levelOf(risk: number): RiskLevel {
  if (risk >= 70) return "tinggi";
  if (risk >= 45) return "sedang";
  return "rendah";
}

export async function getEarlyWarning(): Promise<EarlyWarning> {
  const supabase = createAdminClient();
  const [{ data: villages }, { data: reports }] = await Promise.all([
    supabase
      .from("villages")
      .select("id, name, district, regency, bpbd_category, last_dropping_at"),
    supabase.from("reports").select("village_id, status, duration_days, created_at"),
  ]);

  type Rep = {
    village_id: string | null;
    status: ReportStatus;
    duration_days: number | null;
    created_at: string;
  };
  const repRows = (reports ?? []) as Rep[];

  const now = Date.now();
  const DAY = 86_400_000;

  const scored: RiskVillage[] = ((villages ?? []) as {
    id: string;
    name: string;
    district: string;
    regency: string;
    bpbd_category: BpbdCategory | null;
    last_dropping_at: string | null;
  }[]).map((v) => {
    const vReports = repRows.filter((r) => r.village_id === v.id);
    const activeReports = vReports.filter((r) => r.status !== "done").length;
    const durations = vReports
      .map((r) => r.duration_days)
      .filter((d): d is number => typeof d === "number");
    const avgDurationDays =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;

    const daysSinceDrop = v.last_dropping_at
      ? Math.floor((now - new Date(v.last_dropping_at).getTime()) / DAY)
      : null;

    // Skor rule-based (maks di-cap 100).
    const catScore = v.bpbd_category ? CAT_WEIGHT[v.bpbd_category] : 15;
    const dropScore = daysSinceDrop == null ? 30 : Math.min(30, daysSinceDrop);
    const demandScore = Math.min(20, activeReports * 7);
    const durationScore = avgDurationDays ? Math.min(20, avgDurationDays) : 0;
    const risk = Math.min(100, catScore + dropScore + demandScore + durationScore);

    // Prediksi hari menuju krisis.
    const etaDays =
      risk >= 70
        ? 0
        : daysSinceDrop == null
          ? 0
          : Math.max(0, CRISIS_CYCLE_DAYS - daysSinceDrop);

    const bits: string[] = [];
    bits.push(`kategori BPBD ${v.bpbd_category ?? "belum ditetapkan"}`);
    bits.push(
      daysSinceDrop == null
        ? "belum pernah menerima dropping"
        : `dropping terakhir ${daysSinceDrop} hari lalu`
    );
    if (activeReports > 0) bits.push(`${activeReports} laporan aktif`);
    if (avgDurationDays) bits.push(`rata-rata ${avgDurationDays} hari tanpa air`);
    const reason = `Risiko ${levelOf(risk)}: ${bits.join(", ")}.`;

    return {
      id: v.id,
      name: v.name,
      district: v.district,
      regency: v.regency,
      category: v.bpbd_category,
      risk,
      level: levelOf(risk),
      daysSinceDrop,
      activeReports,
      avgDurationDays,
      etaDays,
      reason,
    };
  });

  scored.sort((a, b) => b.risk - a.risk);

  const insight = await generateInsight(scored.slice(0, 5));

  return { villages: scored, insight, generatedAt: new Date().toISOString() };
}

// Narasi AI singkat untuk petugas BPBD (1 panggilan, opsional).
async function generateInsight(top: RiskVillage[]): Promise<string | null> {
  if (top.length === 0) return null;
  if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) return null;

  const daftar = top
    .map(
      (v, i) =>
        `${i + 1}. ${v.name}, ${v.district} — risiko ${v.risk}/100, ${
          v.daysSinceDrop == null ? "belum pernah dropping" : `dropping ${v.daysSinceDrop} hari lalu`
        }, ${v.activeReports} laporan aktif, prediksi krisis dalam ${v.etaDays} hari.`
    )
    .join("\n");

  try {
    const { text } = await generateAICompletion({
      systemPrompt:
        "Kamu analis BPBD Madura. Dari data risiko kekeringan desa, tulis 2-3 kalimat rekomendasi tindakan proaktif (desa mana diprioritaskan dropping preventif, kenapa). Bahasa Indonesia formal, ringkas, bisa diaudit. Jangan mengarang angka di luar data.",
      prompt: `Data risiko (urut tertinggi):\n${daftar}\n\nBerikan rekomendasi tindakan proaktif.`,
    });
    return text.trim() || null;
  } catch (e) {
    console.error("[early-warning] insight gagal:", e);
    return null;
  }
}
