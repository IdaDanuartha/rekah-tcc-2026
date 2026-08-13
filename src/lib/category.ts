import type { BpbdCategory } from "@/lib/types";

// =============================================
// Saran kategori BPBD dari data laporan (heuristik, bukan penentu final).
// Petugas tetap memutuskan; ini cuma rekomendasi sistem.
// Faktor: durasi kering, jumlah KK, riwayat dropping.
// =============================================

export interface CategorySuggestion {
  category: BpbdCategory;
  reason: string;
}

export function suggestCategory(input: {
  kk: number | null;
  durasiHari: number | null;
  lastDroppingAt: string | null;
  activeReports: number;
}): CategorySuggestion | null {
  const { kk, durasiHari, lastDroppingAt, activeReports } = input;
  // Tanpa laporan & tanpa data → tak bisa menyarankan.
  if (activeReports === 0 && kk == null && durasiHari == null) return null;

  const d = durasiHari ?? 0;
  const k = kk ?? 0;
  const neverDropped = !lastDroppingAt;

  let pts = 0;
  if (d >= 14) pts += 2;
  else if (d >= 7) pts += 1;
  if (k >= 400) pts += 2;
  else if (k >= 200) pts += 1;
  if (neverDropped && (d >= 10 || k >= 300)) pts += 1;

  const category: BpbdCategory = pts >= 3 ? "kritis" : pts >= 1 ? "langka" : "terbatas";

  const bits = [`${d} hari kering`, `${k.toLocaleString("id-ID")} KK`];
  if (neverDropped) bits.push("belum pernah dropping");
  return { category, reason: bits.join(" · ") };
}
