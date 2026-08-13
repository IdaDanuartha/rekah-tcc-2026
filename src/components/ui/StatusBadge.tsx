import {
  Clock,
  ShieldCheck,
  ShieldAlert,
  Truck,
  CheckCircle2,
} from "lucide-react";
import type { ReportStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: ReportStatus;
  size?: "sm" | "md";
  className?: string;
}

const statusConfig: Record<
  ReportStatus,
  { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; className: string }
> = {
  pending: {
    label: "Menunggu",
    icon: Clock,
    className: "status-bg-pending text-[var(--color-lempung)] border",
  },
  verified: {
    label: "Terverifikasi",
    icon: ShieldCheck,
    className: "status-bg-verified text-[var(--color-air-jernih)] border",
  },
  scheduled: {
    label: "Dijadwalkan",
    icon: Truck,
    className: "status-bg-scheduled text-[var(--color-siaga)] border",
  },
  done: {
    label: "Selesai",
    icon: CheckCircle2,
    className: "status-bg-done text-[var(--color-hijau-tuntas)] border",
  },
};

export default function StatusBadge({
  status,
  size = "md",
  className = "",
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const iconSize = size === "sm" ? 12 : 14;
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${padding} ${config.className} ${className}`}
    >
      <Icon size={iconSize} className="shrink-0" />
      {config.label}
    </span>
  );
}

// Badge untuk status verifikasi nomor WA
export function VerifBadge({
  verified,
  size = "sm",
}: {
  verified: boolean;
  size?: "sm" | "md";
}) {
  const iconSize = size === "sm" ? 11 : 13;
  const padding = size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-0.5 text-sm";

  if (verified) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-medium ${padding} bg-[var(--color-air-muda)] text-[var(--color-air-jernih)] border border-[#A9C3CC]`}
      >
        <ShieldCheck size={iconSize} className="shrink-0" />
        Nomor resmi
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${padding} bg-[#F3E9D3] text-[var(--color-siaga)] border border-[#D3B577]`}
    >
      <ShieldAlert size={iconSize} className="shrink-0" />
      Nomor belum terdaftar
    </span>
  );
}
