"use client";

import { useState } from "react";
import { X, Expand } from "lucide-react";

// Thumbnail foto bukti serah terima + klik untuk perbesar (lightbox).
// Foto ada di Supabase Storage bucket publik 'proofs'.
export default function ProofPhoto({
  url,
  size = "md",
}: {
  url: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const dim = size === "sm" ? "h-16 w-16" : "h-28 w-full max-w-[12rem]";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative ${dim} rounded-md overflow-hidden border border-[var(--color-kapur-dalam)] bg-[var(--color-kertas-tua)] cursor-zoom-in`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Bukti serah terima" className="h-full w-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-[var(--color-tanah-pecah)]/0 group-hover:bg-[var(--color-tanah-pecah)]/30 transition-colors">
          <Expand size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-[var(--color-tanah-pecah)]/70 backdrop-blur-[2px]" />
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Bukti serah terima"
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-[92vw] object-contain rounded-lg shadow-[var(--shadow-float)]"
          />
        </div>
      )}
    </>
  );
}
