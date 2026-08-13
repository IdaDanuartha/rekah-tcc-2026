"use client";

// Demo percakapan WhatsApp yang berjalan sendiri (seperti video):
// pesan muncul satu per satu, ada indikator "mengetik", lalu mengulang.
// Menghormati prefers-reduced-motion (tampil statis penuh).

import { useEffect, useRef, useState } from "react";
import { MessageCircle, CheckCheck, Send } from "lucide-react";

type Msg = { from: "warga" | "rekah"; text: string; time: string };

const SCRIPT: Msg[] = [
  { from: "warga", text: "Air di Desa Banyuanyar sudah kering 2 minggu, sekitar 340 KK butuh dropping", time: "07:24" },
  { from: "rekah", text: "Laporan diterima. Nomor #RKH-0247, sedang diverifikasi petugas BPBD Sampang.", time: "07:24" },
  { from: "rekah", text: "Untuk mempercepat, sudah berapa hari sumur utama desa kering?", time: "07:24" },
  { from: "warga", text: "Sekitar 14 hari pak, sumur bor juga sudah surut", time: "07:25" },
  { from: "rekah", text: "Terima kasih. Data lengkap, prioritas terhitung. Laporan diteruskan ke petugas BPBD untuk penjadwalan dropping.", time: "07:25" },
];

export default function WhatsAppDemo() {
  // Jumlah pesan yang sudah tampil; typing = indikator mengetik untuk pesan berikutnya.
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const push = (fn: () => void, delay: number) => {
      const id = setTimeout(fn, delay);
      timers.current.push(id);
    };

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      // Tampil statis penuh (dijadwalkan agar tak setState sinkron di effect).
      push(() => setShown(SCRIPT.length), 0);
    } else {
      const run = (i: number) => {
        if (i >= SCRIPT.length) {
          push(() => {
            setShown(0);
            setTyping(false);
            run(0);
          }, 3200);
          return;
        }
        const isBot = SCRIPT[i].from === "rekah";
        const preTyping = isBot ? 900 : 500;
        if (isBot) push(() => setTyping(true), 200);
        push(() => {
          setTyping(false);
          setShown(i + 1);
          run(i + 1);
        }, preTyping + 700);
      };
      run(0);
    }

    const t = timers.current;
    return () => {
      t.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  // Auto-scroll ke bawah tiap pesan/typing baru
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown, typing]);

  return (
    <div
      className="rounded-xl overflow-hidden border border-black/30 shadow-inner flex flex-col"
      style={{ backgroundColor: "#0B141A" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ backgroundColor: "#1F2C33" }}>
        <div className="w-8 h-8 rounded-full bg-[var(--color-hijau-tuntas)] flex items-center justify-center shrink-0">
          <MessageCircle size={16} className="text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#E9EDEF] leading-tight">Posko Rekah · BPBD</div>
          <div className="text-[0.625rem] text-[#8FB4A8] leading-tight">
            {typing ? "sedang mengetik…" : "online"}
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        ref={bodyRef}
        className="px-3 py-3 space-y-2 flex flex-col overflow-y-auto h-[300px] scroll-smooth"
        style={{ backgroundColor: "#0B141A" }}
      >
        {SCRIPT.slice(0, shown).map((m, i) => {
          const mine = m.from === "warga";
          return (
            <div
              key={i}
              className={`wa-msg max-w-[82%] rounded-lg px-2.5 py-1.5 ${mine ? "self-end rounded-tr-sm" : "self-start rounded-tl-sm"}`}
              style={{ backgroundColor: mine ? "#005C4B" : "#202C33" }}
            >
              <p className="text-xs text-[#E9EDEF] leading-snug">{m.text}</p>
              <span
                className={`flex items-center gap-0.5 text-[0.5625rem] mt-0.5 ${mine ? "justify-end text-[#8FB4A8]" : "justify-end text-[#8696A0]"}`}
              >
                {m.time}
                {mine && <CheckCheck size={12} className="text-[#53BDEB]" />}
              </span>
            </div>
          );
        })}

        {/* Indikator mengetik (bubble kiri) */}
        {typing && (
          <div className="wa-msg self-start rounded-lg rounded-tl-sm px-3 py-2" style={{ backgroundColor: "#202C33" }}>
            <span className="flex items-center gap-1">
              <span className="wa-dot" />
              <span className="wa-dot" style={{ animationDelay: "0.15s" }} />
              <span className="wa-dot" style={{ animationDelay: "0.3s" }} />
            </span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: "#1F2C33" }}>
        <div className="flex-1 rounded-full px-3 py-1.5 text-xs text-[#8696A0]" style={{ backgroundColor: "#2A3942" }}>
          Ketik pesan…
        </div>
        <div className="w-7 h-7 rounded-full bg-[var(--color-hijau-tuntas)] flex items-center justify-center shrink-0">
          <Send size={13} className="text-white" />
        </div>
      </div>
    </div>
  );
}
