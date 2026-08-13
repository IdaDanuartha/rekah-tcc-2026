"use client";

import { useState } from "react";
import { MapPin, Droplets, Truck, Clock, CheckCircle2, ShieldQuestion } from "lucide-react";
import PublicLeafletMap from "@/components/public/PublicLeafletMap";
import type { BpbdCategory } from "@/lib/types";
import type { PublicVillage, VillageDropStatus } from "@/lib/public-data";

const catLabel: Record<BpbdCategory, string> = {
  kritis: "Kritis",
  langka: "Langka",
  terbatas: "Terbatas",
};
const catChip: Record<BpbdCategory, string> = {
  kritis: "bg-[#F1DDDA] text-[var(--color-genting)]",
  langka: "bg-[#FBEFDD] text-[var(--color-siaga)]",
  terbatas: "bg-[var(--color-kertas-tua)] text-[var(--color-lempung)]",
};

const dropMeta: Record<VillageDropStatus, { label: string; className: string; Icon: typeof Truck }> = {
  none: { label: "Belum ada jadwal", className: "text-[var(--color-lempung)]", Icon: ShieldQuestion },
  scheduled: { label: "Dijadwalkan", className: "text-[var(--color-air-jernih)]", Icon: Clock },
  in_transit: { label: "Dalam perjalanan", className: "text-[var(--color-siaga)]", Icon: Truck },
  done: { label: "Air tersalurkan", className: "text-[var(--color-hijau-tuntas)]", Icon: CheckCircle2 },
};

export default function PublicMapExplorer({ villages }: { villages: PublicVillage[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6">
      {/* Peta */}
      <div className="card rounded-lg p-4">
        <PublicLeafletMap villages={villages} activeId={activeId} onSelect={setActiveId} />
        <div className="flex items-center gap-4 flex-wrap mt-3 px-1">
          {(["kritis", "langka", "terbatas"] as BpbdCategory[]).map((c) => (
            <span key={c} className="flex items-center gap-1.5 mono-label normal-case tracking-normal">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor:
                    c === "kritis"
                      ? "var(--color-genting)"
                      : c === "langka"
                        ? "var(--color-siaga)"
                        : "var(--color-lempung)",
                }}
              />
              {catLabel[c]}
            </span>
          ))}
        </div>
      </div>

      {/* Daftar desa */}
      <div className="space-y-2.5 lg:max-h-[520px] lg:overflow-y-auto lg:pr-1">
        {villages.map((v) => {
          const dm = dropMeta[v.dropStatus];
          const isActive = v.id === activeId;
          return (
            <button
              key={v.id}
              onClick={() => setActiveId(isActive ? null : v.id)}
              className={`card rounded-lg w-full text-left px-4 py-3 transition-all ${
                isActive ? "ring-2 ring-[var(--color-air-jernih)]" : "card-lift"
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className="text-base font-semibold text-[var(--color-tanah-pecah)]"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {v.name}
                </h3>
                {v.category && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${catChip[v.category]}`}>
                    {catLabel[v.category]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mono-label normal-case tracking-normal mt-1">
                <MapPin size={11} />
                {v.district}, {v.regency}
              </div>

              <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
                <span className={`flex items-center gap-1 font-medium ${dm.className}`}>
                  <dm.Icon size={13} /> {dm.label}
                </span>
                {v.activeReports > 0 && (
                  <span className="flex items-center gap-1 text-[var(--color-lempung)]">
                    <Droplets size={12} /> {v.activeReports} laporan aktif
                  </span>
                )}
                {v.confirmedReceipts > 0 && (
                  <span className="flex items-center gap-1 text-[var(--color-hijau-tuntas)]">
                    <CheckCircle2 size={12} /> {v.confirmedReceipts} dikonfirmasi warga
                  </span>
                )}
              </div>

              {v.lastDroppingAt && (
                <div className="mono-label normal-case tracking-normal mt-1.5">
                  Dropping terakhir:{" "}
                  {new Date(v.lastDroppingAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
