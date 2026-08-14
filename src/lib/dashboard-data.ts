import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, parsePhones } from "@/lib/reporter-session";
import { suggestCategory } from "@/lib/category";
import type { BpbdCategory, ReportStatus, DropStatus, ReportSource } from "@/lib/types";

// =============================================
// Dashboard petugas — server data layer (service role)
// SLA eskalasi: laporan 'pending' lebih tua dari 12 jam.
// =============================================

const SLA_HOURS = 12;

export interface VillageBrief {
  id: string;
  name: string;
  district: string;
  regency: string;
  bpbd_category: BpbdCategory | null;
  registered_phone?: string | null;
}

export interface ReportListItem {
  id: string;
  raw_text: string;
  status: ReportStatus;
  source: ReportSource;
  phone: string | null;
  phone_verification_status: "verified" | "unverified" | null;
  // Dihitung LIVE: nomor pelapor cocok dengan registered_phone desa saat ini.
  // Selalu akurat meski nomor ditambah ke desa setelah laporan masuk.
  phoneVerified: boolean;
  estimated_households: number | null;
  duration_days: number | null;
  ai_confidence: number | null;
  created_at: string;
  villages: VillageBrief | null;
  priority_scores: { score: number }[] | null;
  escalated: boolean;
}

const REPORT_SELECT =
  "id, raw_text, status, source, phone, phone_verification_status, estimated_households, duration_days, ai_confidence, created_at, villages(id, name, district, regency, bpbd_category, registered_phone), priority_scores(score)";

function isEscalated(status: ReportStatus, createdAt: string): boolean {
  if (status !== "pending") return false;
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  return ageHours > SLA_HOURS;
}

// Verifikasi nomor live: tersimpan 'verified' ATAU nomor pelapor kini terdaftar
// di desa terkait. OR agar penambahan nomor belakangan ikut terhitung.
function isPhoneVerified(
  phone: string | null,
  storedStatus: "verified" | "unverified" | null,
  village: VillageBrief | null,
): boolean {
  if (storedStatus === "verified") return true;
  if (!phone || !village?.registered_phone) return false;
  return parsePhones(village.registered_phone).includes(normalizePhone(phone));
}

export async function listReports(filter?: {
  status?: ReportStatus;
  villageId?: string;
}): Promise<ReportListItem[]> {
  const supabase = createAdminClient();
  let query = supabase.from("reports").select(REPORT_SELECT).order("created_at", { ascending: false });
  if (filter?.status) query = query.eq("status", filter.status);
  if (filter?.villageId) query = query.eq("village_id", filter.villageId);

  const { data } = await query;
  const rows = (data ?? []) as unknown as Omit<ReportListItem, "escalated" | "phoneVerified">[];
  return rows.map((r) => ({
    ...r,
    escalated: isEscalated(r.status, r.created_at),
    phoneVerified: isPhoneVerified(r.phone, r.phone_verification_status, r.villages),
  }));
}

export interface ReportDetail extends ReportListItem {
  village_id: string | null;
  water_price: number | null;
  received_ok: boolean | null;
  received_confirmed_at: string | null;
  priority_scores: { score: number; reason: string }[] | null;
}

export async function getReport(id: string): Promise<ReportDetail | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("reports")
    .select(
      "id, raw_text, status, source, phone, phone_verification_status, estimated_households, duration_days, water_price, ai_confidence, received_ok, received_confirmed_at, created_at, village_id, villages(id, name, district, regency, bpbd_category, registered_phone), priority_scores(score, reason)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const r = data as unknown as Omit<ReportDetail, "escalated" | "phoneVerified">;
  return {
    ...r,
    escalated: isEscalated(r.status, r.created_at),
    phoneVerified: isPhoneVerified(r.phone, r.phone_verification_status, r.villages),
  };
}

export interface OverviewData {
  counts: { pending: number; verified: number; scheduled: number; done: number };
  escalated: number;
  latestReports: ReportListItem[];
  todaySchedules: ScheduleListItem[];
}

