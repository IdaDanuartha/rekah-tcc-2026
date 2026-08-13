"use client";

import { useEffect, useState } from "react";
import { Navigation, Clock, Loader2, TriangleAlert } from "lucide-react";
import LiveTrackMap from "./LiveTrackMap";
import { fetchRoadRoute } from "@/lib/route-client";

interface TrackDTO {
  status: "scheduled" | "in_transit" | "done";
  fleet: string;
  villageName: string;
  origin: [number, number];
  destination: [number, number] | null;
  current: { lat: number; lng: number; updatedAt: string } | null;
  remainingKm: number | null;
  etaMinutes: number | null;
  stale: boolean;
}

const POLL_MS = 5000;

export default function TrackPanel({ scheduleId }: { scheduleId: string }) {
  const [data, setData] = useState<TrackDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | undefined>(undefined);
  const [road, setRoad] = useState<{ km: number; min: number } | null>(null);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const r = await fetch(`/api/track/${scheduleId}`, { cache: "no-store" });
        const j = await r.json();
        if (alive && j?.ok) setData(j.data as TrackDTO);
      } catch {
        /* abaikan; coba lagi tick berikutnya */
      } finally {
        if (alive) setLoading(false);
      }
    }
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [scheduleId]);

  // Rute jalan penuh posko → desa (sekali, saat destination diketahui).
  useEffect(() => {
    if (!data?.destination || routeCoords) return;
    let alive = true;
    fetchRoadRoute(data.origin, data.destination).then((r) => {
      if (alive && r) setRouteCoords(r.coords);
    });
    return () => {
      alive = false;
    };
  }, [data?.destination, data?.origin, routeCoords]);

  // ETA jalan nyata dari posisi armada → desa (tiap posisi berubah).
  useEffect(() => {
    if (!data?.current || !data?.destination) {
      setRoad(null);
      return;
    }
    let alive = true;
    fetchRoadRoute([data.current.lat, data.current.lng], data.destination).then((r) => {
      if (alive) setRoad(r ? { km: r.distanceKm, min: Math.max(1, Math.round(r.durationSec / 60)) } : null);
    });
    return () => {
      alive = false;
    };
  }, [data?.current?.lat, data?.current?.lng, data?.destination]);

  if (loading) {
    return (
      <div className="card rounded-lg px-5 py-8 flex items-center justify-center gap-2 text-sm text-[var(--color-lempung)]">
        <Loader2 size={15} className="animate-spin" /> Memuat pelacakan…
      </div>
    );
  }
  if (!data) return null;

  const hasLive = data.current != null;

  return (
    <div className="card rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-kapur-dalam)] bg-[var(--color-kertas-tua)]">
        <div className="flex items-center gap-2">
          <Navigation size={15} className="text-[var(--color-air-jernih)]" />
          <span className="mono-label !text-xs">Pelacakan armada · {data.fleet}</span>
        </div>
        {hasLive && !data.stale ? (
          <span className="flex items-center gap-1.5 mono-label !text-[0.625rem] text-[var(--color-hijau-tuntas)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-hijau-tuntas)] animate-pulse-soft" /> Live
          </span>
        ) : (
          <span className="mono-label !text-[0.625rem] text-[var(--color-lempung)]">
            {hasLive ? "Sinyal tertunda" : "Belum berangkat"}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        <LiveTrackMap origin={data.origin} destination={data.destination} current={data.current} routeCoords={routeCoords} />

        {hasLive ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-[var(--color-kertas-tua)]/60 border border-[var(--color-kapur-dalam)] px-4 py-2.5">
              <div className="mono-label mb-0.5">Sisa jarak</div>
              <div className="text-lg font-semibold tnum text-[var(--color-tanah-pecah)]">
                {road ? `${road.km.toFixed(1)} km` : data.remainingKm != null ? `${data.remainingKm.toFixed(1)} km` : "—"}
              </div>
            </div>
            <div className="rounded-md bg-[var(--color-kertas-tua)]/60 border border-[var(--color-kapur-dalam)] px-4 py-2.5">
              <div className="mono-label mb-0.5 flex items-center gap-1"><Clock size={10} /> Estimasi tiba</div>
              <div className="text-lg font-semibold tnum text-[var(--color-tanah-pecah)]">
                {road ? `${road.min} mnt` : data.etaMinutes != null ? `${data.etaMinutes} mnt` : "—"}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-lempung)] flex items-center gap-2">
            <TriangleAlert size={14} className="text-[var(--color-siaga)] shrink-0" />
            Armada belum membagikan lokasi. Rute posko → desa ditampilkan sebagai perkiraan.
          </p>
        )}

        {data.stale && hasLive && (
          <p className="mono-label normal-case tracking-normal !text-[0.625rem] text-[var(--color-siaga)]">
            Sinyal GPS sopir tertunda &gt;90 detik — posisi mungkin belum terkini.
          </p>
        )}
      </div>
    </div>
  );
}
