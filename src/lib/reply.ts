import type { IntakeResult } from "@/lib/report-intake";

type OkResult = Extract<IntakeResult, { kind: "ok" }>;

// Balasan asisten dari hasil pipeline — dipakai webhook WA & chat web.
// Prioritas: daftar field kurang yang KITA tahu pasti > pesan diterima.
export function buildReplyText(
  r: OkResult,
  opts: { portalLink?: string; suppressPriceAsk?: boolean } = {}
): string {
  let s = r.merged
    ? "Terima kasih, informasi tambahan sudah digabung ke laporan Anda."
    : r.isRegistered
      ? `Laporan dari Desa ${r.desaName || "Anda"} telah diterima dan sedang diproses prioritas.`
      : "Laporan Anda telah diterima (status belum terverifikasi) dan akan ditinjau petugas BPBD.";

  if (!r.complete) {
    s += `\n\nAgar penanganan lebih akurat, boleh lengkapi ${r.kurang.join(", ")}? Balas saja di sini.`;
  } else if (r.hargaAir == null && !opts.suppressPriceAsk) {
    // Data inti lengkap, tapi harga air mandiri (sinyal urgensi) belum ada — tanya sekali, opsional.
    s +=
      "\n\nData inti sudah lengkap. Satu lagi kalau tahu: berapa harga air per tangki kalau beli mandiri? (opsional, boleh dilewati)";
  } else {
    s += "\n\nData laporan sudah lengkap. Petugas BPBD akan menindaklanjuti.";
  }

  if (opts.portalLink) {
    s += `\n\nLacak status: ${opts.portalLink}\n(masuk dengan nomor WhatsApp ini)`;
  }
  return s;
}
