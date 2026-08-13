import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// =============================================
// Konfirmasi penerimaan air oleh warga (loop akuntabilitas).
// Dipakai webhook WA (balas YA/BELUM) & portal (tombol konfirmasi).
// =============================================

// Deteksi jawaban konfirmasi. true = diterima, false = belum, null = bukan konfirmasi.
export function parseYaBelum(text: string): boolean | null {
  const t = text.trim().toLowerCase();
  if (/^(ya|iya|sudah|udah|sdh|betul|benar|diterima|terima|ok|oke|y)\b/.test(t)) return true;
  if (/^(belum|blm|tidak|tdk|belom|ga|gak|nggak|no|n)\b/.test(t)) return false;
  return null;
}

// Laporan milik nomor ini yang sudah 'done' tapi belum dikonfirmasi warga.
export async function pendingConfirmationReport(
  supabase: SupabaseClient,
  phone: string
): Promise<{ id: string; village_id: string | null } | null> {
  const { data } = await supabase
    .from("reports")
    .select("id, village_id")
    .eq("phone", phone)
    .eq("status", "done")
    .is("received_ok", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { id: string; village_id: string | null } | null) ?? null;
}

// Simpan hasil konfirmasi.
export async function setReceipt(
  supabase: SupabaseClient,
  reportId: string,
  ok: boolean
): Promise<void> {
  await supabase
    .from("reports")
    .update({ received_ok: ok, received_confirmed_at: new Date().toISOString() })
    .eq("id", reportId);
}
