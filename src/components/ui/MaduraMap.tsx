// Peta Madura barat (Bangkalan + Sampang) — elemen tanda tangan Rekah.
// Menggantikan branch-line abstrak: tiap desa diplot di posisi geografis
// relatifnya yang sebenarnya, dan rute dropping air digambar sebagai
// polyline berurut prioritas. Bukan ilustrasi generik, ini geografi nyata.

import type { BpbdCategory } from "@/lib/types";

// Garis pantai Madura barat, viewBox 0 0 420 240. Ujung barat (Bangkalan,
// menghadap Selat Madura/Surabaya) membulat lebar; badan pulau memanjang &
// menyempit ke timur; pantai selatan berteluk (Selat Madura, Sreseh/Sampang);
// ujung timur meruncing lalu memudar keluar frame.
const OUTLINE =
  "M 46 126 C 38 106 47 90 70 85 C 88 81 104 84 118 88 C 150 82 186 84 224 85 C 268 86 312 90 352 99 C 380 105 400 112 414 120 L 410 124 C 386 127 356 129 320 132 C 300 134 288 138 276 143 C 262 149 250 152 234 151 C 220 150 210 154 196 160 C 178 167 160 170 142 168 C 116 165 92 160 72 151 C 58 145 50 138 46 126 Z";

// Garis highlight pantai utara (offset ke dalam, kesan tepi air).
const COAST_INNER =
  "M 62 118 C 56 102 72 95 98 94 C 150 90 200 92 248 93 C 300 95 350 102 396 116";

// Batas kabupaten Bangkalan | Sampang (dashed).
const DIVIDER = "M 210 87 C 216 112 213 138 200 158";

// Koordinat relatif tiap desa di dalam daratan. Barat (Bangkalan) di kiri
// divider, tengah (Sampang) di kanan — meniru posisi kecamatan asli.
export const DESA_KOORDINAT: Record<string, { x: number; y: number }> = {
  "1": { x: 270, y: 112 }, // Banyuanyar, Robatal — Sampang tengah
  "2": { x: 226, y: 150 }, // Labuhan, Sreseh — pesisir selatan Sampang
  "3": { x: 186, y: 141 }, // Pakaan Barat, Blega — Bangkalan timur-selatan
  "4": { x: 120, y: 118 }, // Tanah Merah Laok — Bangkalan tengah
  "5": { x: 322, y: 104 }, // Sokobanah Daya — pesisir utara Sampang
  "6": { x: 150, y: 140 }, // Galis — Bangkalan selatan
};

const KATEGORI_WARNA: Record<BpbdCategory, string> = {
  kritis: "var(--color-genting)",
  langka: "var(--color-siaga)",
  terbatas: "var(--color-lempung)",
};

export interface MapPoint {
  id: string;
  kategori: BpbdCategory;
  skor: number;
}

interface MaduraMapProps {
  points: MapPoint[];
  /** Desa yang disorot (kartu). Sisanya diredupkan. */
  activeId?: string;
  /** Gambar rute dropping (urut skor menurun) — untuk hero. */
  showRoute?: boolean;
  variant?: "hero" | "card";
  className?: string;
}

