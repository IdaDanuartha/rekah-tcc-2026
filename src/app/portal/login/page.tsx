"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoMark from "@/components/ui/LogoMark";
import {
  MessageCircle,
  ArrowRight,
  AlertCircle,
  Loader2,
  KeyRound,
  ArrowLeft,
} from "lucide-react";

type Step = "nomor" | "kode";

export default function PortalMasukPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("nomor");
  const [nomor, setNomor] = useState("");
  const [kode, setKode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function kirimKode(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/reporter/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim kode.");
      setStep("kode");
      setInfo(
        data.demo
          ? "Mode demo aktif — gunakan kode demo dari petugas."
          : "Kode terkirim ke WhatsApp Anda. Cek pesan masuk."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  async function verifikasi(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reporter/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomor, kode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kode tidak valid.");
      router.push("/portal");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[var(--color-kapur-karang)]">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-3">
            <LogoMark size={36} />
            <span
              className="text-2xl font-semibold text-[var(--color-tanah-pecah)] tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Rekah
            </span>
          </Link>
          <div className="mono-label !text-xs text-[var(--color-lempung)]">
            Portal Pelapor · Lacak laporan air bersih Anda
          </div>
        </div>

        <div className="card rounded-xl p-6 sm:p-8 shadow-[var(--shadow-lift)] space-y-6">
          <div>
            <h1
              className="text-xl font-semibold text-[var(--color-tanah-pecah)]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {step === "nomor" ? "Masuk dengan WhatsApp" : "Masukkan kode"}
            </h1>
            <p className="text-xs text-[var(--color-lempung)] mt-1">
              {step === "nomor"
                ? "Kami kirim kode 6 digit ke nomor WhatsApp Anda. Tanpa kata sandi."
                : `Kode dikirim ke ${nomor}.`}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#FAF0EE] border border-[#E0A99C] text-[var(--color-genting)] text-xs">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {info && !error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--color-air-muda)] border border-[#9ECADC] text-[var(--color-air-tua)] text-xs">
              <MessageCircle size={15} className="shrink-0 mt-0.5" />
              <span>{info}</span>
            </div>
          )}

          {step === "nomor" ? (
            <form onSubmit={kirimKode} className="space-y-4">
              <div>
                <label className="mono-label block mb-1.5 text-[0.6875rem]">
                  Nomor WhatsApp
                </label>
                <div className="relative">
                  <MessageCircle
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-lempung)] pointer-events-none"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="0812xxxxxxxx"
                    value={nomor}
                    onChange={(e) => setNomor(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className={btnPrimary}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {loading ? "Mengirim…" : "Kirim kode"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifikasi} className="space-y-4">
              <div>
                <label className="mono-label block mb-1.5 text-[0.6875rem]">
                  Kode 6 digit
                </label>
                <div className="relative">
                  <KeyRound
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-lempung)] pointer-events-none"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    placeholder="••••••"
                    value={kode}
                    onChange={(e) => setKode(e.target.value.replace(/\D/g, ""))}
                    className={`${inputClass} tracking-[0.5em] font-[var(--font-data)]`}
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className={btnPrimary}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {loading ? "Memeriksa…" : "Masuk"}
              </button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep("nomor");
                    setKode("");
                    setError(null);
                  }}
                  className="inline-flex items-center gap-1 text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)]"
                >
                  <ArrowLeft size={12} /> Ganti nomor
                </button>
                <button
                  type="button"
                  onClick={() => kirimKode()}
                  disabled={loading}
                  className="text-[var(--color-air-jernih)] hover:text-[var(--color-air-tua)] disabled:opacity-50"
                >
                  Kirim ulang kode
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="text-center space-y-1.5">
          <Link
            href="/"
            className="block text-xs text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)] transition-colors"
          >
            ← Kembali ke beranda
          </Link>
          <Link
            href="/login"
            className="block text-xs text-[var(--color-lempung)] hover:text-[var(--color-air-jernih)] transition-colors"
          >
            Anda petugas BPBD? Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full pl-10 pr-3.5 py-2.5 bg-[var(--color-kapur-karang)] border border-[var(--color-kapur-dalam)] rounded-md text-sm text-[var(--color-tanah-pecah)] placeholder:text-[var(--color-lempung)]/60 focus:outline-none focus:border-[var(--color-air-jernih)] focus:ring-2 focus:ring-[var(--color-air-jernih)]/20 transition-all";

const btnPrimary =
  "w-full flex items-center justify-center gap-2 bg-[var(--color-tanah-pecah)] !text-white font-medium text-sm py-2.5 rounded-md hover:bg-[var(--color-air-jernih)] disabled:opacity-60 transition-colors shadow-sm";


