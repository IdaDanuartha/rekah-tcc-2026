"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, CircleMarker } from "leaflet";
import type { BpbdCategory } from "@/lib/types";
import type { PublicVillage } from "@/lib/public-data";
import { latLngByName } from "@/lib/madura-coords";

const CAT_COLOR: Record<BpbdCategory, string> = {
  kritis: "#B23A2E",
  langka: "#8A6A22",
  terbatas: "#5E605A",
};

function coordOf(v: PublicVillage): [number, number] | null {
  if (typeof v.lat === "number" && typeof v.lng === "number") return [v.lat, v.lng];
  return latLngByName(v.name);
}

const dropLabel: Record<PublicVillage["dropStatus"], string> = {
  none: "Belum ada jadwal",
  scheduled: "Dijadwalkan",
  in_transit: "Dalam perjalanan",
  done: "Air tersalurkan",
};

export default function PublicLeafletMap({
  villages,
  activeId,
  onSelect,
}: {
  villages: PublicVillage[];
  activeId: string | null;
  onSelect?: (id: string) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<globalThis.Map<string, CircleMarker>>(new globalThis.Map());
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Init peta + marker (sekali, saat villages siap).
  useEffect(() => {
    const markers = markersRef.current;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !elRef.current || mapRef.current) return;

      const map = L.map(elRef.current, { scrollWheelZoom: false }).setView([-7.03, 113.05], 10);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 18,
      }).addTo(map);

      const bounds: [number, number][] = [];
      for (const v of villages) {
        const c = coordOf(v);
        if (!c) continue;
        bounds.push(c);
        const marker = L.circleMarker(c, {
          radius: 9,
          color: "#ffffff",
          weight: 2,
          fillColor: CAT_COLOR[v.category ?? "terbatas"],
          fillOpacity: 1,
        }).addTo(map);
        marker.bindPopup(
          `<strong>${v.name}</strong><br>${v.district}, ${v.regency}<br>` +
            `Status: ${dropLabel[v.dropStatus]}` +
            (v.activeReports > 0 ? `<br>${v.activeReports} laporan aktif` : "") +
            (v.confirmedReceipts > 0 ? `<br>✓ ${v.confirmedReceipts} dikonfirmasi warga` : "")
        );
        marker.on("click", () => onSelectRef.current?.(v.id));
        markers.set(v.id, marker);
      }
      if (bounds.length > 0) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
    })();

    return () => {
      cancelled = true;
      markers.clear();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [villages]);

  // Highlight desa terpilih.
  useEffect(() => {
    if (!activeId || !mapRef.current) return;
    const m = markersRef.current.get(activeId);
    if (m) {
      mapRef.current.panTo(m.getLatLng());
      m.openPopup();
    }
  }, [activeId]);

  return <div ref={elRef} className="w-full h-[420px] rounded-md overflow-hidden z-0" />;
}
