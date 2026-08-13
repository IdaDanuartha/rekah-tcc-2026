import { Flame, AlertTriangle, Minus } from "lucide-react";

interface PriorityIndicatorProps {
  skor: number; // 0 – 100
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getPriorityLevel(skor: number): {
  level: "tinggi" | "menengah" | "rendah";
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bg: string;
} {
  if (skor >= 70) {
    return {
      level: "tinggi",
      label: "Prioritas Tinggi",
      icon: Flame,
      color: "text-[var(--color-genting)]",
      bg: "bg-[#F1DDDA]",
    };
  }
  if (skor >= 40) {
    return {
      level: "menengah",
      label: "Prioritas Menengah",
      icon: AlertTriangle,
      color: "text-[var(--color-siaga)]",
      bg: "bg-[#F0E2C6]",
    };
  }
  return {
    level: "rendah",
    label: "Prioritas Rendah",
    icon: Minus,
    color: "text-[var(--color-lempung)]",
    bg: "bg-[var(--color-kertas-tua)]",
  };
}

export default function PriorityIndicator({
  skor,
  showLabel = true,
  size = "md",
  className = "",
}: PriorityIndicatorProps) {
  const config = getPriorityLevel(skor);
  const Icon = config.icon;

  const iconSize = size === "sm" ? 13 : size === "md" ? 16 : 20;
  const scoreSize =
    size === "sm"
      ? "text-lg font-bold"
      : size === "md"
        ? "text-2xl font-bold"
        : "text-3xl font-bold";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`rounded-lg p-2 ${config.bg} flex items-center justify-center`}
        aria-label={config.label}
      >
        <Icon size={iconSize} className={config.color} />
      </div>
      <div>
        <div
          className={`${scoreSize} font-data ${config.color}`}
          style={{ fontFamily: "var(--font-data)" }}
        >
          {skor}
        </div>
        {showLabel && (
          <div className="text-xs text-[var(--color-lempung)] font-medium">
            {config.label}
          </div>
        )}
      </div>
    </div>
  );
}

// Bar visual skor prioritas — untuk tampilan di kartu desa
export function PriorityBar({
  skor,
  className = "",
}: {
  skor: number;
  className?: string;
}) {
  const config = getPriorityLevel(skor);
  const barColor =
    skor >= 70
      ? "bg-[var(--color-genting)]"
      : skor >= 40
        ? "bg-[var(--color-siaga)]"
        : "bg-[var(--color-lempung)]";

  const width = Math.min(100, Math.max(0, skor));

  return (
    <div className={`w-full space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-lempung)]">Skor Prioritas</span>
        <span
          className={`text-xs font-semibold font-data ${config.color}`}
          style={{ fontFamily: "var(--font-data)" }}
        >
          {skor}/100
        </span>
      </div>
      <div className="h-1.5 w-full max-w-full rounded-full bg-[var(--color-kapur-dalam)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
