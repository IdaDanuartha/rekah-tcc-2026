"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker, LayerGroup } from "leaflet";

export interface LiveTrackMapProps {
  origin: [number, number];
  destination: [number, number] | null;
  current: { lat: number; lng: number } | null;
  // Rute jalan nyata (OSRM). Bila kosong → fallback garis lurus.
  routeCoords?: [number, number][];
  className?: string;
}

const TRUCK_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#EFEFEA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h1"/><path d="M14 9h4l3 3v5a1 1 0 0 1-1 1h-1"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`;

// Peta pelacakan armada: posko (origin) → posisi armada (current) → desa (destination).
export default function LiveTrackMap({ origin, destination, current, routeCoords, className = "" }: LiveTrackMapProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const dynRef = useRef<LayerGroup | null>(null);
  const truckRef = useRef<Marker | null>(null);

  // Init peta + lapisan statis (posko & desa).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !elRef.current || mapRef.current) return;

      const map = L.map(elRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: false,
      }).setView(origin, 11);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);

      // Posko (origin)
      L.circleMarker(origin, { radius: 7, color: "#fff", weight: 2, fillColor: "#232420", fillOpacity: 1 })
        .addTo(map)
        .bindTooltip("Posko BPBD", { direction: "top", offset: [0, -6], className: "rekah-tip" });

      // Desa tujuan (destination)
      if (destination) {
        L.circleMarker(destination, { radius: 8, color: "#fff", weight: 2, fillColor: "#0F4C5C", fillOpacity: 1 })
          .addTo(map)
          .bindTooltip("Desa tujuan", { direction: "top", offset: [0, -6], className: "rekah-tip" });
      }

      dynRef.current = L.layerGroup().addTo(map);
      renderDynamic(L);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        dynRef.current = null;
        truckRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update lapisan dinamis (rute + armada) saat posisi berubah.
  useEffect(() => {
    (async () => {
      if (!mapRef.current || !dynRef.current) return;
      const L = (await import("leaflet")).default;
      renderDynamic(L);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.lat, current?.lng, destination?.[0], destination?.[1], routeCoords?.length]);

  async function renderDynamic(L: typeof import("leaflet")) {
    const map = mapRef.current;
    const layer = dynRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const cur: [number, number] | null = current ? [current.lat, current.lng] : null;

    if (routeCoords && routeCoords.length > 1) {
      // Rute mengikuti jalan nyata (OSRM).
      L.polyline(routeCoords, { color: "#0F4C5C", weight: 4, opacity: 0.75 }).addTo(layer);
    } else {
      // Fallback: garis lurus posko → armada → desa.
      const linePts: [number, number][] = [origin];
      if (cur) linePts.push(cur);
      if (destination) linePts.push(destination);
      if (linePts.length > 1) {
        L.polyline(linePts, { color: "#0F4C5C", weight: 3, opacity: 0.8, dashArray: "6 8" }).addTo(layer);
      }
    }

    // Marker armada (posisi terkini) — pin truk + denyut.
    if (cur) {
      const icon = L.divIcon({
        className: "rekah-truck",
        html: `<span class="rekah-truck__pulse"></span><span class="rekah-truck__pin">${TRUCK_SVG}</span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      truckRef.current = L.marker(cur, { icon, zIndexOffset: 1000 }).addTo(layer);
    }

    // Fit semua titik (termasuk rute jalan bila ada).
    const all: [number, number][] = [origin];
    if (cur) all.push(cur);
    if (destination) all.push(destination);
    if (routeCoords) all.push(...routeCoords);
    if (all.length > 1) map.fitBounds(all, { padding: [40, 40], maxZoom: 14 });
  }

  return <div ref={elRef} className={`h-[300px] z-0 rounded-md overflow-hidden ${className}`} />;
}
