"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, Loader2, HandHeart } from "lucide-react";
import { confirmReceipt } from "@/lib/reporter-actions";

export default function ReceiptConfirm({
  reportId,
  receivedOk,
}: {
  reportId: string;
  receivedOk: boolean | null;
}) {
  const [state, setState] = useState<boolean | null>(receivedOk);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(ok: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await confirmReceipt(reportId, ok);
      if (res.ok) setState(ok);
      else setError(res.error);
    });
  }

  // Sudah dikonfirmasi → tampilkan hasil.
  if (state !== null) {
    return (
      <div
        className={`card rounded-lg px-6 py-5 border-l-[3px] ${
          state ? "border-l-[var(--color-hijau-tuntas)]" : "border-l-[var(--color-genting)]"
        }`}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          {state ? (
            <>
              <CheckCircle2 size={16} className="text-[var(--color-hijau-tuntas)]" />
              <span className="text-[var(--color-hijau-tuntas)]">
                Anda mengonfirmasi air sudah diterima. Terima kasih.
              </span>
            </>
          ) : (
            <>
              <XCircle size={16} className="text-[var(--color-genting)]" />
              <span className="text-[var(--color-genting)]">
                Anda melaporkan air belum diterima. Petugas akan menindaklanjuti.
              </span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card rounded-lg px-6 py-5 border-l-[3px] border-l-[var(--color-air-jernih)]">
      <div className="mono-label flex items-center gap-1.5 mb-2">
        <HandHeart size={12} /> Konfirmasi penerimaan
      </div>
      <p className="text-sm text-[var(--color-tanah-pecah)] mb-4">
        Petugas menandai air sudah disalurkan. Apakah air benar-benar sudah diterima warga? Konfirmasi
        Anda menjadi bukti akuntabilitas penyaluran.
      </p>
      {error && <p className="text-xs text-[var(--color-genting)] mb-3">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => submit(true)}
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 bg-[var(--color-hijau-tuntas)] !text-white text-sm font-medium px-4 py-2.5 rounded-md hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {pending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
          Ya, sudah diterima
        </button>
        <button
          onClick={() => submit(false)}
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 bg-[var(--color-kertas-tua)] text-[var(--color-genting)] border border-[var(--color-kapur-dalam)] text-sm font-medium px-4 py-2.5 rounded-md hover:bg-[#FBF1EF] disabled:opacity-60 transition-colors"
        >
          <XCircle size={15} />
          Belum
        </button>
      </div>
    </div>
  );
}
