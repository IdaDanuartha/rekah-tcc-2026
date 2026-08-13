import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePhones } from "@/lib/reporter-session";
import type { ReportSource } from "@/lib/types";

// =============================================
// Pipeline penerimaan laporan (dipakai webhook WA & chat web).
// Match desa (nomor terdaftar / nama desa) → threading (target eksplisit
// atau window 24 jam utk WA) → ekstraksi AI → filter → skor → cek kelengkapan.
// =============================================

const MERGE_WINDOW_MS = 24 * 60 * 60 * 1000;

type PrevReport = {
  id: string;
  raw_text: string;
  created_at: string;
  estimated_households: number | null;
  duration_days: number | null;
  water_price: number | null;
  price_resolved: boolean | null;
  village_id: string | null;
};

// Deteksi jawaban pertanyaan harga air (di price-turn): sebutan uang / skip.
const PRICE_RE = /(rp\s*\d|\d[\d.,]*\s*(rb|ribu|rbu|k|jt|juta|rupiah|perak))/i;
const BARE_PRICE_RE = /^\s*(?:sekitar\s*|kira-?kira\s*|kurang lebih\s*)?rp?\.?\s*\d[\d.,]*\s*$/i;
const SKIP_RE = /^(lewati|lewat|skip|no|-|lupa|tidak tahu|tidak|nggak tau|gak tau|ga tau|engga|enggak|nggak|gak|ga)\b[\s.!,]*$/i;

export interface Extraction {
  is_laporan_kekeringan?: boolean;
  desa?: string | null;
  kecamatan?: string | null;
  estimasi_kk?: number | null;
  durasi_hari?: number | null;
  harga_air_per_tangki?: number | null;
  confidence?: number | null;
  butuh_klarifikasi?: boolean;
  pertanyaan_klarifikasi?: string | null;
}

export type IntakeResult =
  | { kind: "out_of_context" }
  | {
      kind: "ok";
      reportId: string;
      merged: boolean;
      isRegistered: boolean;
      villageId: string | null;
      desaName: string | null;
      kurang: string[];
      complete: boolean;
      hargaAir: number | null;
      // true bila pesan ini adalah jawaban/skip harga → jangan tanya harga lagi.
      priceResolved: boolean;
      extraction: Extraction;
    };

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/^(desa|kelurahan|kec\.?|kecamatan)\s+/g, "")
    .trim();

type Village = {
  id: string;
  name: string;
  district: string;
  bpbd_category: string | null;
  last_dropping_at: string | null;
  registered_phone: string | null;
};

