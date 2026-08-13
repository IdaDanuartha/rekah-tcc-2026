import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileText,
} from "lucide-react";
import StatusBadge, { VerifBadge } from "@/components/ui/StatusBadge";
import PriorityIndicator from "@/components/ui/PriorityIndicator";
import CrackPattern from "@/components/ui/CrackPattern";
import ReportActions from "@/components/dashboard/ReportActions";
import RescoreButton from "@/components/dashboard/RescoreButton";
import { getReport } from "@/lib/dashboard-data";
import type { ReportStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const kategoriColor: Record<string, string> = {
  kritis: "text-[var(--color-genting)]",
  langka: "text-[var(--color-siaga)]",
  terbatas: "text-[var(--color-lempung)]",
};

const progressMap: Record<ReportStatus, number> = {
  pending: 5,
  verified: 25,
  scheduled: 60,
  done: 100,
};

export default async function ReportDetailPage({
  params,
}: PageProps<"/dashboard/reports/[id]">) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) notFound();

  const village = report.villages;
  const score = report.priority_scores?.[0];
  const verified = report.phoneVerified;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/dashboard/reports"
        className="inline-flex items-center gap-1.5 mono-label hover:text-[var(--color-tanah-pecah)] transition-colors"
      >
        <ArrowLeft size={14} />
        Kembali ke Laporan
      </Link>

      {/* Header card */}
      <div className="card rounded-lg overflow-hidden border-l-[3px] border-l-[var(--color-genting)]">
        <div className="px-6 py-5 bg-[var(--color-kertas-tua)]/60 border-b border-[var(--color-kapur-dalam)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mono-label mb-1.5">Laporan #{report.id.slice(0, 8)}</div>
              <h1
                className="text-3xl font-semibold text-[var(--color-tanah-pecah)]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {village?.name ?? "Desa belum terdeteksi"}
              </h1>
              {village && (
                <div className="flex items-center gap-1.5 mono-label normal-case tracking-normal mt-1.5">
                  <MapPin size={12} className="shrink-0" />
                  {village.district}, {village.regency}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={report.status} />
              <VerifBadge verified={verified} />
              {report.status === "done" && (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    report.received_ok === true
                      ? "bg-[var(--color-hijau-muda)] text-[var(--color-hijau-tuntas)]"
                      : report.received_ok === false
                        ? "bg-[#F1DDDA] text-[var(--color-genting)]"
                        : "bg-[var(--color-kertas-tua)] text-[var(--color-lempung)]"
                  }`}
                >
                  {report.received_ok === true
                    ? "✓ Warga konfirmasi diterima"
                    : report.received_ok === false
                      ? "✗ Warga: belum diterima"
                      : "Menunggu konfirmasi warga"}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <CrackPattern progress={progressMap[report.status] ?? 0} width={320} height={90} />
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Teks laporan asli */}
          <div>
            <div className="mono-label flex items-center gap-1.5 mb-2">
              <MessageCircle size={12} />
              Laporan Asli
            </div>
            <div className="bg-[var(--color-kertas-tua)]/60 rounded-md px-4 py-3 text-sm text-[var(--color-tanah-pecah)] italic border-l-2 border-[var(--color-kapur-garis)]">
              &ldquo;{report.raw_text}&rdquo;
            </div>
            <div className="flex items-center gap-3 mt-2 flex-wrap mono-label normal-case tracking-normal">
              <span className="flex items-center gap-1">
                <MessageCircle size={11} />
                {report.source.toUpperCase()} · {report.phone ?? "—"}
              </span>
              {verified ? (
                <span className="flex items-center gap-1 text-[var(--color-air-jernih)]">
                  <ShieldCheck size={11} />
                  Nomor resmi terdaftar
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[var(--color-siaga)]">
                  <ShieldAlert size={11} />
                  Perlu tinjauan manual
                </span>
              )}
            </div>
          </div>

          {/* Data terstruktur */}
          <div className="space-y-3">
            <div className="mono-label flex items-center gap-1.5">
              <FileText size={12} />
              Data Terstruktur (AI)
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--color-kertas-tua)]/60 rounded-md px-3 py-2.5 border border-[var(--color-kapur-dalam)]">
                <div className="mono-label">Terdampak</div>
                <div className="text-2xl font-semibold tnum text-[var(--color-tanah-pecah)] mt-0.5" style={{ fontFamily: "var(--font-data)" }}>
                  {report.estimated_households?.toLocaleString("id-ID") ?? "—"}
                  <span className="text-sm font-normal ml-1">KK</span>
                </div>
              </div>
              <div className="bg-[var(--color-kertas-tua)]/60 rounded-md px-3 py-2.5 border border-[var(--color-kapur-dalam)]">
                <div className="mono-label">Durasi</div>
                <div className="text-2xl font-semibold tnum text-[var(--color-tanah-pecah)] mt-0.5" style={{ fontFamily: "var(--font-data)" }}>
                  {report.duration_days ?? "—"}
                  <span className="text-sm font-normal ml-1">hari</span>
                </div>
              </div>
            </div>

            <div className="divide-y divide-[var(--color-kapur-dalam)] border-t border-[var(--color-kapur-dalam)]">
              <div className="flex items-center justify-between py-2 text-sm">
                <span className="mono-label normal-case tracking-normal">Kategori BPBD</span>
                <span className={`font-semibold capitalize ${kategoriColor[village?.bpbd_category ?? ""] ?? "text-[var(--color-lempung)]"}`}>
                  {village?.bpbd_category ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 text-sm">
                <span className="mono-label normal-case tracking-normal">Harga air mandiri</span>
                <span className="text-[var(--color-tanah-pecah)] font-medium tnum" style={{ fontFamily: "var(--font-data)" }}>
                  {report.water_price != null
                    ? `Rp${report.water_price.toLocaleString("id-ID")}/tangki`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 text-sm">
                <span className="mono-label normal-case tracking-normal">Keyakinan AI</span>
                <span className="text-[var(--color-tanah-pecah)] font-medium tnum" style={{ fontFamily: "var(--font-data)" }}>
                  {report.ai_confidence != null ? `${Math.round(report.ai_confidence * 100)}%` : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skor prioritas */}
      <div className="card rounded-lg px-6 py-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="mono-label">Skor Prioritas</div>
          <RescoreButton reportId={report.id} hasScore={Boolean(score)} />
        </div>
        {score ? (
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <PriorityIndicator skor={score.score} size="lg" />
            <div className="flex-1">
              <div className="mono-label mb-2">Alasan Skor</div>
              <p className="text-sm text-[var(--color-tanah-pecah)] leading-relaxed">{score.reason}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-lempung)]">
            Skor belum dihitung. Klik “Hitung skor” untuk menghitung prioritas laporan ini.
          </p>
        )}
      </div>

      {/* Eskalasi alert */}
      {report.escalated && (
        <div className="card rounded-lg border-l-[3px] border-l-[var(--color-genting)] px-5 py-4 flex items-start gap-3 !bg-[#F1DDDA]">
          <AlertTriangle size={18} className="text-[var(--color-genting)] shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-[var(--color-genting)]">Laporan ini melewati SLA 12 jam</div>
            <p className="text-sm text-[var(--color-tanah-muda)] mt-0.5">
              Laporan masuk pada {new Date(report.created_at).toLocaleString("id-ID")} dan belum mendapat respons.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <ReportActions reportId={report.id} status={report.status} hasVillage={Boolean(report.village_id)} />
    </div>
  );
}
