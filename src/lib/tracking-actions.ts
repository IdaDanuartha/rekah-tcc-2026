"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateScheduleStatus } from "@/lib/dashboard-actions";
import { validateNfcForVillage } from "@/lib/nfc-actions";

export type ProofResult = { ok: true } | { ok: false; error: string };

// Sopir unggah bukti serah terima di titik dropping: foto + geotag + NFC opsional.
// Foto → Supabase Storage 'proofs' (service role bypass RLS), lalu tandai selesai.
export async function submitDeliveryProof(
  scheduleId: string,
  formData: FormData,
): Promise<ProofResult> {
  if (!scheduleId) return { ok: false, error: "scheduleId kosong" };

  const file = formData.get("photo");
  const latRaw = String(formData.get("lat") ?? "");
  const lngRaw = String(formData.get("lng") ?? "");
  const lat = parseFloat(latRaw);
  const lng = parseFloat(lngRaw);
  const nfc = String(formData.get("nfc") ?? "").trim() || null;

  const supabase = createAdminClient();

  const { data: sched } = await supabase
    .from("drop_schedules")
    .select("id, village_id")
    .eq("id", scheduleId)
    .maybeSingle();
  if (!sched) return { ok: false, error: "Jadwal tidak ditemukan." };

  // Validasi tag NFC: wajib terdaftar & cocok dgn desa tujuan jadwal.
  if (!nfc) return { ok: false, error: "Tag NFC wajib. Tap stiker titik dropping atau ketik UID." };
  const nfcCheck = await validateNfcForVillage(nfc, (sched as { village_id: string }).village_id);
  if (!nfcCheck.ok) return { ok: false, error: nfcCheck.error };

  let photo_url: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > 8 * 1024 * 1024) {
      return { ok: false, error: "Foto terlalu besar (maks 8MB)." };
    }
    const ext = file.type === "image/png" ? "png" : "jpg";
    const path = `${scheduleId}/${Date.now()}.${ext}`;
    const buf = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from("proofs")
      .upload(path, buf, { contentType: file.type || "image/jpeg", upsert: false });
    if (upErr) return { ok: false, error: `Upload gagal: ${upErr.message}` };
    photo_url = supabase.storage.from("proofs").getPublicUrl(path).data.publicUrl;
  }

  const { error: insErr } = await supabase.from("delivery_proofs").insert({
    schedule_id: scheduleId,
    photo_url,
    geotag_lat: Number.isFinite(lat) ? lat : null,
    geotag_lng: Number.isFinite(lng) ? lng : null,
    nfc_tag_id: nfcCheck.uid,
  });
  if (insErr) return { ok: false, error: insErr.message };

  // Tandai dropping selesai (reuse: notif WA + last_dropping + reports done).
  const res = await updateScheduleStatus(scheduleId, "done");
  if (!res.ok) return res;

  revalidatePath(`/track/${scheduleId}`);
  return { ok: true };
}
