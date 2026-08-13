"use server";

import { revalidatePath } from "next/cache";
import { getReporterPhone } from "@/lib/reporter-server";
import { processIncomingReport } from "@/lib/report-intake";
import { buildReplyText } from "@/lib/reply";
import { setReceipt } from "@/lib/receipt";
import { createAdminClient } from "@/lib/supabase/admin";

// Chat lapor via web (pelapor login). Pipeline & balasan sama dengan WA.
// Percakapan terikat ke SATU laporan aktif, riwayat disimpan di report_messages.

export type ChatMessage = { role: "user" | "assistant"; text: string };

export type Conversation = {
  reportId: string | null;
  complete: boolean;
  messages: ChatMessage[];
};

const OUT_OF_CONTEXT =
  "Pesan sepertinya bukan laporan kekeringan air. Sebutkan nama desa & kecamatan, jumlah KK terdampak, dan sudah berapa lama air kering.";

// Muat percakapan aktif = laporan pending terbaru nomor ini + riwayat pesannya.
export async function loadConversation(): Promise<Conversation> {
  const phone = await getReporterPhone();
  if (!phone) return { reportId: null, complete: false, messages: [] };

  const supabase = createAdminClient();
  const { data: rep } = await supabase
    .from("reports")
    .select("id, village_id, estimated_households, duration_days")
    .eq("phone", phone)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!rep) return { reportId: null, complete: false, messages: [] };

  const complete =
    rep.village_id != null && rep.estimated_households != null && rep.duration_days != null;

  // Laporan lengkap = percakapan selesai. Jangan dilanjutkan — mulai fresh
  // supaya pesan berikutnya jadi laporan BARU (kena filter out-of-context).
  if (complete) return { reportId: null, complete: false, messages: [] };

  const { data: msgs } = await supabase
    .from("report_messages")
    .select("role, text")
    .eq("report_id", rep.id)
    .order("created_at", { ascending: true });

  return {
    reportId: rep.id,
    complete,
    messages: (msgs ?? []) as ChatMessage[],
  };
}

export type SendResult =
  | { ok: true; reportId: string | null; botText: string; complete: boolean; hargaAir: number | null }
  | { ok: false; error: string };

// Kirim satu pesan chat. reportId = laporan aktif yang dilanjutkan (null = baru).
export async function sendChatMessage(
  reportId: string | null,
  text: string,
  // Harga air sudah pernah ditanya → jangan tanya lagi (hindari loop).
  suppressPriceAsk = false
): Promise<SendResult> {
  const phone = await getReporterPhone();
  if (!phone) return { ok: false, error: "Sesi berakhir. Silakan masuk lagi." };

  const clean = text.trim();
  if (clean.length < 3) {
    return { ok: false, error: "Tulis pesan lebih jelas dulu ya." };
  }

  try {
    const result = await processIncomingReport({
      phone,
      text: clean,
      source: "web",
      targetReportId: reportId,
    });

    if (result.kind === "out_of_context") {
      // Tidak ada laporan dibuat → tidak disimpan, cukup balas.
      return { ok: true, reportId: null, botText: OUT_OF_CONTEXT, complete: false, hargaAir: null };
    }

    const botText = buildReplyText(result, {
      suppressPriceAsk: suppressPriceAsk || result.priceResolved,
    });

    // Simpan riwayat: pesan pelapor + balasan asisten (di bawah laporan yang sama).
    // Di-guard: kalau migrasi report_messages belum jalan, chat tetap berfungsi.
    try {
      const supabase = createAdminClient();
      const { error } = await supabase.from("report_messages").insert([
        { report_id: result.reportId, phone, role: "user", text: clean },
        { report_id: result.reportId, phone, role: "assistant", text: botText },
      ]);
      if (error) console.error("[chat] simpan riwayat gagal:", error.message);
    } catch (e) {
      console.error("[chat] simpan riwayat gagal:", e);
    }

    revalidatePath("/portal");
    return {
      ok: true,
      reportId: result.reportId,
      botText,
      complete: result.complete,
      hargaAir: result.hargaAir,
    };
  } catch (e) {
    return { ok: false, error: `Gagal memproses laporan: ${String(e)}` };
  }
}

// Konfirmasi penerimaan air oleh warga (loop akuntabilitas) dari portal.
export async function confirmReceipt(
  reportId: string,
  ok: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const phone = await getReporterPhone();
  if (!phone) return { ok: false, error: "Sesi berakhir. Silakan masuk lagi." };

  const supabase = createAdminClient();
  // Pastikan laporan milik nomor ini & memang sudah 'done'.
  const { data: rep } = await supabase
    .from("reports")
    .select("id, status")
    .eq("id", reportId)
    .eq("phone", phone)
    .maybeSingle();
  if (!rep) return { ok: false, error: "Laporan tidak ditemukan." };
  if (rep.status !== "done") return { ok: false, error: "Laporan belum berstatus selesai." };

  await setReceipt(supabase, reportId, ok);
  revalidatePath(`/portal/reports/${reportId}`);
  revalidatePath("/portal");
  return { ok: true };
}
