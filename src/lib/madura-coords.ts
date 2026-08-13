// Koordinat asli (approx) desa demo Madura. Dipakai peta Leaflet publik & hero.
export const NAME_TO_LATLNG: Record<string, [number, number]> = {
  banyuanyar: [-7.05, 113.28],
  labuhan: [-7.18, 113.15],
  "pakaan barat": [-7.05, 112.98],
  "tanah merah laok": [-7.03, 112.85],
  "sokobanah daya": [-6.9, 113.45],
  galis: [-7.1, 112.9],
};

// Posko BPBD (titik awal armada) — Sampang. Dipakai sbg origin rute dropping.
export const POSKO: [number, number] = [-7.1926, 113.2494];

export const normDesa = (s: string) => s.toLowerCase().replace(/^desa\s+/, "").trim();

export function latLngByName(name: string): [number, number] | null {
  return NAME_TO_LATLNG[normDesa(name)] ?? null;
}
