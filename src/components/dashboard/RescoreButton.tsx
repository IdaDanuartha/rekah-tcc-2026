"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { rescoreReport } from "@/lib/dashboard-actions";
import { useToast } from "@/components/ui/Toast";

export default function RescoreButton({
  reportId,
  hasScore,
}: {
  reportId: string;
  hasScore: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  function onClick() {
    setError(null);
    start(async () => {
      const res = await rescoreReport(reportId);
      if (res.ok) {
        toast.success("Skor prioritas dihitung ulang.");
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-2 border border-[var(--color-kapur-dalam)] bg-[var(--color-kertas)] text-[var(--color-tanah-pecah)] text-sm font-medium px-3 py-2 rounded-md hover:border-[var(--color-air-jernih)] hover:text-[var(--color-air-jernih)] disabled:opacity-60 transition-colors"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {pending ? "Menghitung…" : hasScore ? "Hitung ulang skor" : "Hitung skor"}
      </button>
      {error && <p className="text-xs text-[var(--color-genting)] max-w-[240px] text-right">{error}</p>}
    </div>
  );
}
