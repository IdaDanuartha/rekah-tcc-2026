"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Nfc, Loader2, CheckCircle2, Trash2, Tag, MapPin } from "lucide-react";
import { registerNfcTag, deleteNfcTag, type NfcTag } from "@/lib/nfc-actions";

type VillageOpt = { id: string; name: string; district: string };

export default function NfcManager({
  villages,
  tags,
}: {
  villages: VillageOpt[];
  tags: NfcTag[];
}) {
  const router = useRouter();
  const [uid, setUid] = useState("");
  const [villageId, setVillageId] = useState("");
  const [label, setLabel] = useState("");
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function scan() {
    setMsg(null);
    if (typeof window === "undefined" || !("NDEFReader" in window)) {
      setMsg({ type: "err", text: "Browser ini tidak mendukung NFC. Pakai Chrome di Android, atau ketik UID manual." });
      return;
    }
    try {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reader = new (window as any).NDEFReader();
      setScanning(true);
      await reader.scan({ signal: ctrl.signal });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reader.onreading = (e: any) => {
        let value: string = e.serialNumber || "";
        if (!value) {
          for (const rec of e.message.records) {
            if (rec.recordType === "text") {
              value = new TextDecoder(rec.encoding || "utf-8").decode(rec.data);
              break;
            }
            if (rec.recordType === "url") {
              value = new TextDecoder().decode(rec.data);
              break;
            }
          }
        }
        if (value) setUid(value);
        setScanning(false);
        ctrl.abort();
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reader.onreadingerror = () => {
        setMsg({ type: "err", text: "Gagal membaca stiker. Dekatkan HP ke stiker lalu coba lagi." });
        setScanning(false);
      };
    } catch (err) {
      setScanning(false);
      const name = err instanceof DOMException ? err.name : "";
      setMsg({
        type: "err",
        text: name === "NotAllowedError" ? "Izin NFC ditolak. Aktifkan NFC di HP lalu izinkan." : "Gagal memulai NFC. Pastikan NFC aktif.",
      });
    }
  }

  async function save() {
    setMsg(null);
    setSaving(true);
    const res = await registerNfcTag(uid, villageId, label);
    setSaving(false);
    if (res.ok) {
      setMsg({ type: "ok", text: "Stiker terdaftar." });
      setUid("");
      setLabel("");
      router.refresh();
    } else {
      setMsg({ type: "err", text: res.error });
    }
  }

  async function remove(u: string) {
    await deleteNfcTag(u);
    router.refresh();
  }

  const inputCls =
    "w-full px-3 py-2.5 bg-[var(--color-kertas)] border border-[var(--color-kapur-dalam)] rounded-md text-sm text-[var(--color-tanah-pecah)] placeholder:text-[var(--color-lempung)] focus:outline-none focus:border-[var(--color-air-jernih)] focus:ring-2 focus:ring-[var(--color-air-jernih)]/20 transition-all";

  return (
    <div className="space-y-6">
      {/* Form register */}
      <div className="card rounded-lg p-5 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
          Daftarkan stiker
        </h2>

        <div>
          <label className="mono-label block mb-1.5">UID stiker</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={scan}
              disabled={scanning}
              className="inline-flex items-center gap-2 shrink-0 px-4 py-2.5 rounded-md text-sm font-semibold bg-[var(--color-air-jernih)] !text-white hover:bg-[var(--color-air-tua)] disabled:opacity-70 transition-colors"
            >
              {scanning ? <Loader2 size={16} className="animate-spin" /> : <Nfc size={16} />}
              {scanning ? "Dekatkan…" : "Tap stiker"}
            </button>
            <input
              type="text"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="UID terisi otomatis, atau ketik manual"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="mono-label block mb-1.5">Desa tujuan</label>
            <select value={villageId} onChange={(e) => setVillageId(e.target.value)} className={inputCls}>
              <option value="">— pilih desa —</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.district}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mono-label block mb-1.5">Label titik (opsional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="cth: Balai Desa, Masjid RW02"
              className={inputCls}
            />
          </div>
        </div>

        {msg && (
          <p className={`text-xs ${msg.type === "ok" ? "text-[var(--color-hijau-tuntas)]" : "text-[var(--color-genting)]"}`}>
            {msg.text}
          </p>
        )}

        <button
          onClick={save}
          disabled={saving || !uid.trim() || !villageId}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold bg-[var(--color-hijau-tuntas)] !text-white hover:bg-[#345B48] disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
          {saving ? "Menyimpan…" : "Daftarkan stiker"}
        </button>
      </div>

      {/* Daftar terdaftar */}
      <div className="card rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
            Stiker terdaftar
          </h2>
          <span className="mono-label">{tags.length} tag</span>
        </div>

        {tags.length === 0 ? (
          <p className="text-sm text-[var(--color-lempung)] py-6 text-center">Belum ada stiker terdaftar.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-kapur-dalam)]">
            {tags.map((t) => (
              <li key={t.uid} className="flex items-center gap-3 py-3">
                <Tag size={16} className="text-[var(--color-air-jernih)] shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[var(--color-tanah-pecah)] font-mono truncate">{t.uid}</div>
                  <div className="text-xs text-[var(--color-lempung)] flex items-center gap-1.5 mt-0.5">
                    <MapPin size={11} /> {t.villageName}
                    {t.label ? ` · ${t.label}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => remove(t.uid)}
                  className="p-2 text-[var(--color-lempung)] hover:text-[var(--color-genting)] transition-colors shrink-0"
                  aria-label="Hapus stiker"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
