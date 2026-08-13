"use client";

import { useEffect, useRef, useState } from "react";
import { QrCode, Loader2, CheckCircle2, RefreshCw, X } from "lucide-react";
import { actionReconnectQR, actionDeviceInfo } from "@/lib/fonnte-actions";

export default function FonnteReconnect({ initialConnected }: { initialConnected: boolean }) {
  const [connected, setConnected] = useState(initialConnected);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPoll() {
    if (poll.current) {
      clearInterval(poll.current);
      poll.current = null;
    }
  }

  // Poll status selama QR ditampilkan; berhenti saat tersambung.
  useEffect(() => {
    if (!qr) {
      stopPoll();
      return;
    }
    poll.current = setInterval(async () => {
      const info = await actionDeviceInfo();
      if (info.connected) {
        setConnected(true);
        setQr(null);
        setMsg("Device tersambung kembali.");
        stopPoll();
      }
    }, 4000);
    return stopPoll;
  }, [qr]);

  async function showQR() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await actionReconnectQR();
      if (res.alreadyConnected) {
        setConnected(true);
        setMsg("Device sudah tersambung.");
      } else if (res.ok && res.image) {
        setQr(res.image);
      } else {
        setMsg(res.error ?? "Gagal mengambil QR.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setLoading(true);
    const info = await actionDeviceInfo();
    setConnected(info.connected);
    setMsg(info.connected ? "Tersambung." : info.error ?? "Terputus.");
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {!connected && (
          <button
            onClick={showQR}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-[var(--color-tanah-pecah)] !text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-[var(--color-air-jernih)] disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <QrCode size={15} />}
            Sambungkan ulang (scan QR)
          </button>
        )}
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 border border-[var(--color-kapur-dalam)] bg-[var(--color-kertas)] text-[var(--color-tanah-pecah)] text-sm font-medium px-4 py-2 rounded-md hover:border-[var(--color-air-jernih)] disabled:opacity-60 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Segarkan status
        </button>
      </div>

      {msg && (
        <p className="flex items-center gap-1.5 text-sm text-[var(--color-hijau-tuntas)]">
          <CheckCircle2 size={14} /> {msg}
        </p>
      )}

      {qr && (
        <div className="card rounded-lg p-4 inline-flex flex-col items-center gap-2 relative">
          <button
            onClick={() => setQr(null)}
            className="absolute top-2 right-2 p-1 text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)]"
            aria-label="Tutup QR"
          >
            <X size={16} />
          </button>
          <p className="mono-label">Scan dari WhatsApp → Perangkat tertaut</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR sambungkan WhatsApp" width={220} height={220} className="rounded bg-white p-2" />
          <p className="flex items-center gap-1.5 mono-label normal-case tracking-normal">
            <Loader2 size={12} className="animate-spin" /> Menunggu koneksi…
          </p>
        </div>
      )}
    </div>
  );
}
