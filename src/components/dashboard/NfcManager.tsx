"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Nfc, Loader2, CheckCircle2, Trash2, Tag, MapPin, Pencil, Keyboard, X } from "lucide-react";
import { registerNfcTag, deleteNfcTag, type NfcTag } from "@/lib/nfc-actions";
import Combobox from "@/components/ui/Combobox";

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
  const [manual, setManual] = useState(false); // true = ketik UID manual (baru tampilkan kode)
  const [tapped, setTapped] = useState(false); // UID terbaca via tap (kode disembunyikan)
  const [editing, setEditing] = useState<NfcTag | null>(null); // stiker yg sedang diedit
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<NfcTag | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [comboKey, setComboKey] = useState(0); // remount Combobox utk reset / set default
  const abortRef = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  function resetForm() {
    setUid("");
    setLabel("");
    setVillageId("");
    setManual(false);
    setTapped(false);
    setEditing(null);
    setComboKey((k) => k + 1);
  }

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
        if (value) {
          setUid(value);
          setTapped(true);
          setManual(false); // tap = kode disembunyikan
        }
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

  function startEdit(t: NfcTag) {
    setMsg(null);
    setUid(t.uid);
    setVillageId(t.village_id);
    setLabel(t.label);
    setEditing(t);
    setManual(false);
    setTapped(false);
    setComboKey((k) => k + 1); // Combobox pakai defaultValue = desa stiker
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function save() {
    setMsg(null);
    setSaving(true);
    const res = await registerNfcTag(uid, villageId, label);
    setSaving(false);
    if (res.ok) {
      setMsg({ type: "ok", text: editing ? "Stiker diperbarui." : "Stiker terdaftar." });
      resetForm();
      router.refresh();
    } else {
      setMsg({ type: "err", text: res.error });
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await deleteNfcTag(toDelete.uid);
    setDeleting(false);
    if (res.ok) {
      setToDelete(null);
      if (editing?.uid === toDelete.uid) resetForm();
      router.refresh();
    } else {
      setDeleteError(res.error);
    }
  }

  const inputCls =
    "w-full px-3 py-2.5 bg-[var(--color-kertas)] border border-[var(--color-kapur-dalam)] rounded-md text-sm text-[var(--color-tanah-pecah)] placeholder:text-[var(--color-lempung)] focus:outline-none focus:border-[var(--color-air-jernih)] focus:ring-2 focus:ring-[var(--color-air-jernih)]/20 transition-all";

  return (
    <>
    <div className="space-y-6">
      {/* Form register / edit */}
      <div ref={formRef} className="card rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
            {editing ? "Edit stiker" : "Daftarkan stiker"}
          </h2>
          {editing && (
            <button
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)] transition-colors"
            >
              <X size={13} /> Batal edit
            </button>
          )}
        </div>

        <div>
          <label className="mono-label block mb-1.5">UID stiker</label>

          {editing ? (
            // Saat edit, UID adalah kunci — dikunci, tak bisa diubah di sini.
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-[var(--color-kertas-tua)]/60 border border-[var(--color-kapur-dalam)] text-sm">
              <Tag size={14} className="text-[var(--color-air-jernih)] shrink-0" />
              <span className="font-mono text-[var(--color-tanah-pecah)] truncate">{uid}</span>
              <span className="mono-label ml-auto shrink-0">terkunci</span>
            </div>
          ) : manual ? (
            // Mode manual: baru tampilkan kolom kode.
            <input
              type="text"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="Ketik UID stiker, cth: 53:8F:F3:F4:32:00:01"
              autoFocus
              className={inputCls}
            />
          ) : (
            // Mode tap: kode TIDAK ditampilkan, cuma status terbaca.
            <div className="flex gap-2">
              <button
                type="button"
                onClick={scan}
                disabled={scanning}
                className="inline-flex items-center gap-2 shrink-0 px-4 py-2.5 rounded-md text-sm font-semibold bg-[var(--color-air-jernih)] !text-white hover:bg-[var(--color-air-tua)] disabled:opacity-70 transition-colors"
              >
                {scanning ? <Loader2 size={16} className="animate-spin" /> : <Nfc size={16} />}
                {scanning ? "Dekatkan…" : tapped ? "Ulang tap" : "Tap stiker"}
              </button>
              <div
                className={`flex-1 inline-flex items-center gap-2 px-3 rounded-md border text-sm ${
                  tapped
                    ? "bg-[var(--color-hijau-tuntas)]/10 border-[var(--color-hijau-tuntas)] text-[var(--color-hijau-tuntas)] font-semibold"
                    : "bg-[var(--color-kertas-tua)]/60 border-[var(--color-kapur-dalam)] text-[var(--color-lempung)]"
                }`}
              >
                {tapped ? (
                  <>
                    <CheckCircle2 size={15} /> Tag terbaca — siap didaftarkan
                  </>
                ) : (
                  "Tempelkan HP ke stiker untuk membaca UID"
                )}
              </div>
            </div>
          )}

          {/* Toggle tap ↔ manual (tak tampil saat edit) */}
          {!editing && (
            <button
              type="button"
              onClick={() => {
                setManual((m) => !m);
                setUid("");
                setTapped(false);
              }}
              className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-[var(--color-lempung)] hover:text-[var(--color-air-jernih)] transition-colors"
            >
              {manual ? <><Nfc size={12} /> Pakai tap NFC</> : <><Keyboard size={12} /> Ketik UID manual</>}
            </button>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="mono-label block mb-1.5">Desa tujuan</label>
            <Combobox
              key={comboKey}
              name="village"
              placeholder="— pilih desa —"
              defaultValue={villageId}
              onChange={setVillageId}
              options={villages.map((v) => ({ value: v.id, label: `${v.name} · ${v.district}` }))}
            />
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
          {saving ? "Menyimpan…" : editing ? "Simpan perubahan" : "Daftarkan stiker"}
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
              <li
                key={t.uid}
                className={`flex items-center gap-3 py-3 ${editing?.uid === t.uid ? "opacity-60" : ""}`}
              >
                <Tag size={16} className="text-[var(--color-air-jernih)] shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[var(--color-tanah-pecah)] font-mono truncate">{t.uid}</div>
                  <div className="text-xs text-[var(--color-lempung)] flex items-center gap-1.5 mt-0.5">
                    <MapPin size={11} /> {t.villageName}
                    {t.label ? ` · ${t.label}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => startEdit(t)}
                  className="p-2 text-[var(--color-lempung)] hover:text-[var(--color-air-jernih)] transition-colors shrink-0"
                  aria-label="Edit stiker"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => { setToDelete(t); setDeleteError(null); }}
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

    {/* Konfirmasi hapus */}
    {toDelete && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[var(--color-tanah-pecah)]/40 backdrop-blur-[1px]" onClick={() => !deleting && setToDelete(null)} />
        <div className="relative card rounded-xl shadow-[var(--shadow-float)] w-full max-w-md p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-md bg-[#F1DDDA] flex items-center justify-center shrink-0">
              <Trash2 size={18} className="text-[var(--color-genting)]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
                Hapus stiker ini?
              </h3>
              <p className="text-sm text-[var(--color-lempung)] mt-1">
                <span className="font-mono text-[var(--color-tanah-pecah)]">{toDelete.uid}</span> · {toDelete.villageName}
                {toDelete.label ? ` (${toDelete.label})` : ""}. Sopir tak bisa lagi menyelesaikan dropping dengan tag ini. Tindakan tidak bisa dibatalkan.
              </p>
            </div>
          </div>

          {deleteError && <p className="text-xs text-[var(--color-genting)]">{deleteError}</p>}

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setToDelete(null)}
              disabled={deleting}
              className="px-4 py-2.5 text-sm font-medium text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)] disabled:opacity-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 bg-[var(--color-genting)] !text-white text-sm font-medium px-4 py-2.5 rounded-md hover:bg-[#8F2E24] disabled:opacity-60 transition-colors"
            >
              {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              {deleting ? "Menghapus…" : "Hapus Stiker"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
