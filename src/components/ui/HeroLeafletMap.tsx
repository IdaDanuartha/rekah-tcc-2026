"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import type { BpbdCategory } from "@/lib/types";
import { latLngByName } from "@/lib/madura-coords";

export interface HeroPoint {
  id: string;
  nama: string;
  kategori: BpbdCategory;
  skor: number;
}

const CAT_COLOR: Record<BpbdCategory, string> = {
  kritis: "#B23A2E",
  langka: "#8A6A22",
  terbatas: "#5E605A",
};

const CAT_LABEL: Record<BpbdCategory, string> = {
  kritis: "Kritis",
  langka: "Langka",
  terbatas: "Terbatas",
};

const TRUCK_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#EFEFEA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h1"/><path d="M14 9h4l3 3v5a1 1 0 0 1-1 1h-1"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`;

function tipHtml(p: HeroPoint): string {
  const color = CAT_COLOR[p.kategori];
  return `<span class="rekah-tip__dot" style="background:${color}"></span><span class="rekah-tip__body"><span class="rekah-tip__name">${p.nama}</span><span class="rekah-tip__meta">${CAT_LABEL[p.kategori]} · skor ${p.skor}</span></span>`;
}

// Peta hero: desa Madura + jalur armada (urut prioritas skor menurun).
export default function HeroLeafletMap({ points, className = "" }: { points: HeroPoint[]; className?: string }) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !elRef.current || mapRef.current) return;

      const map = L.map(elRef.current, {
        scrollWheelZoom: false,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        doubleClickZoom: false,
      }).setView([-7.03, 113.05], 10);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);

      const withCoord = points
        .map((p) => ({ p, c: latLngByName(p.nama) }))
        .filter((x): x is { p: HeroPoint; c: [number, number] } => x.c !== null);

      // Jalur armada: urut skor menurun.
      const sorted = [...withCoord].sort((a, b) => b.p.skor - a.p.skor);
      const route = sorted.map((x) => x.c);
      if (route.length > 1) {
        L.polyline(route, {
          color: "#0F4C5C",
          weight: 2.5,
          opacity: 0.8,
          dashArray: "6 8",
        }).addTo(map);
      }

      for (const { p, c } of withCoord) {
        L.circleMarker(c, {
          radius: 8,
          color: "#ffffff",
          weight: 2,
          fillColor: CAT_COLOR[p.kategori],
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip(tipHtml(p), {
            direction: "top",
            offset: [0, -6],
            opacity: 1,
            className: "rekah-tip",
          });
      }

      // Titik awal armada = desa prioritas tertinggi. Tanda truk + denyut.
      if (sorted.length > 0) {
        const start = sorted[0];
        const truckIcon = L.divIcon({
          className: "rekah-truck",
          html: `<span class="rekah-truck__pulse"></span><span class="rekah-truck__pin">${TRUCK_SVG}</span>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        L.marker(start.c, { icon: truckIcon, zIndexOffset: 1000, interactive: true })
          .addTo(map)
          .bindTooltip(
            `<span class="rekah-tip__body"><span class="rekah-tip__name">Armada mulai</span><span class="rekah-tip__meta">${start.p.nama} · prioritas tertinggi</span></span>`,
            { direction: "top", offset: [0, -14], opacity: 1, className: "rekah-tip" },
          );
      }

      if (withCoord.length > 0) {
        map.fitBounds(withCoord.map((x) => x.c), { padding: [30, 30], maxZoom: 11 });
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [points]);

  return <div ref={elRef} className={`h-[280px] z-0 ${className}`} />;
}
