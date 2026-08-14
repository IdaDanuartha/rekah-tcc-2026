import { ArrowLeft, MapPin, Droplets, CheckCircle2, Clock, FileText, Truck, MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import CrackPattern from "@/components/ui/CrackPattern";
import { getVillage } from "@/lib/dashboard-data";
import { parsePhones } from "@/lib/reporter-session";
import type { DropStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const kategoriChip: Record<string, string> = {
  kritis: "text-[var(--color-genting)] border-[#E0A99C]",
  langka: "text-[var(--color-siaga)] border-[#E8C089]",
  terbatas: "text-[var(--color-lempung)] border-[var(--color-kapur-garis)]",
};
const kategoriAccent: Record<string, string> = {
  kritis: "var(--color-genting)",
  langka: "var(--color-siaga)",
  terbatas: "var(--color-lempung)",
};
const dropLabel: Record<DropStatus, string> = {
  scheduled: "Dijadwalkan",
  in_transit: "Perjalanan",
  done: "Selesai",
};

function lastDropping(iso: string | null): string {
  if (!iso) return "Belum pernah";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  return `${days} hari lalu`;
}

function progressFromSchedules(statuses: DropStatus[]): number {
  if (statuses.includes("done")) return 100;
  if (statuses.includes("in_transit")) return 60;
  if (statuses.includes("scheduled")) return 30;
  return 0;
}

export default async function VillageDetailPage({ params }: PageProps<"/dashboard/villages/[id]">) {
  const { id } = await params;
  const village = await getVillage(id);
  if (!village) notFound();

  const category = village.bpbd_category ?? "";
  const progress = progressFromSchedules(village.schedules.map((s) => s.status));
  const phones = parsePhones(village.registered_phone);

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/dashboard/villages"
        className="inline-flex items-center gap-1.5 mono-label hover:text-[var(--color-tanah-pecah)] transition-colors"
      >
        <ArrowLeft size={14} />
        Kembali ke Data Desa
      </Link>

      {/* Header */}
      <div className="card rounded-lg overflow-hidden border-l-[3px]" style={{ borderLeftColor: kategoriAccent[category] ?? "var(--color-kapur-garis)" }}>
        <div className="px-6 py-5 bg-[var(--color-kertas-tua)]/60 border-b border-[var(--color-kapur-dalam)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mono-label mb-1.5">Profil desa terdampak</div>
              <h1 className="text-3xl font-semibold text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
                {village.name}
              </h1>
              <div className="flex items-center gap-1.5 mono-label normal-case tracking-normal mt-1.5">
                <MapPin size={12} className="shrink-0" />
                Kec. {village.district}, Kab. {village.regency}
              </div>
            </div>
            {category && (
              <span className={`shrink-0 mono-label !text-[0.625rem] px-2.5 py-1 rounded border bg-[var(--color-kertas)] ${kategoriChip[category]}`}>
                BPBD: {category}
              </span>
            )}
          </div>
          <div className="mt-4 flex justify-center">
            <CrackPattern progress={progress} width={320} height={90} />
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-[var(--color-kapur-dalam)]">
          <div className="px-5 py-4">
            <div className="mono-label mb-1">Koordinat</div>
            <div className="text-sm font-medium text-[var(--color-tanah-pecah)] tnum" style={{ fontFamily: "var(--font-data)" }}>
              {village.lat != null && village.lng != null ? `${village.lat}, ${village.lng}` : "—"}
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="mono-label mb-1.5">
              Nomor WA Pelapor {phones.length > 1 && <span className="text-[var(--color-air-jernih)]">({phones.length})</span>}
            </div>
            {phones.length === 0 ? (
              <div className="text-sm font-medium text-[var(--color-lempung)]">—</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {phones.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 tnum text-xs font-medium text-[var(--color-tanah-pecah)] bg-[var(--color-air-muda)] border border-[#A9C3CC] px-2 py-0.5 rounded-full"
                    style={{ fontFamily: "var(--font-data)" }}
                  >
                    <MessageCircle size={10} className="shrink-0 text-[var(--color-air-jernih)]" />
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="px-5 py-4">
            <div className="mono-label mb-1">Dropping Terakhir</div>
            <div className="flex items-center gap-1 text-sm font-medium text-[var(--color-tanah-pecah)]">
              <Droplets size={13} className="text-[var(--color-air-jernih)]" />
              {lastDropping(village.last_dropping_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Riwayat dropping */}
      <section className="card rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-kapur-dalam)] bg-[var(--color-kertas-tua)]">
          <h2 className="mono-label !text-xs">Riwayat Dropping</h2>
        </div>
        <div className="divide-y divide-[var(--color-kapur-dalam)]">
          {village.schedules.length === 0 ? (
            <div className="text-center py-10 text-[var(--color-lempung)] text-sm">Belum ada jadwal dropping.</div>
          ) : (
            village.schedules.map((s) => {
              const isDone = s.status === "done";
              return (
                <div key={s.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center ${isDone ? "bg-[var(--color-hijau-muda)]" : "bg-[var(--color-air-muda)]"}`}>
                      {isDone ? (
                        <CheckCircle2 size={16} className="text-[var(--color-hijau-tuntas)]" />
                      ) : (
                        <Clock size={16} className="text-[var(--color-air-jernih)]" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[var(--color-tanah-pecah)]">
                        {s.fleet}
                        {s.delivery_proofs?.[0] && (
                          <span className="mono-label normal-case tracking-normal ml-2 text-[var(--color-hijau-tuntas)]">· bukti terekam</span>
                        )}
                      </div>
                      <div className="mono-label normal-case tracking-normal mt-0.5">
                        {new Date(s.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                      {s.delivery_proofs?.[0]?.nfc_tag_id && (
                        <div className="mono-label normal-case tracking-normal mt-0.5 text-[var(--color-air-jernih)]">
                          NFC {s.delivery_proofs[0].nfc_tag_id}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`mono-label !text-[0.625rem] px-2 py-1 rounded-full border ${isDone ? "text-[var(--color-hijau-tuntas)] border-[#86C7A2] bg-[var(--color-hijau-muda)]" : "text-[var(--color-air-jernih)] border-[#9ECADC] bg-[var(--color-air-muda)]"}`}>
                    {dropLabel[s.status]}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Quick actions */}
      <div className="flex gap-3 flex-wrap">
        <Link
          href={`/dashboard/reports?village=${village.id}&name=${encodeURIComponent(village.name)}`}
          className="inline-flex items-center gap-2 bg-[var(--color-tanah-pecah)] !text-white text-sm font-medium px-4 py-2.5 rounded-md hover:bg-[var(--color-air-jernih)] transition-colors shadow-sm"
        >
          <FileText size={15} />
          Lihat Laporan ({village.reports.length})
        </Link>
        <Link
          href="/dashboard/schedule"
          className="inline-flex items-center gap-2 card rounded-md text-[var(--color-tanah-pecah)] text-sm font-medium px-4 py-2.5 hover:border-[var(--color-air-jernih)] hover:text-[var(--color-air-jernih)] transition-colors"
        >
          <Truck size={15} />
          Jadwalkan Dropping
        </Link>
      </div>
    </div>
  );
}
