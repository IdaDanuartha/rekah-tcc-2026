// =============================================
// Rekah — TypeScript Types
// Mirrors the English database schema (supabase/migrations)
// =============================================

export type BpbdCategory = "kritis" | "langka" | "terbatas";

export type PhoneVerificationStatus = "verified" | "unverified";

export type ReportStatus = "pending" | "verified" | "scheduled" | "done";

export type DropStatus = "scheduled" | "in_transit" | "done";

export type ReportSource = "wa" | "web";

// =============================================
// Database entities
// =============================================

export interface Village {
  id: string;
  name: string;
  district: string;
  regency: string;
  bpbd_category: BpbdCategory | null;
  lat: number | null;
  lng: number | null;
  registered_phone: string | null;
  last_dropping_at: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  source: ReportSource;
  phone: string | null;
  phone_verification_status: PhoneVerificationStatus | null;
  raw_text: string;
  village_id: string | null;
  estimated_households: number | null;
  duration_days: number | null;
  water_price: number | null;
  ai_confidence: number | null;
  received_ok: boolean | null;
  received_confirmed_at: string | null;
  status: ReportStatus;
  created_at: string;
  // join
  village?: Village;
  priority_score?: PriorityScore;
}

export interface PriorityScore {
  id: string;
  report_id: string;
  score: number;
  reason: string;
  computed_at: string;
}

export interface DropSchedule {
  id: string;
  village_id: string;
  fleet: string;
  date: string;
  volume_liters: number | null;
  status: DropStatus;
  created_at: string;
  // join
  village?: Village;
  delivery_proof?: DeliveryProof;
}

export interface DeliveryProof {
  id: string;
  schedule_id: string;
  photo_url: string | null;
  geotag_lat: number | null;
  geotag_lng: number | null;
  nfc_tag_id: string | null;
  officer_id: string | null;
  verified_at: string;
}

// =============================================
// API types (AI JSON contracts — field keys match the LLM prompt)
// =============================================

export interface AiExtractionResult {
  desa: string | null;
  kecamatan: string | null;
  estimasi_kk: number | null;
  durasi_hari: number | null;
  indikator_urgensi: string[];
  confidence: number;
  butuh_klarifikasi: boolean;
  pertanyaan_klarifikasi: string | null;
}

export interface AiScoringResult {
  skor: number;
  alasan_teks: string;
  faktor_utama: string[];
}

export interface DropRoute {
  urutan: {
    desa_id: string;
    nama_desa: string;
    estimasi_kk: number;
    volume_liter: number;
    alasan: string;
  }[];
  total_liter: number;
  estimasi_waktu_jam: number;
}

// =============================================
// UI types
// =============================================

export interface VillageStats {
  total: number;
  pending: number;
  verified: number;
  scheduled: number;
  done: number;
}
