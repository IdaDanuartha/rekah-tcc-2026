"use client";

import { useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  MapPin,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Sparkles,
} from "lucide-react";
import { createVillage, updateVillage, deleteVillage } from "@/lib/dashboard-actions";
import { useToast } from "@/components/ui/Toast";
import type { BpbdCategory } from "@/lib/types";
import type { VillageListItem } from "@/lib/dashboard-data";

const kategoriConfig: Record<
  BpbdCategory,
  { label: string; accent: string; chip: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  kritis: { label: "Kritis", accent: "var(--color-genting)", chip: "text-[var(--color-genting)] border-[#CD9683]", icon: AlertTriangle },
  langka: { label: "Langka", accent: "var(--color-siaga)", chip: "text-[var(--color-siaga)] border-[#CBB98A]", icon: Clock },
  terbatas: { label: "Terbatas", accent: "var(--color-lempung)", chip: "text-[var(--color-lempung)] border-[var(--color-kapur-garis)]", icon: CheckCircle2 },
};

// Peta hanya di klien (Leaflet butuh window)
const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[260px] w-full rounded-md border border-[var(--color-kapur-dalam)] bg-[var(--color-kertas-tua)] flex items-center justify-center text-sm text-[var(--color-lempung)]">
      Memuat peta…
    </div>
  ),
});

const inputClass =
  "w-full px-3 py-2.5 bg-[var(--color-kertas)] border border-[var(--color-kapur-dalam)] rounded-md text-sm text-[var(--color-tanah-pecah)] placeholder:text-[var(--color-lempung)] focus:outline-none focus:border-[var(--color-air-jernih)] focus:ring-2 focus:ring-[var(--color-air-jernih)]/20 transition-all";

// Minimal ≥8 digit → nomor valid (mirror parsePhones di server).
const isPhoneish = (s: string) => s.replace(/\D/g, "").length >= 8;

