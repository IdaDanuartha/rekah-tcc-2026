"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Loader2,
  Download,
  RefreshCw,
  CheckCircle2,
  Truck,
  Droplets,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import type { DailyReportData } from "@/lib/dashboard-data";

// Tanggal lengkap: "Selasa, 12 Agustus 2026"
function formatTanggal(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Jam: "17:00"
function jamSekarang(d: Date): string {
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

const numID = (n: number) => n.toLocaleString("id-ID");

// Narasi resmi disusun dari data agregat nyata + tanggal/jam saat generate.
function buildNarasi(data: DailyReportData, tanggal: string, jam: string): string {
  const desaLines = data.served.length
    ? data.served
        .map(
          (s, i) =>
            `${i + 1}. ${s.village}, Kec. ${s.district}, Kab. ${s.regency}\n   Armada: ${s.fleet}, Volume: ${numID(s.liters)} liter${s.kk != null ? `, Estimasi ${numID(s.kk)} KK` : ""}`,
        )
        .join("\n\n")
    : "Belum ada dropping yang selesai pada tanggal ini.";

  const antreanLine = data.queueCount
    ? `Terdapat ${data.queueCount} desa yang masih dalam antrean prioritas dan belum mendapat layanan hari ini${
        data.queue.length
          ? ", termasuk " +
            data.queue
              .slice(0, 2)
              .map((q) => `${q.village}${q.score != null ? ` (skor prioritas ${q.score})` : ""}`)
              .join(" dan ") +
            "."
          : "."
      }`
    : "Tidak ada desa tersisa dalam antrean prioritas hari ini.";

  return `LAPORAN HARIAN KOORDINASI AIR BERSIH
Tanggal: ${tanggal}
Kabupaten: Sampang dan Bangkalan

RINGKASAN PELAKSANAAN

Pada ${tanggal}, telah dilaksanakan dropping air bersih ke ${data.servedCount} desa terdampak kekeringan di Madura dengan ${data.litersIsEstimate ? "estimasi " : ""}volume ${numID(data.totalLiters)} liter, melayani estimasi ${numID(data.totalKk)} kepala keluarga.

DESA YANG DILAYANI

${desaLines}

ANTREAN MASIH AKTIF

${antreanLine}

REKOMENDASI

Penambahan armada atau penambahan rit diperlukan untuk mengurangi waktu tunggu desa dengan skor prioritas tinggi.

Dibuat otomatis oleh sistem Rekah, ${tanggal} pukul ${jam} WIB.
Petugas wajib meninjau dan menyunting sebelum pengiriman resmi.`;
}

// Dokumen PDF: HTML standalone berformat surat resmi, dicetak via iframe
// tersembunyi → dialog "Save as PDF" browser. Tanpa dependensi.
function buildReportHtml(draft: string, tanggal: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html><html lang="id"><head><meta charset="utf-8" />
<title>Laporan Harian Rekah — ${esc(tanggal)}</title>
<style>
  @page { size: A4; margin: 22mm 20mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #232420; line-height: 1.6; font-size: 12pt; margin: 0; }
  .head { border-bottom: 2px solid #232420; padding-bottom: 10px; margin-bottom: 18px; }
  .brand { font-size: 15pt; font-weight: 700; letter-spacing: -0.01em; }
  .sub { font-size: 9pt; letter-spacing: 0.14em; text-transform: uppercase; color: #5E605A; margin-top: 3px; font-family: 'Courier New', monospace; }
  .meta { font-size: 9pt; color: #5E605A; margin-top: 6px; font-family: 'Courier New', monospace; }
  pre { font-family: Georgia, 'Times New Roman', serif; white-space: pre-wrap; font-size: 11.5pt; margin: 0; }
  .foot { margin-top: 26px; padding-top: 10px; border-top: 1px solid #C9C6BC; font-size: 8.5pt; color: #5E605A; font-family: 'Courier New', monospace; }
</style></head><body>
  <div class="head">
    <div class="brand">Rekah — Koordinasi Air Bersih Madura</div>
    <div class="sub">Laporan Harian Resmi · Bupati / Pemprov</div>
    <div class="meta">Tanggal: ${esc(tanggal)}</div>
  </div>
  <pre>${esc(draft)}</pre>
  <div class="foot">Dokumen dihasilkan sistem Rekah. Prototipe kompetisi TCC Vibe Code 2026 — bukan dokumen resmi BPBD.</div>
</body></html>`;
}

function AgregatCell({
  label,
  value,
  unit,
  icon: Icon,
  tone,
  accent,
}: {
  label: string;
  value: string | number;
  unit: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: string;
  accent: string;
}) {
  return (
    <div className="card rounded-lg px-4 py-3.5 border-l-[3px]" style={{ borderLeftColor: accent }}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={13} className={tone} />
        <span className={`mono-label ${tone}`}>{label}</span>
      </div>
      <div className="text-3xl font-semibold tnum text-[var(--color-tanah-pecah)] leading-none" style={{ fontFamily: "var(--font-heading)" }}>
        {value}
      </div>
      <div className="mono-label normal-case tracking-normal mt-1">{unit}</div>
    </div>
  );
}

export default function DailyReportClient({ data }: { data: DailyReportData }) {
  const router = useRouter();
  const toast = useToast();
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [generated, setGenerated] = useState(false);
  const [editing, setEditing] = useState(false);

  // Susun draf dari data + waktu sekarang (di klien → aman hidrasi).
  const rebuild = useCallback(() => {
    const now = new Date();
    const tgl = formatTanggal(now);
    setTanggal(tgl);
    setDraft(buildNarasi(data, tgl, jamSekarang(now)));
    setGenerated(true);
  }, [data]);

  useEffect(() => {
    rebuild();
  }, [rebuild]);

  async function handleGenerate() {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 1500));
    router.refresh(); // tarik data terbaru dari Supabase
    rebuild();
    setEditing(false);
    setGenerating(false);
    toast.success("Draf laporan harian diperbarui.");
  }

  function handleExport() {
    const html = buildReportHtml(draft, tanggal);
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      toast.error("Gagal menyiapkan PDF.");
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1500);
    };
    toast.info("Membuka dialog cetak — pilih “Simpan sebagai PDF”.");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="mono-label mb-1.5">Draf resmi · Bupati / Pemprov</div>
        <h1
          className="text-3xl font-semibold text-[var(--color-tanah-pecah)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Laporan Harian
        </h1>
      </div>

      {/* Agregat data — nyata dari Supabase (volume = estimasi) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AgregatCell label="Dilayani" value={data.servedCount} unit="desa hari ini" icon={CheckCircle2} tone="text-[var(--color-hijau-tuntas)]" accent="var(--color-hijau-tuntas)" />
        <AgregatCell label="Volume" value={data.totalLiters >= 1000 ? `${(data.totalLiters / 1000).toFixed(1)}K` : numID(data.totalLiters)} unit={data.litersIsEstimate ? "liter (estimasi)" : "liter"} icon={Droplets} tone="text-[var(--color-air-jernih)]" accent="var(--color-air-jernih)" />
        <AgregatCell label="KK Terbantu" value={numID(data.totalKk)} unit="kepala keluarga" icon={Truck} tone="text-[var(--color-lempung)]" accent="var(--color-lempung)" />
        <AgregatCell label="Antrean" value={data.queueCount} unit="belum terlayani" icon={AlertTriangle} tone="text-[var(--color-siaga)]" accent="var(--color-siaga)" />
      </div>

      {/* Generate buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 bg-[var(--color-tanah-pecah)] !text-white text-sm font-medium px-4 py-2.5 rounded-md hover:bg-[var(--color-air-jernih)] disabled:opacity-60 transition-colors shadow-sm"
        >
          {generating ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {generating ? "Menyusun narasi…" : "Generate Draf Baru"}
        </button>

        {generated && (
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 card rounded-md text-[var(--color-tanah-pecah)] text-sm font-medium px-4 py-2.5 hover:border-[var(--color-air-jernih)] hover:text-[var(--color-air-jernih)] transition-colors"
          >
            <Download size={15} />
            Ekspor PDF
          </button>
        )}
      </div>

      {/* Draft editor */}
      {generated && (
        <div className="card rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-kapur-dalam)] bg-[var(--color-kertas-tua)]">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-[var(--color-lempung)]" />
              <span className="mono-label !text-xs">Draf — {tanggal}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="mono-label !text-[0.625rem] !text-[var(--color-siaga)] status-bg-scheduled border px-2 py-0.5 rounded-full">
                Tinjauan Diperlukan
              </span>
              <button
                onClick={() => setEditing(!editing)}
                className="text-sm text-[var(--color-air-jernih)] hover:text-[var(--color-air-tua)] font-medium transition-colors"
              >
                {editing ? "Selesai Sunting" : "Sunting"}
              </button>
            </div>
          </div>

          <div className="p-5">
            {editing ? (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full h-96 text-sm text-[var(--color-tanah-pecah)] bg-[var(--color-kertas-tua)]/60 border border-[var(--color-kapur-dalam)] rounded-md px-4 py-3 focus:outline-none focus:border-[var(--color-air-jernih)] focus:ring-2 focus:ring-[var(--color-air-jernih)]/20 resize-none leading-relaxed"
                style={{ fontFamily: "var(--font-data)" }}
              />
            ) : (
              <pre
                className="text-sm text-[var(--color-tanah-pecah)] whitespace-pre-wrap leading-relaxed"
                style={{ fontFamily: "var(--font-data)" }}
              >
                {draft}
              </pre>
            )}
          </div>

          <div className="px-5 py-3 border-t border-[var(--color-kapur-dalam)] bg-[var(--color-kertas-tua)] mono-label normal-case tracking-normal">
            Draf dibuat otomatis oleh AI.{data.litersIsEstimate ? " Sebagian volume liter berupa estimasi (15 L/KK) karena belum tercatat." : ""} Petugas wajib meninjau &amp; menyunting sebelum dikirim resmi.
          </div>
        </div>
      )}
    </div>
  );
}