export async function processIncomingReport({
  phone,
  text,
  source = "wa",
  targetReportId = null,
}: {
  phone: string;
  text: string;
  source?: ReportSource;
  // Chat web meneruskan id laporan aktif yang sedang dilengkapi.
  // WA tidak (null) → pakai deteksi window 24 jam.
  targetReportId?: string | null;
}): Promise<IntakeResult> {
  const supabase = createAdminClient();

  // Match desa via nomor terdaftar (satu desa bisa banyak nomor).
  const { data: villagesData } = await supabase
    .from("villages")
    .select("id, name, district, bpbd_category, last_dropping_at, registered_phone");
  const villages = (villagesData ?? []) as Village[];
  const registeredDesa =
    villages.find((v) => parsePhones(v.registered_phone).includes(phone)) ?? null;
  const isRegistered = Boolean(registeredDesa);
  const registeredDesaId = registeredDesa?.id ?? null;

  // Threading: laporan yang sedang dilengkapi.
  let prev: PrevReport | null = null;
  // Kandidat laporan lengkap yang menunggu jawaban harga (diklasifikasi setelah ekstraksi).
  let priceCandidate: PrevReport | null = null;

  if (targetReportId) {
    // Web: lanjutkan laporan yang ditunjuk (harus milik nomor ini & masih pending).
    const { data } = await supabase
      .from("reports")
      .select("id, raw_text, created_at, estimated_households, duration_days, water_price, price_resolved, village_id")
      .eq("id", targetReportId)
      .eq("phone", phone)
      .eq("status", "pending")
      .maybeSingle();
    prev = data ?? null;
  } else {
    // WA: laporan pending terbaru dalam window 24 jam. Di-thread bila belum
    // lengkap, ATAU sudah lengkap tapi jawaban harga belum diselesaikan
    // (agar balasan harga tetap masuk ke laporan yang sama).
    const { data: prevRows } = await supabase
      .from("reports")
      .select("id, raw_text, created_at, estimated_households, duration_days, water_price, price_resolved, village_id")
      .eq("phone", phone)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);
    const candidate = (prevRows ?? [])[0] ?? null;
    const withinWindow =
      !!candidate && Date.now() - new Date(candidate.created_at).getTime() < MERGE_WINDOW_MS;
    const complete =
      !!candidate &&
      candidate.village_id != null &&
      candidate.estimated_households != null &&
      candidate.duration_days != null;
    if (candidate && withinWindow) {
      if (!complete) prev = candidate; // laporan masih dilengkapi → gabung
      else if (!candidate.price_resolved) priceCandidate = candidate; // menunggu jawaban harga
    }
  }

  // Ekstraksi berjalan pada teks gabungan hanya untuk laporan yang sedang
  // dilengkapi; untuk price-turn/laporan baru cukup teks pesan ini.
  const isInProgress = !!prev;
  const teksUntukAI = isInProgress ? `${prev!.raw_text}\n${text}` : text;

  // Ekstraksi AI
  let extraction: Extraction = {};
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/extraction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teks: teksUntukAI, nomor_wa: phone, desa_hint: registeredDesaId }),
    });
    extraction = await res.json();
  } catch (e) {
    console.error("[intake] ekstraksi gagal:", e);
  }

  // Price-turn: pesan atas laporan yang sudah lengkap. Hanya jawaban harga /
  // skip yang digabung; selain itu → tandai lama selesai & proses sbg pesan baru.
  if (priceCandidate) {
    const clean = text.trim();
    const priceAnswer =
      extraction.harga_air_per_tangki != null || PRICE_RE.test(clean) || BARE_PRICE_RE.test(clean);
    const skip = SKIP_RE.test(clean);
    if (priceAnswer || skip) {
      prev = priceCandidate;
    } else {
      await supabase.from("reports").update({ price_resolved: true }).eq("id", priceCandidate.id);
    }
  }

  const isFollowUp = !!prev;
  // Laporan sudah lengkap SEBELUM pesan ini → pesan ini = jawaban/skip harga.
  const prevComplete =
    !!prev &&
    prev.village_id != null &&
    prev.estimated_households != null &&
    prev.duration_days != null;
  const mergedText = isFollowUp ? `${prev!.raw_text}\n${text}` : text;

  // Filter out-of-context (hanya laporan baru, bukan lanjutan).
  if (!isFollowUp && extraction.is_laporan_kekeringan === false) {
    return { kind: "out_of_context" };
  }

  // Resolusi desa: nomor terdaftar → cocokkan nama desa dari teks → pertahankan yang lama.
  let villageId = registeredDesaId;
  if (!villageId && extraction.desa) {
    const wantName = norm(extraction.desa);
    const wantDistrict = extraction.kecamatan ? norm(extraction.kecamatan) : null;
    const matches = villages.filter((v) => norm(v.name) === wantName);
    const picked =
      matches.length === 1
        ? matches[0]
        : matches.find((v) => wantDistrict && norm(v.district) === wantDistrict) ?? null;
    villageId = picked?.id ?? null;
  }
  const finalVillageId = villageId ?? prev?.village_id ?? null;
  const finalKk = extraction.estimasi_kk ?? prev?.estimated_households ?? null;
  const finalDurasi = extraction.durasi_hari ?? prev?.duration_days ?? null;
  // Harga air mandiri: sinyal urgensi opsional. Pertahankan nilai lama bila
  // pesan lanjutan tak menyebut harga.
  const hargaAir = extraction.harga_air_per_tangki ?? prev?.water_price ?? null;
  const matchedVillage = villages.find((v) => v.id === finalVillageId) ?? null;
  const desaName = matchedVillage?.name ?? extraction.desa ?? null;

  // Simpan: update laporan lama (lanjutan) atau buat baru.
  let reportId: string;
  if (isFollowUp) {
    const { error } = await supabase
      .from("reports")
      .update({
        raw_text: mergedText,
        estimated_households: finalKk,
        duration_days: finalDurasi,
        water_price: hargaAir,
        ai_confidence: extraction.confidence ?? null,
        ...(finalVillageId ? { village_id: finalVillageId } : {}),
        // Pesan lanjutan atas laporan yang sudah lengkap = jawaban harga →
        // tandai selesai agar pesan berikutnya jadi laporan baru.
        ...(prevComplete ? { price_resolved: true } : {}),
      })
      .eq("id", prev!.id);
    if (error) throw error;
    reportId = prev!.id;
  } else {
    const { data: laporan, error } = await supabase
      .from("reports")
      .insert({
        source,
        phone,
        phone_verification_status: isRegistered ? "verified" : "unverified",
        raw_text: text,
        village_id: finalVillageId,
        estimated_households: finalKk,
        duration_days: finalDurasi,
        water_price: hargaAir,
        ai_confidence: extraction.confidence ?? null,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw error;
    reportId = laporan.id;
  }

  // Skor prioritas → simpan (ganti skor lama).
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/scoring`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        desa: desaName,
        kategori_bpbd: matchedVillage?.bpbd_category ?? null,
        estimasi_kk: finalKk,
        durasi_hari: finalDurasi,
        terakhir_dropping_at: matchedVillage?.last_dropping_at ?? null,
        harga_air: hargaAir,
      }),
    });
    const scoring = await res.json();
    if (typeof scoring?.skor === "number") {
      await supabase.from("priority_scores").delete().eq("report_id", reportId);
      await supabase.from("priority_scores").insert({
        report_id: reportId,
        score: scoring.skor,
        reason: scoring.alasan_teks ?? "",
      });
    }
  } catch (e) {
    console.error("[intake] skoring gagal:", e);
  }

  // Field penting yang masih kosong (untuk pertanyaan lanjutan).
  // Desa dianggap kurang jika belum ter-map ke village (tak bisa di-route).
  const kurang: string[] = [];
  if (!finalVillageId) kurang.push("nama desa & kecamatan");
  if (finalKk == null) kurang.push("perkiraan jumlah KK terdampak");
  if (finalDurasi == null) kurang.push("sudah berapa lama air kering");

  return {
    kind: "ok",
    reportId,
    merged: isFollowUp,
    isRegistered,
    villageId: finalVillageId,
    desaName,
    kurang,
    complete: kurang.length === 0,
    hargaAir,
    priceResolved: prevComplete,
    extraction,
  };
}
