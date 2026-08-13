"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, Truck, Loader2, Flame } from "lucide-react";
import Link from "next/link";
import { verifyReport, scheduleDropFromReport } from "@/lib/dashboard-actions";
import { useToast } from "@/components/ui/Toast";
import type { ReportStatus } from "@/lib/types";

const inputClass =
  "w-full px-3 py-2 bg-[var(--color-kertas-tua)]/60 border border-[var(--color-kapur-dalam)] rounded-md text-sm text-[var(--color-tanah-pecah)] focus:outline-none focus:border-[var(--color-air-jernih)] focus:ring-2 focus:ring-[var(--color-air-jernih)]/20 transition-all";

export default function ReportActions({
  reportId,
  status,
  hasVillage,
}: {
  reportId: string;
  status: ReportStatus;
  hasVillage: boolean;
}) {
  const toast = useToast();
  const [verifyPending, startVerify] = useTransition();
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [scheduleState, scheduleAction, schedulePending] = useActionState(
    scheduleDropFromReport,
    null
  );

  // Toast hasil penjadwalan (useActionState) — abaikan state awal null.
  const lastSchedule = useRef(scheduleState);
  useEffect(() => {
    if (scheduleState === lastSchedule.current) return;
    lastSchedule.current = scheduleState;
    if (!scheduleState) return;
    if (scheduleState.ok) toast.success("Dropping berhasil dijadwalkan.");
    else toast.error(scheduleState.error);
  }, [scheduleState, toast]);

  function onVerify() {
    setVerifyError(null);
    startVerify(async () => {
      const res = await verifyReport(reportId);
      if (res.ok) {
        toast.success("Laporan terverifikasi.");
      } else {
        setVerifyError(res.error);
        toast.error(res.error);
      }
    });
  }

  if (status === "scheduled" || status === "done") {
    return (
      <div className="card rounded-lg border-l-[3px] border-l-[var(--color-hijau-tuntas)] px-5 py-4 flex items-center gap-3 !bg-[var(--color-hijau-muda)]">
        <Flame size={18} className="text-[var(--color-hijau-tuntas)] shrink-0" />
        <div>
          <div className="text-sm font-semibold text-[var(--color-hijau-tuntas)]">
            {status === "scheduled" ? "Dropping telah dijadwalkan" : "Penanganan selesai"}
          </div>
          <Link
            href="/dashboard/schedule"
            className="mono-label !text-[var(--color-hijau-tuntas)] hover:underline flex items-center gap-1 mt-1"
          >
            Lihat jadwal <Truck size={11} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Verify */}
      {status === "pending" && (
        <div className="card rounded-lg px-5 py-4">
          <h3 className="text-base font-semibold text-[var(--color-tanah-pecah)] mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>
            Verifikasi Laporan
          </h3>
          <p className="mono-label normal-case tracking-normal mb-4">
            Verifikasi bahwa laporan valid dan layak masuk antrean dropping.
          </p>
          {verifyError && (
            <p className="text-xs text-[var(--color-genting)] mb-3">{verifyError}</p>
          )}
          <button
            onClick={onVerify}
            disabled={verifyPending}
            className="w-full inline-flex items-center justify-center gap-2 bg-[var(--color-air-jernih)] !text-white text-sm font-medium py-2.5 rounded-md hover:bg-[var(--color-air-tua)] disabled:opacity-60 transition-colors"
          >
            {verifyPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            {verifyPending ? "Memverifikasi…" : "Verifikasi Laporan"}
          </button>
        </div>
      )}

      {/* Schedule */}
      <div className="card rounded-lg px-5 py-4">
        <h3 className="text-base font-semibold text-[var(--color-tanah-pecah)] mb-3" style={{ fontFamily: "var(--font-heading)" }}>
          Jadwalkan Dropping
        </h3>
        {!hasVillage ? (
          <p className="text-sm text-[var(--color-siaga)]">
            Laporan belum terhubung ke desa terdaftar — tidak dapat dijadwalkan.
          </p>
        ) : (
          <form action={scheduleAction} className="space-y-3">
            <input type="hidden" name="reportId" value={reportId} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mono-label block mb-1">Armada / Tangki</label>
                <input type="text" name="fleet" placeholder="cth: Tangki-01" required className={inputClass} />
              </div>
              <div>
                <label className="mono-label block mb-1">Volume (liter)</label>
                <input type="number" name="volume_liters" min="0" inputMode="numeric" placeholder="cth: 5000" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="mono-label block mb-1">Tanggal</label>
              <input type="date" name="date" required className={inputClass} />
            </div>
            {scheduleState && !scheduleState.ok && (
              <p className="text-xs text-[var(--color-genting)]">{scheduleState.error}</p>
            )}
            <button
              type="submit"
              disabled={schedulePending}
              className="w-full inline-flex items-center justify-center gap-2 bg-[var(--color-siaga)] !text-white text-sm font-medium py-2.5 rounded-md hover:bg-[#A55F19] disabled:opacity-60 transition-colors"
            >
              {schedulePending ? <Loader2 size={15} className="animate-spin" /> : <Truck size={15} />}
              {schedulePending ? "Menjadwalkan…" : "Jadwalkan Dropping"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
