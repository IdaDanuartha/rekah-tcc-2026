import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BpbdCategory, DropStatus, ReportStatus } from "@/lib/types";

// =============================================
// Data PUBLIK untuk peta transparansi. HANYA field aman —
// tanpa nomor telepon, tanpa teks laporan mentah (privasi pelapor).
// =============================================

export type VillageDropStatus = "none" | DropStatus;

export interface PublicVillage {
  id: string;
  name: string;
  district: string;
  regency: string;
  category: BpbdCategory | null;
  lat: number | null;
  lng: number | null;
  dropStatus: VillageDropStatus;
  lastDroppingAt: string | null;
  activeReports: number;
  confirmedReceipts: number;
}

export interface PublicMapData {
  villages: PublicVillage[];
  stats: {
    totalDesa: number;
    krisis: number;
    sudahDropping: number;
    dikonfirmasiWarga: number;
    laporanAktif: number;
  };
  generatedAt: string;
}

// =============================================
// Direktori publik "Desa terdampak" (kartu landing). Field aman saja.
// =============================================

export interface PublicDirectoryVillage {
  id: string;
  name: string;
  district: string;
  regency: string;
  category: BpbdCategory | null;
  status: ReportStatus; // status ringkas desa (untuk badge)
  skor: number | null;
  kk: number | null;
  durasiHari: number | null;
  progress: number; // % air tersalur (0-100)
  lastDroppingAt: string | null;
}

export async function getPublicDirectory(): Promise<PublicDirectoryVillage[]> {
  const supabase = createAdminClient();
  const [{ data: villages }, { data: reports }, { data: schedules }] = await Promise.all([
    supabase
      .from("villages")
      .select("id, name, district, regency, bpbd_category, last_dropping_at"),
    supabase
      .from("reports")
      .select("village_id, status, estimated_households, duration_days, priority_scores(score)"),
    supabase.from("drop_schedules").select("village_id, status, date"),
  ]);

  type Rep = {
    village_id: string | null;
    status: ReportStatus;
    estimated_households: number | null;
    duration_days: number | null;
    priority_scores: { score: number }[] | null;
  };
  type Sch = { village_id: string | null; status: DropStatus; date: string };
  const repRows = (reports ?? []) as Rep[];
  const schRows = (schedules ?? []) as Sch[];

  const latestSchedule = new Map<string, Sch>();
  for (const s of schRows) {
    if (!s.village_id) continue;
    const cur = latestSchedule.get(s.village_id);
    if (!cur || new Date(s.date) > new Date(cur.date)) latestSchedule.set(s.village_id, s);
  }

  const progressOf = (drop: DropStatus | "none", lastDrop: string | null): number => {
    if (drop === "done" || lastDrop) return 100;
    if (drop === "in_transit") return 65;
    if (drop === "scheduled") return 30;
    return 0;
  };

  const list = ((villages ?? []) as {
    id: string;
    name: string;
    district: string;
    regency: string;
    bpbd_category: BpbdCategory | null;
    last_dropping_at: string | null;
  }[]).map<PublicDirectoryVillage>((v) => {
    const vReports = repRows.filter((r) => r.village_id === v.id);
    const drop = latestSchedule.get(v.id)?.status ?? "none";
    const maxOf = (pick: (r: Rep) => number | null | undefined) =>
      vReports.reduce<number | null>((acc, r) => {
        const n = pick(r);
        return n != null ? Math.max(acc ?? 0, n) : acc;
      }, null);

    // Status ringkas desa untuk badge.
    let status: ReportStatus;
    if (drop === "done" || v.last_dropping_at) status = "done";
    else if (drop === "in_transit" || drop === "scheduled") status = "scheduled";
    else if (vReports.some((r) => r.status === "verified")) status = "verified";
    else status = "pending";

    return {
      id: v.id,
      name: v.name,
      district: v.district,
      regency: v.regency,
      category: v.bpbd_category,
      status,
      skor: maxOf((r) => r.priority_scores?.[0]?.score),
      kk: maxOf((r) => r.estimated_households),
      durasiHari: maxOf((r) => r.duration_days),
      progress: progressOf(drop, v.last_dropping_at),
      lastDroppingAt: v.last_dropping_at,
    };
  });

  // Urut: kritis dulu, lalu skor tertinggi.
  const rank: Record<string, number> = { kritis: 0, langka: 1, terbatas: 2 };
  list.sort(
    (a, b) =>
      (rank[a.category ?? "z"] ?? 3) - (rank[b.category ?? "z"] ?? 3) ||
      (b.skor ?? 0) - (a.skor ?? 0),
  );

  return list;
}

export async function getPublicMap(): Promise<PublicMapData> {
  const supabase = createAdminClient();
  const [{ data: villages }, { data: reports }, { data: schedules }] = await Promise.all([
    supabase
      .from("villages")
      .select("id, name, district, regency, bpbd_category, lat, lng, last_dropping_at"),
    supabase.from("reports").select("village_id, status, received_ok"),
    supabase.from("drop_schedules").select("village_id, status, date"),
  ]);

  type Rep = { village_id: string | null; status: ReportStatus; received_ok: boolean | null };
  type Sch = { village_id: string | null; status: DropStatus; date: string };
  const repRows = (reports ?? []) as Rep[];
  const schRows = (schedules ?? []) as Sch[];

  // Status dropping terbaru per desa (by date).
  const latestSchedule = new Map<string, Sch>();
  for (const s of schRows) {
    if (!s.village_id) continue;
    const cur = latestSchedule.get(s.village_id);
    if (!cur || new Date(s.date) > new Date(cur.date)) latestSchedule.set(s.village_id, s);
  }

  const list: PublicVillage[] = ((villages ?? []) as {
    id: string;
    name: string;
    district: string;
    regency: string;
    bpbd_category: BpbdCategory | null;
    lat: number | null;
    lng: number | null;
    last_dropping_at: string | null;
  }[]).map((v) => {
    const vReports = repRows.filter((r) => r.village_id === v.id);
    return {
      id: v.id,
      name: v.name,
      district: v.district,
      regency: v.regency,
      category: v.bpbd_category,
      lat: v.lat,
      lng: v.lng,
      dropStatus: latestSchedule.get(v.id)?.status ?? "none",
      lastDroppingAt: v.last_dropping_at,
      activeReports: vReports.filter((r) => r.status !== "done").length,
      confirmedReceipts: vReports.filter((r) => r.received_ok === true).length,
    };
  });

  const stats = {
    totalDesa: list.length,
    krisis: list.filter((v) => v.category === "kritis").length,
    sudahDropping: list.filter((v) => v.lastDroppingAt != null || v.dropStatus === "done").length,
    dikonfirmasiWarga: list.reduce((a, v) => a + v.confirmedReceipts, 0),
    laporanAktif: list.reduce((a, v) => a + v.activeReports, 0),
  };

  // Urut: krisis dulu, lalu paling banyak laporan aktif.
  const rank: Record<string, number> = { kritis: 0, langka: 1, terbatas: 2 };
  list.sort(
    (a, b) =>
      (rank[a.category ?? "z"] ?? 3) - (rank[b.category ?? "z"] ?? 3) ||
      b.activeReports - a.activeReports
  );

  return { villages: list, stats, generatedAt: new Date().toISOString() };
}