// Input berbentuk chip: ketik nomor → Enter/Spasi/koma untuk menambah.
// Menaruh hidden input `registered_phone` (gabung ", ") — server action tak berubah.
function PhoneChipsInput({ defaultValue }: { defaultValue: string | null }) {
  const [chips, setChips] = useState<string[]>(() =>
    (defaultValue ?? "")
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(isPhoneish),
  );
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (raw: string): boolean => {
    const v = raw.trim();
    if (!isPhoneish(v)) return false;
    setChips((prev) => (prev.includes(v) ? prev : [...prev, v]));
    return true;
  };

  const remove = (i: number) => setChips((prev) => prev.filter((_, idx) => idx !== i));

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " " || e.key === ",") {
      e.preventDefault();
      if (commit(draft)) setDraft("");
    } else if (e.key === "Backspace" && draft === "" && chips.length) {
      remove(chips.length - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!/[\n,;]/.test(text)) return;
    e.preventDefault();
    setChips((prev) => {
      const set = new Set(prev);
      for (const part of text.split(/[\n,;]+/)) {
        const v = part.trim();
        if (isPhoneish(v)) set.add(v);
      }
      return [...set];
    });
  };

  return (
    <div>
      <input type="hidden" name="registered_phone" value={chips.join(", ")} />
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex flex-wrap items-center gap-1.5 min-h-[2.75rem] px-2 py-1.5 bg-[var(--color-kertas)] border border-[var(--color-kapur-dalam)] rounded-md cursor-text transition-all focus-within:border-[var(--color-air-jernih)] focus-within:ring-2 focus-within:ring-[var(--color-air-jernih)]/20"
      >
        {chips.map((chip, i) => (
          <span
            key={`${chip}-${i}`}
            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded bg-[var(--color-air-muda)] border border-[#A9C3CC] text-[var(--color-laterit)] text-xs font-medium"
            style={{ fontFamily: "var(--font-data)" }}
          >
            {chip}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(i);
              }}
              className="p-0.5 rounded hover:bg-[#A9C3CC]/50 text-[var(--color-laterit)]/70 hover:text-[var(--color-laterit)] transition-colors"
              aria-label={`Hapus ${chip}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          inputMode="tel"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => {
            if (commit(draft)) setDraft("");
          }}
          onPaste={handlePaste}
          placeholder={chips.length ? "Tambah nomor…" : "cth: 081234567890 lalu Enter"}
          className="flex-1 min-w-[8rem] bg-transparent px-1 py-1 text-sm text-[var(--color-tanah-pecah)] placeholder:text-[var(--color-lempung)] focus:outline-none"
        />
      </div>
    </div>
  );
}

function lastDropping(iso: string | null): string {
  if (!iso) return "Belum pernah";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  return `${days} hari lalu`;
}

export default function VillagesManager({ villages }: { villages: VillageListItem[] }) {
  // null = tertutup, "new" = tambah, VillageListItem = edit
  const [editing, setEditing] = useState<VillageListItem | "new" | null>(null);
  const [toDelete, setToDelete] = useState<VillageListItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [saving, startSave] = useTransition();
  const [deletePending, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [catValue, setCatValue] = useState("");
  const [page, setPage] = useState(1);
  const toast = useToast();

  const PAGE_SIZE = 9;
  const totalPages = Math.max(1, Math.ceil(villages.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = villages.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const isEdit = editing !== null && editing !== "new";
  const current = isEdit ? (editing as VillageListItem) : null;

  function openModal(target: VillageListItem | "new") {
    setFormError(null);
    setCatValue(target === "new" ? "" : (target.bpbd_category ?? ""));
    setEditing(target);
  }

  function closeModal() {
    setFormError(null);
    setEditing(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSave(async () => {
      const res = isEdit
        ? await updateVillage(null, formData)
        : await createVillage(null, formData);
      if (res.ok) {
        setFormError(null);
        setEditing(null);
        toast.success(isEdit ? "Perubahan desa tersimpan." : "Desa baru ditambahkan.");
      } else {
        setFormError(res.error);
        toast.error(res.error);
      }
    });
  }

  function confirmDelete() {
    if (!toDelete) return;
    const id = toDelete.id;
    const nama = toDelete.name;
    startDelete(async () => {
      const res = await deleteVillage(id);
      if (res.ok) {
        setToDelete(null);
        setDeleteError(null);
        toast.success(`Desa ${nama} dihapus.`);
      } else {
        setDeleteError(res.error);
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      {/* Action bar */}
      <div className="flex items-center justify-between gap-4">
        <p className="mono-label">{villages.length} desa terdaftar</p>
        <button
          onClick={() => openModal("new")}
          className="inline-flex items-center gap-2 bg-[var(--color-tanah-pecah)] !text-white text-sm font-medium pl-3.5 pr-4 py-2 rounded-md hover:bg-[var(--color-air-jernih)] transition-colors shadow-sm shrink-0"
        >
          <Plus size={15} />
          Tambah Desa
        </button>
      </div>

      {/* Grid */}
      {villages.length === 0 ? (
        <div className="card rounded-lg text-center py-16 text-[var(--color-lempung)]">
          <MapPin size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Belum ada data desa. Klik “Tambah Desa” untuk mulai.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageItems.map((desa) => {
            const config = desa.bpbd_category ? kategoriConfig[desa.bpbd_category] : null;
            const Icon = config?.icon ?? MapPin;
            return (
              <div
                key={desa.id}
                className="card card-lift rounded-lg overflow-hidden flex flex-col border-l-[3px] group"
                style={{ borderLeftColor: config?.accent ?? "var(--color-kapur-garis)" }}
              >
                <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
                  <Link href={`/dashboard/villages/${desa.id}`} className="min-w-0 group/link">
                    <h3 className="text-base font-semibold text-[var(--color-tanah-pecah)] group-hover/link:text-[var(--color-air-jernih)] transition-colors truncate" style={{ fontFamily: "var(--font-heading)" }}>
                      {desa.name}
                    </h3>
                    <div className="flex items-center gap-1 mono-label normal-case tracking-normal mt-0.5">
                      <MapPin size={10} className="shrink-0" />
                      {desa.district}, {desa.regency}
                    </div>
                  </Link>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {config && (
                      <span className={`mono-label !text-[0.625rem] px-2 py-0.5 rounded border bg-[var(--color-kertas-tua)] flex items-center gap-1 ${config.chip}`}>
                        <Icon size={10} className="shrink-0" />
                        {config.label}
                      </span>
                    )}
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openModal(desa)}
                        aria-label={`Edit ${desa.name}`}
                        className="p-1.5 rounded-md text-[var(--color-lempung)] hover:text-[var(--color-air-jernih)] hover:bg-[var(--color-air-muda)] transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => { setToDelete(desa); setDeleteError(null); }}
                        aria-label={`Hapus ${desa.name}`}
                        className="p-1.5 rounded-md text-[var(--color-lempung)] hover:text-[var(--color-genting)] hover:bg-[#F1DDDA] transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 mt-auto border-t border-[var(--color-kapur-dalam)] flex items-center justify-between mono-label normal-case tracking-normal">
                  <span className="flex items-center gap-1">
                    <Droplets size={11} className="shrink-0" />
                    {lastDropping(desa.last_dropping_at)}
                  </span>
                  <div className="flex items-center gap-2">
                    {desa.activeReports > 0 && (
                      <span className="bg-[var(--color-air-muda)] text-[var(--color-air-jernih)] px-2 py-0.5 rounded-full font-medium border border-[#A9C3CC] !text-[0.625rem] uppercase tracking-[0.08em]">
                        {desa.activeReports} aktif
                      </span>
                    )}
                    <Link
                      href={`/dashboard/villages/${desa.id}`}
                      aria-label={`Lihat detail ${desa.name}`}
                      className="text-[var(--color-lempung)] hover:text-[var(--color-air-jernih)] transition-colors"
                    >
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-1.5" aria-label="Navigasi halaman desa">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-[var(--color-kapur-dalam)] bg-[var(--color-kertas)] text-sm font-medium text-[var(--color-tanah-pecah)] hover:border-[var(--color-air-jernih)] hover:text-[var(--color-air-jernih)] disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ArrowRight size={14} className="rotate-180" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>
          {Array.from({ length: totalPages }).map((_, idx) => {
            const n = idx + 1;
            return (
              <button
                key={n}
                onClick={() => setPage(n)}
                aria-current={n === currentPage ? "page" : undefined}
                className={`w-9 h-9 rounded-md text-sm font-medium tnum transition-colors ${
                  n === currentPage
                    ? "bg-[var(--color-tanah-pecah)] text-white"
                    : "border border-[var(--color-kapur-dalam)] bg-[var(--color-kertas)] text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)] hover:border-[var(--color-air-jernih)]"
                }`}
                style={{ fontFamily: "var(--font-data)" }}
              >
                {n}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-[var(--color-kapur-dalam)] bg-[var(--color-kertas)] text-sm font-medium text-[var(--color-tanah-pecah)] hover:border-[var(--color-air-jernih)] hover:text-[var(--color-air-jernih)] disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <span className="hidden sm:inline">Berikutnya</span>
            <ArrowRight size={14} />
          </button>
        </nav>
      )}

      {/* Modal tambah / edit */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--color-tanah-pecah)]/40 backdrop-blur-[1px]" onClick={closeModal} />
          <div className="relative card rounded-xl shadow-[var(--shadow-float)] w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
                {isEdit ? "Edit Desa" : "Tambah Desa"}
              </h3>
              <button onClick={closeModal} className="p-1 text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)]">
                <X size={18} />
              </button>
            </div>

            <form
              key={current?.id ?? "new"}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {isEdit && <input type="hidden" name="id" value={current!.id} />}

              <div>
                <label className="mono-label block mb-1">Nama Desa *</label>
                <input type="text" name="name" required defaultValue={current?.name ?? ""} placeholder="cth: Banyuanyar" className={inputClass} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mono-label block mb-1">Kecamatan *</label>
                  <input type="text" name="district" required defaultValue={current?.district ?? ""} placeholder="cth: Robatal" className={inputClass} />
                </div>
                <div>
                  <label className="mono-label block mb-1">Kabupaten *</label>
                  <input type="text" name="regency" required defaultValue={current?.regency ?? ""} placeholder="cth: Sampang" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="mono-label block mb-1">Kategori BPBD</label>
                <select
                  name="bpbd_category"
                  value={catValue}
                  onChange={(e) => setCatValue(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Tidak ditentukan</option>
                  <option value="kritis">Kritis</option>
                  <option value="langka">Langka</option>
                  <option value="terbatas">Terbatas</option>
                </select>
                {isEdit && (
                  <div className="mt-2 flex items-start gap-2 rounded-md bg-[var(--color-kertas-tua)]/60 border border-[var(--color-kapur-dalam)] px-3 py-2">
                    <Sparkles size={13} className="text-[var(--color-air-jernih)] shrink-0 mt-0.5" />
                    {current?.suggestedCategory ? (
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[var(--color-tanah-pecah)]">
                          Saran sistem:{" "}
                          <span className="font-semibold capitalize">{current.suggestedCategory}</span>
                          <span className="mono-label normal-case tracking-normal !text-[0.625rem] ml-1">
                            ({current.suggestReason})
                          </span>
                        </p>
                        {catValue !== current.suggestedCategory && (
                          <button
                            type="button"
                            onClick={() => setCatValue(current.suggestedCategory!)}
                            className="mt-1 text-xs font-medium text-[var(--color-air-jernih)] hover:text-[var(--color-air-tua)] transition-colors"
                          >
                            Terapkan saran
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--color-lempung)] flex-1">
                        Belum cukup data laporan untuk menyusun saran otomatis. Saran muncul setelah desa ini punya laporan (jumlah KK &amp; durasi kering).
                      </p>
                    )}
                  </div>
                )}
                <p className="mono-label normal-case tracking-normal !text-[0.625rem] mt-1.5">
                  Kategori resmi BPBD (keputusan petugas). Saran = heuristik dari data laporan, bukan penentu final.
                </p>
              </div>
              <LocationPicker initialLat={current?.lat ?? null} initialLng={current?.lng ?? null} />
              <div>
                <label className="mono-label block mb-1">Nomor WA Pelapor Terdaftar</label>
                <PhoneChipsInput defaultValue={current?.registered_phone ?? null} />
                <p className="mono-label normal-case tracking-normal !text-[0.625rem] mt-1">
                  Ketik nomor lalu tekan Enter, Spasi, atau koma untuk menambah. Laporan dari nomor ini otomatis terverifikasi.
                </p>
              </div>

              {formError && (
                <p className="text-xs text-[var(--color-genting)]">{formError}</p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[var(--color-tanah-pecah)] !text-white text-sm font-medium py-2.5 rounded-md hover:bg-[var(--color-air-jernih)] disabled:opacity-60 transition-colors"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Droplets size={15} />}
                  {saving ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Simpan Desa"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 text-sm font-medium text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)] transition-colors"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Konfirmasi hapus */}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--color-tanah-pecah)]/40 backdrop-blur-[1px]" onClick={() => !deletePending && setToDelete(null)} />
          <div className="relative card rounded-xl shadow-[var(--shadow-float)] w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-md bg-[#F1DDDA] flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-[var(--color-genting)]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
                  Hapus {toDelete.name}?
                </h3>
                <p className="text-sm text-[var(--color-lempung)] mt-1">
                  Jadwal dropping desa ini ikut terhapus, dan laporan terkait terlepas dari desa. Tindakan tidak bisa dibatalkan.
                </p>
              </div>
            </div>

            {deleteError && <p className="text-xs text-[var(--color-genting)]">{deleteError}</p>}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setToDelete(null)}
                disabled={deletePending}
                className="px-4 py-2.5 text-sm font-medium text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)] disabled:opacity-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletePending}
                className="inline-flex items-center gap-2 bg-[var(--color-genting)] !text-white text-sm font-medium px-4 py-2.5 rounded-md hover:bg-[#8F2E24] disabled:opacity-60 transition-colors"
              >
                {deletePending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                {deletePending ? "Menghapus…" : "Hapus Desa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
