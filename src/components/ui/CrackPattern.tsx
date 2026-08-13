// Motif retakan tanah kering — elemen visual utama PRD section 12.2
// Retakan terisi proporsional terhadap progress penanganan desa

interface CrackPatternProps {
  /** 0 – 100, seberapa penuh retakan terisi air */
  progress: number;
  /** Lebar container dalam px, default 200 */
  width?: number;
  /** Tinggi container dalam px, default 120 */
  height?: number;
  className?: string;
}

export default function CrackPattern({
  progress,
  width = 200,
  height = 120,
  className = "",
}: CrackPatternProps) {
  const filled = Math.min(100, Math.max(0, progress));
  const empty = 100 - filled;

  // Warna interpolasi: tanah kering (#5C4430) → air jernih (#1D6F87)
  // Dipisah menjadi dua jalur: bagian terisi dan bagian kering
  const crackPaths = [
    // Retakan utama horizontal
    "M 10 45 L 35 42 L 55 50 L 80 44 L 110 47 L 135 43 L 160 48 L 185 45",
    // Retakan cabang kiri atas
    "M 35 42 L 25 28 L 40 15",
    // Retakan cabang kanan atas
    "M 110 47 L 120 32 L 115 18",
    // Retakan cabang bawah tengah
    "M 80 44 L 72 58 L 82 72 L 68 85",
    // Retakan cabang kanan bawah
    "M 160 48 L 168 62 L 155 78",
    // Retakan kecil kiri bawah
    "M 55 50 L 48 63 L 52 74",
    // Retakan kecil kanan
    "M 135 43 L 140 30",
  ];

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Gradient fill dari kiri ke kanan sesuai progress */}
        <linearGradient id={`crack-fill-${filled}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset={`${filled}%`} stopColor="#1D6F87" stopOpacity="0.85" />
          <stop offset={`${filled}%`} stopColor="#5C4430" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#5C4430" stopOpacity="0.4" />
        </linearGradient>

        {/* Drop shadow lembut */}
        <filter id="crack-shadow">
          <feDropShadow dx="0" dy="1" stdDeviation="0.5" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Latar tanah */}
      <rect width="200" height="100" fill="transparent" />

      {/* Retakan — dirender sebagai jalur tunggal dengan warna berdasarkan fill */}
      {crackPaths.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke={`url(#crack-fill-${filled})`}
          strokeWidth={i === 0 ? 2.5 : 1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          filter="url(#crack-shadow)"
          style={{
            transition: "stroke 0.6s ease",
          }}
        />
      ))}

      {/* Titik-titik air saat progress tinggi */}
      {filled > 60 && (
        <>
          <circle cx="42" cy="28" r="2" fill="#1D6F87" opacity={((filled - 60) / 40) * 0.7} />
          <circle cx="75" cy="62" r="1.5" fill="#1D6F87" opacity={((filled - 60) / 40) * 0.6} />
          <circle cx="118" cy="35" r="1.5" fill="#1D6F87" opacity={((filled - 60) / 40) * 0.5} />
        </>
      )}

      {/* Indikator persentase — sangat kecil, di sudut kanan bawah */}
      {filled > 0 && (
        <text
          x="192"
          y="96"
          textAnchor="end"
          fontSize="7"
          fontFamily="'IBM Plex Mono', monospace"
          fill={filled > 50 ? "#1D6F87" : "#B08968"}
          opacity="0.7"
        >
          {filled}%
        </text>
      )}
    </svg>
  );
}
