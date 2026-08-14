"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  ShieldCheck,
  ShieldAlert,
  Search,
  Flame,
  MapPin,
  Users,
  Clock,
  ArrowRight,
  X,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { PriorityBar } from "@/components/ui/PriorityIndicator";
import type { ReportStatus } from "@/lib/types";
import type { ReportListItem } from "@/lib/dashboard-data";

const bpbdChip: Record<string, string> = {
  kritis: "bg-[#FBD9D3] text-[#C62828] border-[#E8A99C] font-semibold",
  langka: "bg-[var(--color-kertas-tua)] text-[var(--color-siaga)] border-[#E8C089]",
  terbatas: "bg-[var(--color-kertas-tua)] text-[var(--color-lempung)] border-[var(--color-kapur-garis)]",
};

const filterOptions: { value: ReportStatus | "semua" | "eskalasi"; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "eskalasi", label: "Eskalasi" },
  { value: "pending", label: "Menunggu" },
  { value: "verified", label: "Verifikasi" },
  { value: "scheduled", label: "Jadwal" },
  { value: "done", label: "Selesai" },
];

function timeAgo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  return `${Math.floor(hr / 24)} hari lalu`;
}

export default function ReportsBrowser({
  reports,
  initialFilter = "semua",
  initialVillageId = null,
  initialVillageName = null,
}: {
  reports: ReportListItem[];
  initialFilter?: ReportStatus | "semua" | "eskalasi";
  initialVillageId?: string | null;
  initialVillageName?: string | null;
}) {
  const [filter, setFilter] = useState<ReportStatus | "semua" | "eskalasi">(initialFilter);
  const [search, setSearch] = useState("");
  const [villageId, setVillageId] = useState<string | null>(initialVillageId);

  const escalated = reports.filter((r) => r.escalated).length;

  // Nama desa untuk chip: dari param, atau turunkan dari laporan yang cocok.
  const villageName =
    initialVillageName ??
    reports.find((r) => r.villages?.id === villageId)?.villages?.name ??
    "desa terpilih";

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return reports.filter((l) => {
      if (villageId && l.villages?.id !== villageId) return false;
      if (filter === "eskalasi") {
        if (!l.escalated) return false;
      } else if (filter !== "semua" && l.status !== filter) {
        return false;
      }
      if (q) {
        const name = l.villages?.name?.toLowerCase() ?? "";
        const district = l.villages?.district?.toLowerCase() ?? "";
        if (!name.includes(q) && !district.includes(q)) return false;
      }
      return true;
    });
  }, [reports, filter, search, villageId]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="mono-label mb-1.5">Antrean · seluruh desa</div>
          <h1
            className="text-3xl font-semibold text-[var(--color-tanah-pecah)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Laporan Masuk
          </h1>
        </div>
        {escalated > 0 && (
          <div className="flex items-center gap-1.5 card rounded-md border-l-[3px] border-l-[var(--color-genting)] text-[var(--color-genting)] mono-label !text-[0.625rem] px-3 py-2 !bg-[#F1DDDA]">
            <Flame size={12} />
            {escalated} eskalasi aktif
          </div>
        )}
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-lempung)] pointer-events-none" />
          <input
            type="text"
            placeholder="Cari desa atau kecamatan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-kertas)] border border-[var(--color-kapur-dalam)] rounded-md text-sm text-[var(--color-tanah-pecah)] placeholder:text-[var(--color-lempung)] focus:outline-none focus:border-[var(--color-air-jernih)] focus:ring-2 focus:ring-[var(--color-air-jernih)]/20 transition-all"
          />
        </div>
        <div className="inline-flex items-center p-1 bg-[var(--color-kertas-tua)] border border-[var(--color-kapur-dalam)] rounded-md gap-1 overflow-x-auto">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                filter === opt.value
                  ? opt.value === "eskalasi"
                    ? "bg-[var(--color-genting)] text-white shadow-[var(--shadow-sink)]"
                    : "bg-[var(--color-tanah-pecah)] text-white shadow-[var(--shadow-sink)]"
                  : opt.value === "eskalasi"
                    ? "text-[var(--color-genting)] hover:bg-[#FBF1EF]"
                    : "text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <p className="mono-label">
          {filtered.length} / {reports.length} laporan
        </p>
        {villageId && (
          <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-[var(--color-air-muda)] border border-[#A9C3CC] text-[var(--color-air-jernih)] text-xs font-medium">
            <MapPin size={11} className="shrink-0" />
            Desa: {villageName}
            <button
              onClick={() => setVillageId(null)}
              aria-label="Hapus filter desa"
              className="p-0.5 rounded hover:bg-[#A9C3CC]/50 transition-colors"
            >
              <X size={12} />
            </button>
          </span>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card rounded-lg text-center py-16 text-[var(--color-lempung)]">
            <MessageCircle size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Tidak ada laporan yang sesuai filter.</p>
          </div>
        ) : (
          filtered.map((l) => {
            const verified = l.phoneVerified;
            const score = l.priority_scores?.[0]?.score;
            const category = l.villages?.bpbd_category ?? null;
            return (
              <Link
                key={l.id}
                href={`/dashboard/reports/${l.id}`}
                className={`card card-lift rounded-lg px-5 py-4 block group ${l.escalated ? "border-l-[3px] border-l-[var(--color-genting)]" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {l.escalated && <Flame size={15} className="text-[var(--color-genting)] shrink-0" />}
                      <h3
                        className="text-lg font-semibold text-[var(--color-tanah-pecah)] group-hover:text-[var(--color-air-jernih)] transition-colors"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {l.villages?.name ?? "Desa belum terdeteksi"}
                      </h3>
                      {verified ? (
                        <ShieldCheck size={14} className="text-[var(--color-air-jernih)] shrink-0" />
                      ) : (
                        <ShieldAlert size={14} className="text-[var(--color-siaga)] shrink-0" />
                      )}
                      {category && (
                        <span className={`mono-label !text-[0.625rem] px-1.5 py-0.5 rounded border capitalize ${bpbdChip[category]}`}>
                          {category}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 flex-wrap mono-label normal-case tracking-normal">
                      {l.villages && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="shrink-0" />
                          {l.villages.district}, {l.villages.regency}
                        </span>
                      )}
                      {l.estimated_households != null && (
                        <span className="flex items-center gap-1">
                          <Users size={11} className="shrink-0" />
                          {l.estimated_households.toLocaleString("id-ID")} KK
                        </span>
                      )}
                      {l.duration_days != null && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="shrink-0" />
                          {l.duration_days} hari
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MessageCircle size={11} className="shrink-0" />
                        {l.source.toUpperCase()} · {timeAgo(l.created_at)}
                      </span>
                    </div>

                    <p className="mt-2.5 text-sm text-[var(--color-tanah-muda)] line-clamp-1 italic border-l-2 border-[var(--color-kapur-garis)] pl-3">
                      {l.raw_text}
                    </p>

                    {typeof score === "number" && (
                      <div className="mt-3 max-w-xs">
                        <PriorityBar skor={score} />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusBadge status={l.status} size="sm" />
                    {l.ai_confidence != null && (
                      <span className="mono-label !text-[0.625rem]">AI {Math.round(l.ai_confidence * 100)}%</span>
                    )}
                    <ArrowRight size={16} className="text-[var(--color-lempung)] group-hover:text-[var(--color-air-jernih)] group-hover:translate-x-0.5 transition-all mt-1" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
