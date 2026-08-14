"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePhones } from "@/lib/reporter-session";
import { kirimWA } from "@/lib/wa";

// Kirim notifikasi WA ke pelapor (best-effort; kegagalan tak membatalkan aksi).
async function notifWA(phone: string | null | undefined, pesan: string) {
  if (!phone) return;
  try {
    await kirimWA(phone, pesan);
  } catch (e) {
    console.error("[Notif WA] gagal:", e);
  }
}

function portalLink() {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/portal`;
}

// Volume liter opsional dari form → integer positif atau null.
function parseVolume(raw: FormDataEntryValue | null): number | null {
  const n = parseInt(String(raw ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// =============================================
// Dashboard petugas — server actions (mutasi)
// Dilindungi middleware /dashboard (sesi petugas).
// =============================================

export type ActionResult = { ok: true } | { ok: false; error: string };

// =============================================
// CRUD Data Desa (villages)
// =============================================

const BPBD_CATEGORIES = ["kritis", "langka", "terbatas"] as const;

// Ambil & validasi field desa dari FormData. Return error string bila invalid.
function parseVillageForm(
  formData: FormData
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const regency = String(formData.get("regency") ?? "").trim();
  if (!name || !district || !regency) {
    return { ok: false, error: "Nama desa, kecamatan, dan kabupaten wajib diisi." };
  }

  const rawCat = String(formData.get("bpbd_category") ?? "").trim();
  const bpbd_category = (BPBD_CATEGORIES as readonly string[]).includes(rawCat) ? rawCat : null;

  function num(field: string): number | null | "invalid" {
    const raw = String(formData.get(field) ?? "").trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : "invalid";
  }
  const lat = num("lat");
  const lng = num("lng");
  if (lat === "invalid" || lng === "invalid") {
    return { ok: false, error: "Koordinat lat/lng harus berupa angka." };
  }
  if (lat !== null && (lat < -90 || lat > 90)) {
    return { ok: false, error: "Latitude harus antara -90 dan 90." };
  }
  if (lng !== null && (lng < -180 || lng > 180)) {
    return { ok: false, error: "Longitude harus antara -180 dan 180." };
  }

  // Bisa banyak nomor (satu per baris / dipisah koma) — normalisasi ke +62 lalu gabung.
  const phones = parsePhones(String(formData.get("registered_phone") ?? ""));
  const registered_phone = phones.length ? phones.join(", ") : null;

  return { ok: true, value: { name, district, regency, bpbd_category, lat, lng, registered_phone } };
}

function revalidateVillages(id?: string) {
  revalidatePath("/dashboard/villages");
  revalidatePath("/dashboard/schedule");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/dashboard/villages/${id}`);
}

export async function createVillage(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = parseVillageForm(formData);
  if (!parsed.ok) return parsed;

  const supabase = createAdminClient();
  const { error } = await supabase.from("villages").insert(parsed.value);
  if (error) return { ok: false, error: error.message };

  revalidateVillages();
  return { ok: true };
}

export async function updateVillage(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "ID desa kosong." };

  const parsed = parseVillageForm(formData);
  if (!parsed.ok) return parsed;

  const supabase = createAdminClient();
  const { error } = await supabase.from("villages").update(parsed.value).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateVillages(id);
  return { ok: true };
}

// Hapus desa: jadwal dropping terkait ikut terhapus (cascade),
// laporan terlepas dari desa (village_id → null).
export async function deleteVillage(villageId: string): Promise<ActionResult> {
  if (!villageId) return { ok: false, error: "ID desa kosong." };
  const supabase = createAdminClient();
  const { error } = await supabase.from("villages").delete().eq("id", villageId);
  if (error) return { ok: false, error: error.message };

  revalidateVillages();
  return { ok: true };
}

