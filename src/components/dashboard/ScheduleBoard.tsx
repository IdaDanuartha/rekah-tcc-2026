"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  Truck,
  Plus,
  CheckCircle2,
  Clock,
  Navigation,
  Loader2,
  MapPin,
  Droplets,
  X,
  Copy,
  Radio,
} from "lucide-react";
import { createSchedule, updateScheduleStatus } from "@/lib/dashboard-actions";
import { useToast } from "@/components/ui/Toast";
import TrackPanel from "@/components/tracking/TrackPanel";
import Combobox from "@/components/ui/Combobox";
import type { DropStatus } from "@/lib/types";
import type { ScheduleListItem } from "@/lib/dashboard-data";

const statusConfig: Record<
  DropStatus,
  { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string; bg: string; accent: string }
> = {
  scheduled: { label: "Dijadwalkan", icon: Clock, color: "text-[var(--color-siaga)]", bg: "status-bg-scheduled", accent: "var(--color-siaga)" },
  in_transit: { label: "Perjalanan", icon: Truck, color: "text-[var(--color-air-jernih)]", bg: "status-bg-verified", accent: "var(--color-air-jernih)" },
  done: { label: "Selesai", icon: CheckCircle2, color: "text-[var(--color-hijau-tuntas)]", bg: "status-bg-done", accent: "var(--color-hijau-tuntas)" },
};

const inputClass =
  "w-full px-3 py-2.5 bg-[var(--color-kertas)] border border-[var(--color-kapur-dalam)] rounded-md text-sm text-[var(--color-tanah-pecah)] focus:outline-none focus:border-[var(--color-air-jernih)] focus:ring-2 focus:ring-[var(--color-air-jernih)]/20 transition-all";

interface VillageOption {
  id: string;
  name: string;
  district: string;
}

