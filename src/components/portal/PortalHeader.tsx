"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Loader2, MessageSquarePlus } from "lucide-react";
import { useChat } from "@/components/portal/PortalChatProvider";
import LogoMark from "@/components/ui/LogoMark";

export default function PortalHeader({ nomor }: { nomor: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const chat = useChat();

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/reporter/logout", { method: "POST" });
    } finally {
      router.push("/portal/login");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-kapur-karang)]/90 backdrop-blur-md border-b border-[var(--color-kapur-garis)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={28} />
          <div className="leading-tight">
            <div
              className="text-base font-semibold text-[var(--color-tanah-pecah)]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Portal Pelapor
            </div>
            <div className="mono-label !text-[0.625rem] normal-case tracking-normal">
              {nomor}
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-1.5">
          <button
            onClick={chat.open}
            className="inline-flex items-center gap-2 text-sm font-medium !text-white bg-[var(--color-air-jernih)] px-3 py-2 rounded-md hover:bg-[var(--color-air-tua)] transition-colors"
          >
            <MessageSquarePlus size={15} />
            <span className="hidden sm:inline">Lapor</span>
          </button>

          <button
            onClick={logout}
            disabled={loading}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-genting)] px-3 py-2 rounded-md hover:bg-[#FBF1EF] disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