// Verifikasi laporan: pending → verified
export async function verifyReport(reportId: string): Promise<ActionResult> {
  if (!reportId) return { ok: false, error: "reportId kosong" };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reports")
    .update({ status: "verified" })
    .eq("id", reportId);
  if (error) return { ok: false, error: error.message };

  // Notifikasi WA ke pelapor
  const { data: rep } = await supabase
    .from("reports")
    .select("phone, villages(name)")
    .eq("id", reportId)
    .maybeSingle();
  const namaDesa = (rep as { villages?: { name?: string } | null } | null)?.villages?.name;
  await notifWA(
    (rep as { phone?: string | null } | null)?.phone,
    `Laporan Anda${namaDesa ? ` untuk Desa ${namaDesa}` : ""} sudah *diverifikasi* petugas BPBD dan masuk antrean prioritas dropping.\n\nLacak status: ${portalLink()}`
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reports");
  revalidatePath(`/dashboard/reports/${reportId}`);
  return { ok: true };
}

// Hitung ulang skor prioritas sebuah laporan (mis. laporan lama tanpa skor).
export async function rescoreReport(reportId: string): Promise<ActionResult> {
  if (!reportId) return { ok: false, error: "reportId kosong" };
  const supabase = createAdminClient();

  const { data: report } = await supabase
    .from("reports")
    .select(
      "id, estimated_households, duration_days, water_price, villages(name, bpbd_category, last_dropping_at)"
    )
    .eq("id", reportId)
    .maybeSingle();
  if (!report) return { ok: false, error: "Laporan tidak ditemukan." };

  const village = (report as { villages?: { name?: string; bpbd_category?: string | null; last_dropping_at?: string | null } | null }).villages;

  let skor: number | null = null;
  let alasan = "";
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/scoring`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        desa: village?.name ?? null,
        kategori_bpbd: village?.bpbd_category ?? null,
        estimasi_kk: (report as { estimated_households: number | null }).estimated_households ?? null,
        durasi_hari: (report as { duration_days: number | null }).duration_days ?? null,
        terakhir_dropping_at: village?.last_dropping_at ?? null,
        harga_air: (report as { water_price: number | null }).water_price ?? null,
      }),
    });
    const scoring = await res.json();
    if (typeof scoring?.skor === "number") {
      skor = scoring.skor;
      alasan = scoring.alasan_teks ?? "";
    }
  } catch (e) {
    return { ok: false, error: `Gagal menghubungi layanan skoring: ${String(e)}` };
  }
  if (skor === null) return { ok: false, error: "Layanan skoring tidak mengembalikan skor." };

  // Ganti skor lama agar hanya ada satu skor terbaru per laporan
  await supabase.from("priority_scores").delete().eq("report_id", reportId);
  const { error } = await supabase.from("priority_scores").insert({
    report_id: reportId,
    score: skor,
    reason: alasan,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/reports/${reportId}`);
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
  return { ok: true };
}