export default function ScheduleBoard({
  schedules,
  villages,
}: {
  schedules: ScheduleListItem[];
  villages: VillageOption[];
}) {
  const [showModal, setShowModal] = useState(false);
  const [showRoute, setShowRoute] = useState(false);
  const [tab, setTab] = useState<"hari-ini" | "semua">("hari-ini");
  const [createState, createAction, creating] = useActionState(createSchedule, null);
  const [statusPending, startStatus] = useTransition();
  const [trackOpen, setTrackOpen] = useState<string | null>(null);
  const [confirmDone, setConfirmDone] = useState<ScheduleListItem | null>(null);
  const toast = useToast();

  async function copyDriverLink(id: string) {
    const url = `${window.location.origin}/track/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link sopir disalin. Kirim ke armada via WA.");
    } catch {
      toast.error("Gagal menyalin link.");
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const shown = tab === "hari-ini" ? schedules.filter((s) => s.date === today) : schedules;

  // "Rute" = daftar jadwal aktif (scheduled/in_transit) urut tanggal — tanpa AI (key kosong)
  const route = schedules.filter((s) => s.status !== "done").slice(0, 5);

  // Tutup modal + toast saat hasil createSchedule berubah
  const lastCreate = useRef(createState);
  useEffect(() => {
    if (createState === lastCreate.current) return;
    lastCreate.current = createState;
    if (!createState) return;
    if (createState.ok) {
      setShowModal(false);
      toast.success("Jadwal dropping ditambahkan.");
    } else {
      toast.error(createState.error);
    }
  }, [createState, toast]);

  function setStatus(id: string, status: DropStatus) {
    startStatus(async () => {
      const res = await updateScheduleStatus(id, status);
      if (res.ok) {
        toast.success(
          status === "in_transit" ? "Armada diberangkatkan." : "Dropping ditandai selesai.",
        );
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="mono-label mb-1.5">Armada & pengiriman</div>
          <h1 className="text-3xl font-semibold text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
            Jadwal Dropping
          </h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-[var(--color-tanah-pecah)] !text-white text-sm font-medium pl-4 pr-3.5 py-2.5 rounded-md hover:bg-[var(--color-air-jernih)] transition-colors shadow-sm shrink-0"
        >
          <Plus size={15} />
          Tambah Jadwal
        </button>
      </div>

      {/* Rute aktif */}
      <div className="card rounded-lg overflow-hidden border-l-[3px] border-l-[var(--color-siaga)]">
        <div className="px-5 py-4 flex items-start justify-between gap-4">
          <div>
            <div className="mono-label !text-[var(--color-siaga)] mb-1.5">Rute pengiriman</div>
            <h2 className="text-lg font-semibold text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
              Urutan Armada Aktif
            </h2>
            <p className="text-sm text-[var(--color-lempung)] mt-1 max-w-md">
              Daftar dropping yang belum selesai, urut tanggal terdekat.
            </p>
          </div>
          <button
            onClick={() => setShowRoute((v) => !v)}
            className="inline-flex items-center gap-2 bg-[var(--color-siaga)] !text-white text-sm font-medium px-4 py-2.5 rounded-md hover:bg-[#A55F19] transition-colors shrink-0"
          >
            <Navigation size={15} />
            {showRoute ? "Sembunyikan" : "Lihat Rute"}
          </button>
        </div>

        {showRoute && (
          <div className="border-t border-[var(--color-kapur-dalam)] bg-[var(--color-kertas-tua)]/50 px-5 py-4">
            {route.length === 0 ? (
              <p className="text-sm text-[var(--color-lempung)]">Tidak ada dropping aktif.</p>
            ) : (
              <div className="space-y-2">
                {route.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-3 card rounded-md px-4 py-3">
                    <div className="w-7 h-7 rounded-md bg-[var(--color-air-jernih)] text-white text-xs font-bold flex items-center justify-center shrink-0 tnum" style={{ fontFamily: "var(--font-data)" }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[var(--color-tanah-pecah)]">
                        {r.villages?.name ?? "—"}
                        <span className="mono-label normal-case tracking-normal ml-2">Kec. {r.villages?.district ?? "—"}</span>
                      </div>
                      <div className="mono-label normal-case tracking-normal mt-0.5">{r.fleet} · {statusConfig[r.status].label}</div>
                    </div>
                    <div className="text-sm font-semibold text-[var(--color-air-jernih)] shrink-0 tnum" style={{ fontFamily: "var(--font-data)" }}>
                      {new Date(r.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab */}
      <div className="inline-flex items-center p-1 bg-[var(--color-kertas-tua)] border border-[var(--color-kapur-dalam)] rounded-md gap-1">
        {(["hari-ini", "semua"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${
              tab === t ? "bg-[var(--color-tanah-pecah)] text-white shadow-[var(--shadow-sink)]" : "text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)]"
            }`}
          >
            {t === "hari-ini" ? "Hari Ini" : "Semua Jadwal"}
          </button>
        ))}
      </div>

      {/* Jadwal list */}
      <div className="space-y-2">
        {shown.length === 0 ? (
          <div className="card rounded-lg text-center py-12 text-[var(--color-lempung)]">
            <Truck size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{tab === "hari-ini" ? "Tidak ada jadwal hari ini." : "Belum ada jadwal."}</p>
          </div>
        ) : (
          shown.map((j) => {
            const config = statusConfig[j.status];
            const Icon = config.icon;
            const isJalan = j.status === "in_transit";
            return (
              <div key={j.id} className="space-y-2">
              <div className="card rounded-lg px-5 py-4 flex items-center gap-4 border-l-[3px]" style={{ borderLeftColor: config.accent }}>
                <div className={`rounded-md p-2.5 border ${config.bg}`}>
                  <Icon size={18} className={`${config.color} ${isJalan ? "animate-pulse-soft" : ""}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--color-tanah-pecah)]">
                    {j.villages?.name ?? "—"}
                  </div>
                  <div className="flex items-center gap-2 mono-label normal-case tracking-normal mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1"><MapPin size={10} />{j.villages?.district ?? "—"}</span>
                    <span className="text-[var(--color-kapur-garis)]">·</span>
                    {j.fleet}
                    <span className="text-[var(--color-kapur-garis)]">·</span>
                    {new Date(j.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`mono-label !text-[0.625rem] ${config.color}`}>{config.label}</span>
                  {j.status !== "done" && (
                    <button onClick={() => copyDriverLink(j.id)} title="Salin link sopir" className="p-1.5 rounded-md border border-[var(--color-kapur-dalam)] text-[var(--color-lempung)] hover:text-[var(--color-air-jernih)] hover:border-[var(--color-air-jernih)] transition-colors">
                      <Copy size={13} />
                    </button>
                  )}
                  {j.status === "in_transit" && (
                    <button
                      onClick={() => setTrackOpen(trackOpen === j.id ? null : j.id)}
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${
                        trackOpen === j.id
                          ? "bg-[var(--color-air-jernih)] text-white border-[var(--color-air-jernih)]"
                          : "text-[var(--color-air-jernih)] border-[#9ECADC] hover:bg-[var(--color-air-muda)]"
                      }`}
                    >
                      <Radio size={12} /> Lacak
                    </button>
                  )}
                  {j.status === "scheduled" && (
                    <button onClick={() => setStatus(j.id, "in_transit")} disabled={statusPending} className="text-xs font-medium text-[var(--color-air-jernih)] border border-[#9ECADC] bg-[var(--color-air-muda)] px-2.5 py-1 rounded-md hover:bg-[var(--color-air-jernih)] hover:text-white disabled:opacity-50 transition-colors">
                      Berangkatkan
                    </button>
                  )}
                  {j.status === "in_transit" && (
                    <button onClick={() => setConfirmDone(j)} disabled={statusPending} className="text-xs font-medium text-[var(--color-hijau-tuntas)] border border-[#86C7A2] bg-[var(--color-hijau-muda)] px-2.5 py-1 rounded-md hover:bg-[var(--color-hijau-tuntas)] hover:text-white disabled:opacity-50 transition-colors">
                      Tandai selesai
                    </button>
                  )}
                </div>
              </div>
              {trackOpen === j.id && <TrackPanel scheduleId={j.id} />}
              </div>
            );
          })
        )}
      </div>

      {/* Modal tambah jadwal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--color-tanah-pecah)]/40 backdrop-blur-[1px]" onClick={() => setShowModal(false)} />
          <div className="relative card rounded-xl shadow-[var(--shadow-float)] w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
                Tambah Jadwal Dropping
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)]">
                <X size={18} />
              </button>
            </div>

            <form action={createAction} className="space-y-4">
              <div>
                <label className="mono-label block mb-1">Desa</label>
                <Combobox
                  name="villageId"
                  required
                  placeholder="Pilih desa…"
                  options={villages.map((v) => ({ value: v.id, label: `${v.name} — ${v.district}` }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mono-label block mb-1">Armada / Tangki</label>
                  <input type="text" name="fleet" placeholder="cth: Tangki-01" required className={inputClass} />
                </div>
                <div>
                  <label className="mono-label block mb-1">Volume (liter)</label>
                  <input type="number" name="volume_liters" min="0" inputMode="numeric" placeholder="cth: 5000" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="mono-label block mb-1">Tanggal</label>
                <input type="date" name="date" required className={inputClass} />
              </div>
              {createState && !createState.ok && (
                <p className="text-xs text-[var(--color-genting)]">{createState.error}</p>
              )}
              <button
                type="submit"
                disabled={creating}
                className="w-full inline-flex items-center justify-center gap-2 bg-[var(--color-tanah-pecah)] !text-white text-sm font-medium py-2.5 rounded-md hover:bg-[var(--color-air-jernih)] disabled:opacity-60 transition-colors"
              >
                {creating ? <Loader2 size={15} className="animate-spin" /> : <Droplets size={15} />}
                {creating ? "Menyimpan…" : "Simpan Jadwal"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Konfirmasi tandai selesai */}
      {confirmDone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--color-tanah-pecah)]/40 backdrop-blur-[1px]" onClick={() => setConfirmDone(null)} />
          <div className="relative card rounded-xl shadow-[var(--shadow-float)] w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-full bg-[var(--color-hijau-muda)] flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} className="text-[var(--color-hijau-tuntas)]" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
                  Tandai dropping selesai?
                </h3>
                <p className="text-sm text-[var(--color-lempung)] mt-1">
                  Dropping ke <span className="font-medium text-[var(--color-tanah-pecah)]">{confirmDone.villages?.name ?? "desa"}</span> ({confirmDone.fleet}) akan ditandai selesai dan pelapor diberi notifikasi WA. Tindakan ini tidak bisa dibatalkan.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  const target = confirmDone;
                  setConfirmDone(null);
                  if (target) setStatus(target.id, "done");
                }}
                disabled={statusPending}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[var(--color-hijau-tuntas)] !text-white text-sm font-medium py-2.5 rounded-md hover:bg-[#345B48] disabled:opacity-60 transition-colors"
              >
                {statusPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Ya, tandai selesai
              </button>
              <button
                onClick={() => setConfirmDone(null)}
                className="px-4 py-2.5 text-sm font-medium text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)] transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
