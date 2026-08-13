"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, Loader2, X, Plus, CheckCircle2 } from "lucide-react";
import {
  loadConversation,
  sendChatMessage,
  type ChatMessage,
} from "@/lib/reporter-actions";

const GREETING: ChatMessage = {
  role: "assistant",
  text: "Halo! Ceritakan kondisi kekeringan di desa Anda. Sebutkan nama desa & kecamatan, perkiraan jumlah KK terdampak, dan sudah berapa lama air kering.",
};

export default function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [reportId, setReportId] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [priceAsked, setPriceAsked] = useState(false);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [loadingHistory, setLoadingHistory] = useState(false);
  const loadedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Muat riwayat sekali saat pertama dibuka.
  useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    setLoadingHistory(true);
    loadConversation()
      .then((c) => {
        setReportId(c.reportId);
        setComplete(c.complete);
        setMessages(c.messages.length > 0 ? c.messages : [GREETING]);
      })
      .finally(() => setLoadingHistory(false));
  }, [open]);

  // Auto-scroll ke pesan terbaru.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, open]);

  function send() {
    const text = input.trim();
    if (!text || pending) return;

    const currentReport = reportId;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");

    startTransition(async () => {
      const askedBefore = priceAsked;
      const res = await sendChatMessage(currentReport, text, askedBefore);
      if (res.ok) {
        // Baru menanyakan harga (data inti lengkap, harga kosong, belum pernah nanya)
        // → tetap terikat sekali lagi supaya jawaban harga nyambung.
        const askingPriceNow = res.complete && res.hargaAir == null && !askedBefore;
        if (askingPriceNow) setPriceAsked(true);
        const fullyDone = !res.reportId || (res.complete && !askingPriceNow);
        setReportId(fullyDone ? null : res.reportId);
        setComplete(res.complete);
        setMessages((m) => [...m, { role: "assistant", text: res.botText }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", text: res.error }]);
      }
    });
  }

  function newReport() {
    setReportId(null);
    setComplete(false);
    setPriceAsked(false);
    setMessages([GREETING]);
    setInput("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-black/30 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md flex flex-col bg-[var(--color-kertas)] shadow-2xl border-l border-[var(--color-kapur-dalam)] transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Chat lapor"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 h-16 border-b border-[var(--color-kapur-dalam)] shrink-0">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[var(--color-tanah-pecah)]">Lapor kekeringan</div>
            <div className="mono-label normal-case tracking-normal">
              {complete ? "Data lengkap" : reportId ? "Sedang dilengkapi" : "Laporan baru"}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={newReport}
              title="Laporan baru"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-air-jernih)] px-2.5 py-1.5 rounded-md hover:bg-[var(--color-kertas-tua)] transition-colors"
            >
              <Plus size={14} /> Baru
            </button>
            <button
              onClick={onClose}
              title="Tutup"
              className="p-2 rounded-md text-[var(--color-lempung)] hover:bg-[var(--color-kertas-tua)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Riwayat */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
          {loadingHistory && (
            <div className="flex justify-center py-4">
              <Loader2 size={16} className="animate-spin text-[var(--color-lempung)]" />
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[82%] rounded-2xl rounded-br-sm bg-[var(--color-air-jernih)] px-3.5 py-2 text-sm text-white whitespace-pre-line"
                    : "max-w-[82%] rounded-2xl rounded-bl-sm bg-[var(--color-kertas-tua)] border border-[var(--color-kapur-dalam)] px-3.5 py-2 text-sm text-[var(--color-tanah-pecah)] whitespace-pre-line"
                }
              >
                {m.text}
              </div>
            </div>
          ))}

          {pending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-[var(--color-kertas-tua)] border border-[var(--color-kapur-dalam)] px-3.5 py-2.5">
                <Loader2 size={14} className="animate-spin text-[var(--color-lempung)]" />
              </div>
            </div>
          )}

          {complete && !pending && (
            <div className="flex items-center gap-1.5 justify-center pt-1 text-xs text-[var(--color-hijau-tuntas)]">
              <CheckCircle2 size={13} /> Laporan lengkap — petugas akan menindaklanjuti.
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-[var(--color-kapur-dalam)] px-3 py-3 flex items-end gap-2 shrink-0">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Contoh: Air di Desa Banyuanyar, Kec. Robatal kering 2 minggu, ±340 KK."
            className="flex-1 px-3 py-2.5 bg-[var(--color-kertas)] border border-[var(--color-kapur-dalam)] rounded-md text-sm text-[var(--color-tanah-pecah)] placeholder:text-[var(--color-lempung)] focus:outline-none focus:border-[var(--color-air-jernih)] focus:ring-2 focus:ring-[var(--color-air-jernih)]/20 transition-all resize-none max-h-32"
          />
          <button
            onClick={send}
            disabled={pending || !input.trim()}
            className="inline-flex items-center justify-center bg-[var(--color-air-jernih)] !text-white h-11 w-11 rounded-md hover:bg-[var(--color-air-tua)] disabled:opacity-60 transition-colors shrink-0"
          >
            {pending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </aside>
    </>
  );
}