export async function getOverview(): Promise<OverviewData> {
  const reports = await listReports();
  const counts = {
    pending: reports.filter((r) => r.status === "pending").length,
    verified: reports.filter((r) => r.status === "verified").length,
    scheduled: reports.filter((r) => r.status === "scheduled").length,
    done: reports.filter((r) => r.status === "done").length,
  };
  const escalated = reports.filter((r) => r.escalated).length;
  const latestReports = reports.slice(0, 5);

  const schedules = await listSchedules();
  const today = new Date().toISOString().slice(0, 10);
  const todaySchedules = schedules.filter((s) => s.date === today);

  return { counts, escalated, latestReports, todaySchedules };
}

export interface VillageListItem extends VillageBrief {
  lat: number | null;
  lng: number | null;
  registered_phone: string | null;
  last_dropping_at: string | null;
  activeReports: number;
  // Saran kategori dari data laporan (heuristik) — petugas tetap final.
  suggestedCategory: BpbdCategory | null;
  suggestReason: string | null;
}

export async function listVillages(): Promise<VillageListItem[]> {
  const supabase = createAdminClient();
  const [{ data: villages }, { data: reports }] = await Promise.all([
    supabase
      .from("villages")
      .select("id, name, district, regency, bpbd_category, lat, lng, registered_phone, last_dropping_at")
      .order("bpbd_category", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("reports").select("village_id, status, estimated_households, duration_days"),
  ]);

  type Rep = {
    village_id: string | null;
    status: ReportStatus;
    estimated_households: number | null;
    duration_days: number | null;
  };
  const activeByVillage = new Map<string, number>();
  const maxKk = new Map<string, number>();
  const maxDurasi = new Map<string, number>();
  for (const r of (reports ?? []) as Rep[]) {
    if (!r.village_id) continue;
    if (r.status !== "done") {
      activeByVillage.set(r.village_id, (activeByVillage.get(r.village_id) ?? 0) + 1);
    }
    if (r.estimated_households != null) {
      maxKk.set(r.village_id, Math.max(maxKk.get(r.village_id) ?? 0, r.estimated_households));
    }
    if (r.duration_days != null) {
      maxDurasi.set(r.village_id, Math.max(maxDurasi.get(r.village_id) ?? 0, r.duration_days));
    }
  }

  return ((villages ?? []) as unknown as Omit<
    VillageListItem,
    "activeReports" | "suggestedCategory" | "suggestReason"
  >[]).map((v) => {
    const activeReports = activeByVillage.get(v.id) ?? 0;
    const suggestion = suggestCategory({
      kk: maxKk.get(v.id) ?? null,
      durasiHari: maxDurasi.get(v.id) ?? null,
      lastDroppingAt: v.last_dropping_at,
      activeReports,
    });
    return {
      ...v,
      activeReports,
      suggestedCategory: suggestion?.category ?? null,
      suggestReason: suggestion?.reason ?? null,
    };
  });
}

export interface VillageDetail extends VillageBrief {
  lat: number | null;
  lng: number | null;
  registered_phone: string | null;
  last_dropping_at: string | null;
  schedules: ScheduleListItem[];
  reports: ReportListItem[];
}

export async function getVillage(id: string): Promise<VillageDetail | null> {
  const supabase = createAdminClient();
  const { data: village } = await supabase
    .from("villages")
    .select("id, name, district, regency, bpbd_category, lat, lng, registered_phone, last_dropping_at")
    .eq("id", id)
    .maybeSingle();
  if (!village) return null;

  const [schedules, reports] = await Promise.all([
    listSchedules({ villageId: id }),
    listReports({ villageId: id }),
  ]);

  return { ...(village as unknown as VillageBrief & VillageDetail), schedules, reports };
}

// =============================================
// Laporan harian — agregat data nyata untuk draf resmi
// Volume liter = ESTIMASI (skema tak punya kolom volume): KK × 15 L/hari.
// =============================================

const LITERS_PER_KK = 15;

export interface DailyServedVillage {
  village: string;
  district: string;
  regency: string;
  fleet: string;
  kk: number | null;
  liters: number;
}

export interface DailyReportData {
  date: string; // yyyy-mm-dd
  servedCount: number;
  totalKk: number;
  totalLiters: number;
  litersIsEstimate: boolean; // true jika ada dropping tanpa volume tercatat
  served: DailyServedVillage[];
  queueCount: number;
  queue: { village: string; score: number | null }[];
}

export async function getDailyReport(dateISO?: string): Promise<DailyReportData> {
  const supabase = createAdminClient();
  const date = dateISO ?? new Date().toISOString().slice(0, 10);

  const [{ data: schedules }, { data: reports }] = await Promise.all([
    supabase
      .from("drop_schedules")
      .select("fleet, date, status, village_id, volume_liters, villages(name, district, regency)")
      .eq("date", date),
    supabase
      .from("reports")
      .select("village_id, estimated_households, status, villages(name), priority_scores(score)"),
  ]);

  const sched = (schedules ?? []) as unknown as {
    fleet: string;
    status: DropStatus;
    village_id: string;
    volume_liters: number | null;
    villages: { name: string; district: string; regency: string } | null;
  }[];
  const reps = (reports ?? []) as unknown as {
    village_id: string | null;
    estimated_households: number | null;
    status: ReportStatus;
    villages: { name: string } | null;
    priority_scores: { score: number }[] | null;
  }[];

  // KK & skor per desa (ambil nilai tertinggi dari laporan desa tsb)
  const kkByVillage = new Map<string, number>();
  const scoreByVillage = new Map<string, number>();
  const nameByVillage = new Map<string, string>();
  for (const r of reps) {
    if (!r.village_id) continue;
    if (r.villages?.name) nameByVillage.set(r.village_id, r.villages.name);
    if (r.estimated_households != null) {
      kkByVillage.set(r.village_id, Math.max(kkByVillage.get(r.village_id) ?? 0, r.estimated_households));
    }
    const sc = r.priority_scores?.[0]?.score;
    if (sc != null) {
      scoreByVillage.set(r.village_id, Math.max(scoreByVillage.get(r.village_id) ?? 0, sc));
    }
  }

  const doneToday = sched.filter((s) => s.status === "done");
  let litersIsEstimate = false;
  const served: DailyServedVillage[] = doneToday.map((s) => {
    const kk = kkByVillage.get(s.village_id) ?? null;
    // Volume nyata bila tercatat; jika kosong → estimasi KK × 15 L.
    const liters = s.volume_liters ?? (kk != null ? kk * LITERS_PER_KK : 0);
    if (s.volume_liters == null) litersIsEstimate = true;
    return {
      village: s.villages?.name ?? "—",
      district: s.villages?.district ?? "—",
      regency: s.villages?.regency ?? "—",
      fleet: s.fleet,
      kk,
      liters,
    };
  });
  const servedVillageIds = new Set(doneToday.map((s) => s.village_id));
  const totalKk = [...servedVillageIds].reduce((sum, id) => sum + (kkByVillage.get(id) ?? 0), 0);
  const totalLiters = served.reduce((sum, s) => sum + s.liters, 0);

  // Antrean = desa dengan laporan belum selesai & belum dilayani hari ini
  const queueIds = new Set<string>();
  for (const r of reps) {
    if (r.village_id && r.status !== "done" && !servedVillageIds.has(r.village_id)) {
      queueIds.add(r.village_id);
    }
  }
  const queue = [...queueIds]
    .map((id) => ({ village: nameByVillage.get(id) ?? "—", score: scoreByVillage.get(id) ?? null }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return {
    date,
    servedCount: served.length,
    totalKk,
    totalLiters,
    litersIsEstimate,
    served,
    queueCount: queue.length,
    queue,
  };
}

export interface ScheduleListItem {
  id: string;
  fleet: string;
  date: string;
  status: DropStatus;
  created_at: string;
  villages: VillageBrief | null;
  delivery_proofs: { verified_at: string; photo_url: string | null; nfc_tag_id: string | null }[] | null;
}

export async function listSchedules(filter?: { villageId?: string }): Promise<ScheduleListItem[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("drop_schedules")
    .select(
      "id, fleet, date, status, created_at, villages(id, name, district, regency, bpbd_category), delivery_proofs(verified_at, photo_url, nfc_tag_id)"
    )
    .order("date", { ascending: false });
  if (filter?.villageId) query = query.eq("village_id", filter.villageId);

  const { data } = await query;
  return (data ?? []) as unknown as ScheduleListItem[];
}
