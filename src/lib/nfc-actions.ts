"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUid } from "@/lib/nfc-shared";

export type NfcTag = {
  uid: string;
  village_id: string;
  label: string;
  registered_at: string;
  villageName: string;
};

export type NfcActionResult = { ok: true } | { ok: false; error: string };

// Daftar semua stiker terdaftar (utk halaman admin).
export async function listNfcTags(): Promise<NfcTag[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("nfc_tags")
    .select("uid, village_id, label, registered_at, villages(name)")
    .order("registered_at", { ascending: false });

  return ((data ?? []) as unknown as {
    uid: string;
    village_id: string;
    label: string;
    registered_at: string;
    villages: { name: string } | null;
  }[]).map((t) => ({
    uid: t.uid,
    village_id: t.village_id,
    label: t.label,
    registered_at: t.registered_at,
    villageName: t.villages?.name ?? "—",
  }));
}

// Register / update stiker: kaitkan UID ke desa + label titik.
export async function registerNfcTag(
  uidRaw: string,
  villageId: string,
  label: string,
): Promise<NfcActionResult> {
  const uid = normalizeUid(uidRaw);
  if (!uid) return { ok: false, error: "UID stiker kosong. Tap stiker atau ketik UID." };
  if (!villageId) return { ok: false, error: "Pilih desa tujuan dulu." };

  const supabase = createAdminClient();

  const { data: village } = await supabase
    .from("villages")
    .select("id")
    .eq("id", villageId)
    .maybeSingle();
  if (!village) return { ok: false, error: "Desa tidak ditemukan." };

  const { error } = await supabase
    .from("nfc_tags")
    .upsert(
      { uid, village_id: villageId, label: label.trim() },
      { onConflict: "uid" },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/nfc");
  return { ok: true };
}

// Hapus registrasi stiker.
export async function deleteNfcTag(uidRaw: string): Promise<NfcActionResult> {
  const uid = normalizeUid(uidRaw);
  const supabase = createAdminClient();
  const { error } = await supabase.from("nfc_tags").delete().eq("uid", uid);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/nfc");
  return { ok: true };
}

// Validasi tap sopir: UID harus terdaftar DAN cocok dgn desa tujuan jadwal.
export async function validateNfcForVillage(
  uidRaw: string,
  villageId: string,
): Promise<{ ok: true; uid: string } | { ok: false; error: string }> {
  const uid = normalizeUid(uidRaw);
  if (!uid) return { ok: false, error: "Tag NFC kosong." };

  const supabase = createAdminClient();
  const { data: tag } = await supabase
    .from("nfc_tags")
    .select("uid, village_id, villages(name)")
    .eq("uid", uid)
    .maybeSingle();

  if (!tag) {
    return { ok: false, error: "Tag NFC belum terdaftar. Daftarkan dulu di dashboard (menu Stiker NFC)." };
  }
  const t = tag as unknown as { uid: string; village_id: string; villages: { name: string } | null };
  if (t.village_id !== villageId) {
    return {
      ok: false,
      error: `Tag ini terdaftar untuk titik ${t.villages?.name ?? "desa lain"}, bukan tujuan jadwal ini.`,
    };
  }
  return { ok: true, uid };
}
