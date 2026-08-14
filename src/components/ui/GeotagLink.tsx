"use client";

import { useState } from "react";
import { MapPin, Map, X, ExternalLink } from "lucide-react";

// Koordinat geotag bukti serah terima: klik angka → Google Maps,
// tombol "Peta" → modal peta OpenStreetMap (embed) + tautan buka penuh.
export default function GeotagLink({ lat, lng }: { lat: number; lng: number }) {
  const [open, setOpen] = useState(false);
  const gmaps = `https://www.google.com/maps?q=${lat},${lng}`;
  const osmFull = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
  const d = 0.004; // bbox kecil di sekitar titik
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  const osmEmbed = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <>
      <div className="flex items-center gap-2 text-[var(--color-lempung)]">
        <MapPin size={14} className="shrink-0" />
        <a
          href={gmaps}
          target="_blank"
          rel="noopener noreferrer"
          className="tnum text-[var(--color-air-jernih)] hover:underline"
        >
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </a>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-lempung)] hover:text-[var(--color-air-jernih)] transition-colors"
        >
          <Map size={13} /> Peta
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--color-tanah-pecah)]/60 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="relative card rounded-xl shadow-[var(--shadow-float)] w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-kapur-dalam)]">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-tanah-pecah)]">
                <MapPin size={15} className="text-[var(--color-air-jernih)]" />
                <span className="tnum">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)] transition-colors"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <iframe
              title="Peta titik dropping"
              src={osmEmbed}
              className="w-full h-[360px] border-0"
              loading="lazy"
            />

            <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-[var(--color-kapur-dalam)] text-sm">
              <a href={osmFull} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--color-lempung)] hover:text-[var(--color-air-jernih)] transition-colors">
                <ExternalLink size={13} /> OpenStreetMap
              </a>
              <a href={gmaps} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--color-air-jernih)] hover:underline font-medium">
                <ExternalLink size={13} /> Google Maps
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