export default function MaduraMap({
  points,
  activeId,
  showRoute = false,
  variant = "hero",
  className = "",
}: MaduraMapProps) {
  const isCard = variant === "card";

  // Urutan rute: prioritas tertinggi didatangi lebih dulu.
  const routeOrder = [...points]
    .filter((p) => DESA_KOORDINAT[p.id])
    .sort((a, b) => b.skor - a.skor);

  const routePath = routeOrder
    .map((p, i) => {
      const k = DESA_KOORDINAT[p.id];
      return `${i === 0 ? "M" : "L"} ${k.x} ${k.y}`;
    })
    .join(" ");

  const truck = routeOrder[0] ? DESA_KOORDINAT[routeOrder[0].id] : null;

  return (
    <svg
      viewBox="0 0 420 240"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={
        isCard
          ? "Lokasi desa di peta Madura"
          : "Peta rute dropping air Madura (Bangkalan dan Sampang)"
      }
    >
      <defs>
        {/* Daratan: batu kering, sedikit gradasi agar tak flat */}
        <linearGradient id="daratan" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="var(--color-kertas)" />
          <stop offset="55%" stopColor="var(--color-kertas-tua)" />
          <stop offset="100%" stopColor="var(--color-kapur-garis)" />
        </linearGradient>
        {/* Laut: petrol sangat pucat */}
        <linearGradient id="laut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-air-jernih)" stopOpacity="0.06" />
          <stop offset="100%" stopColor="var(--color-air-jernih)" stopOpacity="0.12" />
        </linearGradient>
        {/* Timur memudar: pulau menyambung ke luar frame */}
        <linearGradient id="fadeTimur" x1="0" y1="0" x2="1" y2="0">
          <stop offset="76%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="maskTimur">
          <rect width="420" height="240" fill="url(#fadeTimur)" />
        </mask>
        {/* Bayang halus di bawah daratan */}
        <filter id="landShadow" x="-10%" y="-10%" width="120%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#16282E" floodOpacity="0.14" />
        </filter>
      </defs>

      <g mask="url(#maskTimur)">
        {/* Laut (hanya hero) */}
        {!isCard && <rect x="0" y="0" width="420" height="240" fill="url(#laut)" />}

        {/* Grid laut samar (hero) */}
        {!isCard && (
          <g stroke="var(--color-air-jernih)" strokeOpacity="0.08" strokeWidth="0.75">
            <line x1="0" y1="60" x2="420" y2="60" />
            <line x1="0" y1="180" x2="420" y2="180" />
            <line x1="120" y1="0" x2="120" y2="240" />
            <line x1="300" y1="0" x2="300" y2="240" />
          </g>
        )}

        {/* Daratan */}
        <path
          d={OUTLINE}
          fill="url(#daratan)"
          stroke="var(--color-lempung)"
          strokeOpacity={isCard ? 0.5 : 0.7}
          strokeWidth={isCard ? 1 : 1.5}
          strokeLinejoin="round"
          filter={isCard ? undefined : "url(#landShadow)"}
        />

        {/* Highlight tepi pantai (hero) */}
        {!isCard && (
          <path
            d={COAST_INNER}
            fill="none"
            stroke="var(--color-garam)"
            strokeOpacity="0.5"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        )}

        {/* Batas kabupaten */}
        <path
          d={DIVIDER}
          fill="none"
          stroke="var(--color-lempung)"
          strokeOpacity={isCard ? 0.35 : 0.55}
          strokeWidth="1"
          strokeDasharray="3 4"
        />

        {/* Label kabupaten + pulau kecil lepas pantai (hero) */}
        {!isCard && (
          <>
            <text x="106" y="103" textAnchor="middle" fontSize="8.5" letterSpacing="1.5" fontFamily="'IBM Plex Mono', monospace" fill="var(--color-lempung)" opacity="0.55">BANGKALAN</text>
            <text x="300" y="133" textAnchor="middle" fontSize="8.5" letterSpacing="1.5" fontFamily="'IBM Plex Mono', monospace" fill="var(--color-lempung)" opacity="0.55">SAMPANG</text>
            <ellipse cx="352" cy="70" rx="4.5" ry="2.6" fill="var(--color-kertas-tua)" stroke="var(--color-lempung)" strokeOpacity="0.5" strokeWidth="0.8" />
            <ellipse cx="300" cy="64" rx="3" ry="1.8" fill="var(--color-kertas-tua)" stroke="var(--color-lempung)" strokeOpacity="0.5" strokeWidth="0.8" />
          </>
        )}
      </g>

      {/* Rute dropping (hero) */}
      {showRoute && routeOrder.length > 1 && (
        <path
          d={routePath}
          fill="none"
          stroke="var(--color-air-jernih)"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="5 6"
          style={{ animation: "route-dash 22s linear infinite" }}
        />
      )}

      {/* Titik desa */}
      {points.map((p) => {
        const k = DESA_KOORDINAT[p.id];
        if (!k) return null;
        const active = !activeId || activeId === p.id;
        const warna = KATEGORI_WARNA[p.kategori];
        const r = active ? (isCard ? 4 : 5) : 2.5;
        return (
          <g key={p.id} opacity={active ? 1 : 0.35}>
            {active && (
              <circle cx={k.x} cy={k.y} r={r + 4} fill={warna} opacity="0.16">
                {!isCard && (
                  <animate attributeName="r" values={`${r + 3};${r + 8};${r + 3}`} dur="2.4s" repeatCount="indefinite" />
                )}
              </circle>
            )}
            <circle cx={k.x} cy={k.y} r={r} fill={warna} stroke="var(--color-kertas)" strokeWidth="1.5" />
          </g>
        );
      })}

      {/* Penanda armada di titik prioritas tertinggi — ikon garis (gaya Lucide) */}
      {showRoute && truck && (
        <g transform={`translate(${truck.x}, ${truck.y - 16})`}>
          <circle r="10.5" fill="var(--color-kertas)" stroke="var(--color-kapur-garis)" strokeWidth="1" />
          <g
            transform="translate(-7,-5)"
            fill="none"
            stroke="var(--color-tanah-pecah)"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="0" y="1.6" width="8" height="6" rx="0.6" />
            <path d="M8 3.2 H11.2 L13.6 5.6 V7.6 H8 Z" />
            <circle cx="3" cy="9.2" r="1.4" />
            <circle cx="11.2" cy="9.2" r="1.4" />
          </g>
        </g>
      )}
    </svg>
  );
}
