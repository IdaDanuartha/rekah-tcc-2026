"use client";

import { PenLine, ArrowRight } from "lucide-react";
import { useChat } from "@/components/portal/PortalChatProvider";

export default function LaporCta() {
  const chat = useChat();
  return (
    <button
      onClick={chat.open}
      className="card card-lift rounded-lg w-full flex items-center gap-3 px-5 py-4 text-left group"
    >
      <div className="w-9 h-9 rounded-md bg-[var(--color-air-muda)] flex items-center justify-center shrink-0">
        <PenLine size={17} className="text-[var(--color-air-jernih)]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-[var(--color-tanah-pecah)]">Buat laporan baru</div>
        <div className="mono-label normal-case tracking-normal">Ngobrol dengan asisten, tanpa WhatsApp</div>
      </div>
      <ArrowRight
        size={16}
        className="text-[var(--color-lempung)] group-hover:text-[var(--color-air-jernih)] group-hover:translate-x-0.5 transition-all"
      />
    </button>
  );
}
