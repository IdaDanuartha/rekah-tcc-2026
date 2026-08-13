import {
  Clock,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Flame,
  MapPin,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import { getOverview } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  return `${Math.floor(hr / 24)} hari lalu`;
}

const dropLabel: Record<string, string> = {
  scheduled: "Dijadwalkan",
  in_transit: "Perjalanan",
  done: "Selesai",
};

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
  accent,
  href,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: string;
  accent: string;
  href?: string;
}) {
  const inner = (
    <div
      className={`card rounded-lg p-5 border-l-[3px] h-full ${href ? "card-lift cursor-pointer" : ""}`}
      style={{ borderLeftColor: accent }}
    >
      <div className="flex items-center justify-between">
        <span className="mono-label">{label}</span>
        <Icon size={16} className={tone} />
      </div>
      <div
        className="text-4xl font-semibold tnum text-[var(--color-tanah-pecah)] mt-3 leading-none"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {value}
      </div>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

export default async function DashboardPage() {
  const { counts, escalated, latestReports, todaySchedules } = await getOverview();

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="mono-label mb-1.5">{today}</div>
          <h1
            className="text-3xl font-semibold text-[var(--color-tanah-pecah)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Ringkasan Operasi
          </h1>
        </div>
        <Link
          href="/dashboard/schedule"
          className="group inline-flex items-center gap-2 bg-[var(--color-tanah-pecah)] !text-white text-sm font-medium pl-4 pr-3.5 py-2 rounded-md hover:bg-[var(--color-air-jernih)] hover:!text-white transition-colors shadow-sm"
        >
          Jadwalkan dropping
          <Plus size={15} />
        </Link>
      </div>

      {/* Eskalasi alert */}
      {escalated > 0 && (
        <div className="card rounded-lg border-l-[3px] border-l-[var(--color-genting)] px-5 py-4 flex items-start gap-3 !bg-[#F1DDDA]">
          <AlertTriangle size={18} className="text-[var(--color-genting)] shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-[var(--color-genting)]">
              {escalated} laporan melewati SLA 12 jam
            </div>
            <p className="text-sm text-[var(--color-tanah-muda)] mt-0.5">
              Belum mendapat respons lebih dari 12 jam. Tinjau segera.
            </p>
          </div>
          <Link
            href="/dashboard/reports?filter=pending"
            className="shrink-0 text-sm font-medium text-[var(--color-genting)] hover:underline flex items-center gap-1"
          >
            Tinjau <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Menunggu" value={counts.pending} icon={Clock} tone="text-[var(--color-siaga)]" accent="var(--color-siaga)" href="/dashboard/reports?filter=pending" />
        <MetricCard label="Terverifikasi" value={counts.verified} icon={ShieldCheck} tone="text-[var(--color-air-jernih)]" accent="var(--color-air-jernih)" href="/dashboard/reports?filter=verified" />
        <MetricCard label="Dijadwalkan" value={counts.scheduled} icon={Truck} tone="text-[var(--color-air-jernih)]" accent="var(--color-air-tua)" href="/dashboard/schedule" />
        <MetricCard label="Selesai" value={counts.done} icon={CheckCircle2} tone="text-[var(--color-hijau-tuntas)]" accent="var(--color-hijau-tuntas)" href="/dashboard/reports?filter=done" />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Laporan terbaru */}
        <section className="card rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-kapur-dalam)] bg-[var(--color-kertas-tua)]">
            <h2 className="mono-label !text-xs">Laporan Terbaru</h2>
            <Link href="/dashboard/reports" className="text-xs font-medium text-[var(--color-air-jernih)] hover:text-[var(--color-air-tua)] flex items-center gap-1">
              Semua <ArrowRight size={12} />
            </Link>
          </div>

          <div className="divide-y divide-[var(--color-kapur-dalam)]">
            {latestReports.length === 0 ? (
              <div className="text-center py-10 text-[var(--color-lempung)] text-sm">Belum ada laporan.</div>
            ) : (
              latestReports.map((l) => (
                <Link
                  key={l.id}
                  href={`/dashboard/reports/${l.id}`}
                  className="flex items-start justify-between gap-3 px-5 py-3.5 hover:bg-[var(--color-kertas-tua)]/60 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {l.escalated && <Flame size={13} className="text-[var(--color-genting)] shrink-0" />}
                      <span className="text-sm font-semibold text-[var(--color-tanah-pecah)] truncate group-hover:text-[var(--color-air-jernih)] transition-colors">
                        {l.villages?.name ?? "Desa belum terdeteksi"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mono-label normal-case tracking-normal mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin size={10} className="shrink-0" />
                        {l.villages?.district ?? "—"}
                      </span>
                      <span className="text-[var(--color-kapur-garis)]">·</span>
                      {timeAgo(l.created_at)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <StatusBadge status={l.status} size="sm" />
                    {typeof l.priority_scores?.[0]?.score === "number" && (
                      <span className="mono-label !text-[0.625rem] text-[var(--color-genting)]">
                        Skor {l.priority_scores[0].score}
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Jadwal hari ini */}
        <section className="card rounded-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-kapur-dalam)] bg-[var(--color-kertas-tua)]">
            <h2 className="mono-label !text-xs">Jadwal Hari Ini</h2>
            <Link href="/dashboard/schedule" className="text-xs font-medium text-[var(--color-air-jernih)] hover:text-[var(--color-air-tua)] flex items-center gap-1">
              Semua <ArrowRight size={12} />
            </Link>
          </div>

          <div className="divide-y divide-[var(--color-kapur-dalam)] flex-1">
            {todaySchedules.length === 0 ? (
              <div className="text-center py-10 text-[var(--color-lempung)] text-sm">Tidak ada jadwal hari ini.</div>
            ) : (
              todaySchedules.map((j) => {
                const isJalan = j.status === "in_transit";
                return (
                  <div
                    key={j.id}
                    className={`flex items-start justify-between gap-3 px-5 py-3.5 ${
                      isJalan ? "border-l-[3px] border-l-[var(--color-air-jernih)] bg-[var(--color-air-muda)]/40" : ""
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Truck size={14} className={isJalan ? "text-[var(--color-air-jernih)] animate-pulse-soft" : "text-[var(--color-lempung)]"} />
                        <span className="text-sm font-semibold text-[var(--color-tanah-pecah)]">
                          {j.villages?.name ?? "—"}
                        </span>
                      </div>
                      <div className="mono-label normal-case tracking-normal mt-1 ml-6">
                        {j.villages?.district ?? "—"} · {j.fleet}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`mono-label !text-[0.625rem] ${isJalan ? "text-[var(--color-air-jernih)]" : "text-[var(--color-lempung)]"}`}>
                        {dropLabel[j.status] ?? j.status}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Link
            href="/dashboard/schedule"
            className="flex items-center justify-center gap-2 m-3 py-2.5 rounded-md border border-dashed border-[var(--color-kapur-garis)] text-sm text-[var(--color-lempung)] hover:border-[var(--color-air-jernih)] hover:text-[var(--color-air-jernih)] transition-all"
          >
            <Plus size={14} />
            Tambah jadwal dropping
          </Link>
        </section>
      </div>
    </div>
  );
}