// Jadwalkan dropping dari sebuah laporan:
// buat drop_schedules untuk desa laporan + set laporan → scheduled
export async function scheduleDropFromReport(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const reportId = String(formData.get("reportId") ?? "");
  const fleet = String(formData.get("fleet") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const volume_liters = parseVolume(formData.get("volume_liters"));
  if (!reportId || !fleet || !date) {
    return { ok: false, error: "Armada dan tanggal wajib diisi." };
  }

  const supabase = createAdminClient();
  const { data: report } = await supabase
    .from("reports")
    .select("village_id, phone, villages(name)")
    .eq("id", reportId)
    .maybeSingle();

  if (!report?.village_id) {
    return { ok: false, error: "Laporan belum terhubung ke desa terdaftar." };
  }

  const { error: insertError } = await supabase.from("drop_schedules").insert({
    village_id: report.village_id,
    fleet,
    date,
    volume_liters,
    status: "scheduled",
  });
  if (insertError) return { ok: false, error: insertError.message };

  const { error: updateError } = await supabase
    .from("reports")
    .update({ status: "scheduled" })
    .eq("id", reportId);
  if (updateError) return { ok: false, error: updateError.message };

  // Notifikasi WA ke pelapor
  const namaDesa = (report as { villages?: { name?: string } | null }).villages?.name;
  const tglFmt = new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  await notifWA(
    (report as { phone?: string | null }).phone,
    `Kabar baik. Dropping air${namaDesa ? ` untuk Desa ${namaDesa}` : ""} telah *dijadwalkan* pada ${tglFmt} dengan armada ${fleet}${volume_liters ? ` (${volume_liters.toLocaleString("id-ID")} liter)` : ""}.\n\nLacak status: ${portalLink()}`
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reports");
  revalidatePath(`/dashboard/reports/${reportId}`);
  revalidatePath("/dashboard/schedule");
  return { ok: true };
}

// Buat jadwal langsung (dari halaman Jadwal)
export async function createSchedule(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const villageId = String(formData.get("villageId") ?? "");
  const fleet = String(formData.get("fleet") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const volume_liters = parseVolume(formData.get("volume_liters"));
  if (!villageId || !fleet || !date) {
    return { ok: false, error: "Desa, armada, dan tanggal wajib diisi." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("drop_schedules").insert({
    village_id: villageId,
    fleet,
    date,
    volume_liters,
    status: "scheduled",
  });
  if (error) return { ok: false, error: error.message };

  // Notifikasi WA ke semua pelapor desa ini yang laporannya masih aktif.
  const { data: village } = await supabase
    .from("villages")
    .select("name")
    .eq("id", villageId)
    .maybeSingle();
  const { data: reps } = await supabase
    .from("reports")
    .select("phone")
    .eq("village_id", villageId)
    .neq("status", "done");
  const phones = [
    ...new Set(
      ((reps ?? []) as { phone: string | null }[]).map((r) => r.phone).filter(Boolean) as string[]
    ),
  ];
  const namaDesa = (village as { name?: string } | null)?.name;
  const tglFmt = new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const pesan = `Kabar baik. Dropping air${namaDesa ? ` untuk Desa ${namaDesa}` : ""} telah *dijadwalkan* pada ${tglFmt} dengan armada ${fleet}${volume_liters ? ` (${volume_liters.toLocaleString("id-ID")} liter)` : ""}.\n\nLacak status: ${portalLink()}`;
  for (const p of phones) await notifWA(p, pesan);

  revalidatePath("/dashboard/schedule");
  revalidatePath("/dashboard");
  return { ok: true };
}

// Ubah status jadwal dropping; jika 'done' tandai dropping desa & selesaikan
export async function updateScheduleStatus(
  scheduleId: string,
  status: "scheduled" | "in_transit" | "done"
): Promise<ActionResult> {
  if (!scheduleId) return { ok: false, error: "scheduleId kosong" };
  const supabase = createAdminClient();

  const { data: schedule } = await supabase
    .from("drop_schedules")
    .select("village_id, villages(name)")
    .eq("id", scheduleId)
    .maybeSingle();

  const { error } = await supabase
    .from("drop_schedules")
    .update({ status })
    .eq("id", scheduleId);
  if (error) return { ok: false, error: error.message };

  // Notifikasi WA ke pelapor desa (armada berangkat / air sampai)
  if ((status === "in_transit" || status === "done") && schedule?.village_id) {
    const { data: reps } = await supabase
      .from("reports")
      .select("phone")
      .eq("village_id", schedule.village_id)
      .eq("status", "scheduled");
    const phones = [
      ...new Set(
        ((reps ?? []) as { phone: string | null }[]).map((r) => r.phone).filter(Boolean) as string[]
      ),
    ];
    const namaDesa = (schedule as { villages?: { name?: string } | null }).villages?.name;
    const pesan =
      status === "in_transit"
        ? `Armada air${namaDesa ? ` untuk Desa ${namaDesa}` : ""} sedang *dalam perjalanan* menuju titik dropping.\n\nLacak status: ${portalLink()}`
        : `Air bersih telah *disalurkan*${namaDesa ? ` ke Desa ${namaDesa}` : ""}.\n\nMohon konfirmasi: apakah air benar-benar sudah *diterima* warga?\nBalas *YA* jika sudah, atau *BELUM* jika belum.\n\nKonfirmasi Anda menjadi bukti akuntabilitas penyaluran. Terima kasih.`;
    // Paralel + best-effort: WA gagal/timeout tak boleh menggagalkan update status.
    await Promise.allSettled(phones.map((p) => notifWA(p, pesan)));
  }

  if (status === "done" && schedule?.village_id) {
    await supabase
      .from("villages")
      .update({ last_dropping_at: new Date().toISOString() })
      .eq("id", schedule.village_id);
    await supabase
      .from("reports")
      .update({ status: "done" })
      .eq("village_id", schedule.village_id)
      .eq("status", "scheduled");
  }

  revalidatePath("/dashboard/schedule");
  revalidatePath("/dashboard");
  return { ok: true };
}
