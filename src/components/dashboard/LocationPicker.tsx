"use client";

// Pemilih lokasi berbasis peta — Leaflet + OpenStreetMap (gratis, tanpa API key).
// Search autocomplete + reverse geocode via Nominatim (OSM). Marker bisa
// digeser / peta bisa diklik. Menulis lat & lng ke hidden input form.
// Dipakai di modal CRUD desa. Dimuat dynamic ssr:false (Leaflet butuh window).

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, Loader2, Crosshair } from "lucide-react";

// Pusat Madura (Bangkalan–Sampang) untuk tampilan awal.
const MADURA_CENTER: [number, number] = [-7.03, 113.13];
const MADURA_ZOOM = 9;

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 1 C7 1 1 7 1 15 C1 25 15 37 15 37 C15 37 29 25 29 15 C29 7 23 1 15 1 Z"
      fill="#0F4C5C" stroke="#F6F5F1" stroke-width="2"/>
    <circle cx="15" cy="15" r="5" fill="#F6F5F1"/>
  </svg>`,
  iconSize: [30, 38],
  iconAnchor: [15, 37],
});

export default function LocationPicker({
  initialLat,
  initialLng,
}: {
  initialLat?: number | null;
  initialLng?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lat, setLat] = useState<number | null>(initialLat ?? null);
  const [lng, setLng] = useState<number | null>(initialLng ?? null);
  const [placeName, setPlaceName] = useState<string>("");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Reverse geocode (nama lokasi dari koordinat) — hanya untuk tampilan.
  const reverseGeocode = useCallback((la: number, ln: number) => {
    if (revTimer.current) clearTimeout(revTimer.current);
    revTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${la}&lon=${ln}&accept-language=id`
        );
        const data = await res.json();
        setPlaceName(typeof data?.display_name === "string" ? data.display_name : "");
      } catch {
        setPlaceName("");
      }
    }, 500);
  }, []);

  // Simpan koordinat ke state (dibulatkan) + minta nama lokasi.
  const commit = useCallback(
    (la: number, ln: number) => {
      const rla = +la.toFixed(6);
      const rln = +ln.toFixed(6);
      setLat(rla);
      setLng(rln);
      reverseGeocode(rla, rln);
    },
    [reverseGeocode]
  );

  // Buat / pindahkan marker (tanpa rekursi — dragend memanggil commit).
  const ensureMarker = useCallback(
    (la: number, ln: number) => {
      const map = mapRef.current;
      if (!map) return;
      if (markerRef.current) {
        markerRef.current.setLatLng([la, ln]);
      } else {
        const marker = L.marker([la, ln], { draggable: true, icon: pinIcon }).addTo(map);
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          commit(p.lat, p.lng);
        });
        markerRef.current = marker;
      }
    },
    [commit]
  );

  // Taruh titik: marker + state (+ opsi geser peta).
  const setPoint = useCallback(
    (la: number, ln: number, recenter?: boolean) => {
      ensureMarker(la, ln);
      commit(la, ln);
      const map = mapRef.current;
      if (recenter && map) map.setView([la, ln], Math.max(map.getZoom(), 13));
    },
    [ensureMarker, commit]
  );

  // Init peta (sekali).
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const hasInitial = initialLat != null && initialLng != null;
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
      hasInitial ? [initialLat!, initialLng!] : MADURA_CENTER,
      hasInitial ? 13 : MADURA_ZOOM
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => setPoint(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;

    if (hasInitial) ensureMarker(initialLat!, initialLng!);

    // Modal: container mungkin 0px saat init → paksa hitung ulang.
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search autocomplete (debounce) — dijalankan dari onChange, bukan effect.
  function onQueryChange(value: string) {
    setQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=id&limit=6&accept-language=id&q=${encodeURIComponent(value)}`
        );
        const data = (await res.json()) as NominatimResult[];
        setResults(Array.isArray(data) ? data : []);
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }

  function selectResult(r: NominatimResult) {
    const la = parseFloat(r.lat);
    const ln = parseFloat(r.lon);
    setQuery(r.display_name.split(",").slice(0, 2).join(", "));
    setResults([]);
    setShowResults(false);
    setPoint(la, ln, true);
  }

  return (
    <div className="space-y-2">
      <label className="mono-label block">Lokasi (peta)</label>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-lempung)] pointer-events-none" />
        {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-lempung)] animate-spin" />}
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Cari lokasi… (cth: Robatal, Sampang)"
          className="w-full pl-9 pr-9 py-2.5 bg-[var(--color-kertas)] border border-[var(--color-kapur-dalam)] rounded-md text-sm text-[var(--color-tanah-pecah)] placeholder:text-[var(--color-lempung)] focus:outline-none focus:border-[var(--color-air-jernih)] focus:ring-2 focus:ring-[var(--color-air-jernih)]/20 transition-all"
        />
        {showResults && results.length > 0 && (
          <ul className="absolute z-[1000] left-0 right-0 mt-1 card rounded-md shadow-[var(--shadow-float)] overflow-hidden max-h-56 overflow-y-auto">
            {results.map((r) => (
              <li key={r.place_id}>
                <button
                  type="button"
                  onClick={() => selectResult(r)}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--color-tanah-pecah)] hover:bg-[var(--color-air-muda)] flex items-start gap-2 transition-colors"
                >
                  <MapPin size={13} className="shrink-0 mt-0.5 text-[var(--color-air-jernih)]" />
                  <span className="leading-snug">{r.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Peta */}
      <div
        ref={containerRef}
        className="h-[260px] w-full rounded-md overflow-hidden border border-[var(--color-kapur-dalam)] z-0"
      />

      {/* Koordinat terpilih + hidden input untuk submit form */}
      <div className="flex items-center gap-2 mono-label normal-case tracking-normal">
        <Crosshair size={12} className="shrink-0 text-[var(--color-air-jernih)]" />
        {lat != null && lng != null ? (
          <span className="tnum" style={{ fontFamily: "var(--font-data)" }}>
            {lat}, {lng}
          </span>
        ) : (
          <span>Klik peta atau cari lokasi untuk menaruh marker.</span>
        )}
      </div>
      {placeName && <p className="text-xs text-[var(--color-lempung)] leading-snug">{placeName}</p>}

      <input type="hidden" name="lat" value={lat ?? ""} />
      <input type="hidden" name="lng" value={lng ?? ""} />
    </div>
  );
}
