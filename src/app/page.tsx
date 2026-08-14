"use client";

import { useState, useEffect } from "react";
import LogoMark from "@/components/ui/LogoMark";
import {
  MapPin,
  Clock,
  CheckCircle2,
  Truck,
  AlertTriangle,
  Search,
  ArrowRight,
  MessageCircle,
  Sparkles,
  ListChecks,
  ShieldCheck,
  Route,
  Camera,
  BarChart3,
  Eye,
  Menu,
  X,
  Mail,
  Phone,
  LogIn,
  LayoutDashboard,
  FileText,
} from "lucide-react";
import HeroLeafletMap, { type HeroPoint } from "@/components/ui/HeroLeafletMap";
import WhatsAppDemo from "@/components/ui/WhatsAppDemo";
import StatusBadge from "@/components/ui/StatusBadge";
import { PriorityBar } from "@/components/ui/PriorityIndicator";
import type { ReportStatus, BpbdCategory } from "@/lib/types";
import type { PublicDirectoryVillage } from "@/lib/public-data";

// =============================================
// Mock data — diganti data Supabase saat credentials tersedia
// =============================================

const mockDesa = [
  {
    id: "1",
    nama: "Banyuanyar",
    kecamatan: "Robatal",
    kabupaten: "Sampang",
    kategori_bpbd: "kritis" as BpbdCategory,
    status: "scheduled" as ReportStatus,
    skor: 87,
    estimasi_kk: 340,
    durasi_hari: 18,
    progress: 45,
    terakhir_dropping: "3 hari lalu",
  },
  {
    id: "2",
    nama: "Labuhan",
    kecamatan: "Sreseh",
    kabupaten: "Sampang",
    kategori_bpbd: "langka" as BpbdCategory,
    status: "verified" as ReportStatus,
    skor: 72,
    estimasi_kk: 215,
    durasi_hari: 12,
    progress: 20,
    terakhir_dropping: "8 hari lalu",
  },
  {
    id: "3",
    nama: "Pakaan Barat",
    kecamatan: "Blega",
    kabupaten: "Bangkalan",
    kategori_bpbd: "kritis" as BpbdCategory,
    status: "pending" as ReportStatus,
    skor: 91,
    estimasi_kk: 480,
    durasi_hari: 22,
    progress: 0,
    terakhir_dropping: "Belum pernah",
  },
  {
    id: "4",
    nama: "Tanah Merah Laok",
    kecamatan: "Tanah Merah",
    kabupaten: "Bangkalan",
    kategori_bpbd: "terbatas" as BpbdCategory,
    status: "done" as ReportStatus,
    skor: 55,
    estimasi_kk: 128,
    durasi_hari: 7,
    progress: 100,
    terakhir_dropping: "Hari ini",
  },
  {
    id: "5",
    nama: "Sokobanah Daya",
    kecamatan: "Sokobanah",
    kabupaten: "Sampang",
    kategori_bpbd: "langka" as BpbdCategory,
    status: "scheduled" as ReportStatus,
    skor: 68,
    estimasi_kk: 290,
    durasi_hari: 14,
    progress: 60,
    terakhir_dropping: "5 hari lalu",
  },
  {
    id: "6",
    nama: "Galis",
    kecamatan: "Galis",
    kabupaten: "Bangkalan",
    kategori_bpbd: "terbatas" as BpbdCategory,
    status: "verified" as ReportStatus,
    skor: 43,
    estimasi_kk: 175,
    durasi_hari: 9,
    progress: 25,
    terakhir_dropping: "6 hari lalu",
  },
];

// Warna aksen per kategori BPBD
const kategoriMeta: Record<
  BpbdCategory,
  { label: string; accent: string; chip: string }
> = {
  kritis: {
    label: "Kritis",
    accent: "var(--color-genting)",
    chip: "text-[var(--color-genting)] border-[#CD9683]",
  },
  langka: {
    label: "Langka",
    accent: "var(--color-siaga)",
    chip: "text-[var(--color-siaga)] border-[#D3B577]",
  },
  terbatas: {
    label: "Terbatas",
    accent: "var(--color-lempung)",
    chip: "text-[var(--color-lempung)] border-[var(--color-kapur-garis)]",
  },
};

// Titik untuk peta Madura hero (rute dropping)
const heroPoints: HeroPoint[] = mockDesa.map((d) => ({
  id: d.id,
  nama: d.nama,
  kategori: d.kategori_bpbd,
  skor: d.skor,
}));

const navLinks = [
  { href: "#beranda", label: "Beranda" },
  { href: "#cara-kerja", label: "Cara Kerja" },
  { href: "#fitur", label: "Fitur" },
  { href: "#desa", label: "Desa Terdampak" },
  { href: "#kontak", label: "Kontak" },
];

// =============================================
// Ledger stat cell
// =============================================

function LedgerCell({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: string;
}) {
  return (
    <div className="flex-1 px-5 py-5 sm:px-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className={tone} />
        <span className="mono-label">{label}</span>
      </div>
      <div
        className="text-4xl sm:text-5xl font-semibold tnum leading-none text-[var(--color-tanah-pecah)]"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {value}
      </div>
    </div>
  );
}

// =============================================
// Desa card
// =============================================

function lastDropRelative(iso: string | null): string {
  if (!iso) return "Belum pernah";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  return `${days} hari lalu`;
}

const neutralMeta = {
  label: "Terdampak",
  accent: "var(--color-kapur-garis)",
  chip: "text-[var(--color-lempung)] border-[var(--color-kapur-garis)]",
};

function DesaCard({ desa }: { desa: PublicDirectoryVillage }) {
  const meta = desa.category ? kategoriMeta[desa.category] : neutralMeta;

  return (
    <article
      className="card card-lift rounded-xl overflow-hidden flex flex-col border-l-[3px] group"
      style={{ borderLeftColor: meta.accent }}
    >
      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Head */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              className="text-xl font-semibold text-[var(--color-tanah-pecah)] group-hover:text-[var(--color-air-jernih)] transition-colors truncate"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {desa.name}
            </h3>
            <div className="flex items-center gap-1 mono-label mt-1 normal-case tracking-normal">
              <MapPin size={11} className="shrink-0" />
              {desa.district}, {desa.regency}
            </div>
          </div>
          <span
            className={`shrink-0 mono-label !text-[0.625rem] px-2 py-1 rounded border bg-[var(--color-kertas-tua)] ${meta.chip}`}
          >
            {meta.label}
          </span>
        </div>

        {/* Air tersalur — progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="mono-label">Air tersalur</span>
            <span
              className="mono-label !text-xs tnum text-[var(--color-air-jernih)]"
              style={{ fontFamily: "var(--font-data)" }}
            >
              {desa.progress}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--color-kertas-tua)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--color-air-jernih)] transition-[width] duration-500"
              style={{ width: `${Math.max(desa.progress, 2)}%` }}
            />
          </div>
        </div>

        {/* Data ringkas */}
        <div className="grid grid-cols-2 rounded-lg border border-[var(--color-kapur-dalam)] overflow-hidden">
          <div className="px-4 py-2.5 border-r border-[var(--color-kapur-dalam)]">
            <div className="mono-label">Terdampak</div>
            <div className="text-base font-semibold tnum text-[var(--color-tanah-pecah)] mt-0.5" style={{ fontFamily: "var(--font-data)" }}>
              {desa.kk != null ? `${desa.kk.toLocaleString("id-ID")} KK` : "—"}
            </div>
          </div>
          <div className="px-4 py-2.5">
            <div className="mono-label">Durasi</div>
            <div className="text-base font-semibold tnum text-[var(--color-tanah-pecah)] mt-0.5" style={{ fontFamily: "var(--font-data)" }}>
              {desa.durasiHari != null ? `${desa.durasiHari} hari` : "—"}
            </div>
          </div>
        </div>

        {/* Skor prioritas */}
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="mono-label">Skor prioritas</span>
            {desa.skor != null && (
              <span className="mono-label !text-xs tnum text-[var(--color-genting)]" style={{ fontFamily: "var(--font-data)" }}>
                {desa.skor}/100
              </span>
            )}
          </div>
          {desa.skor != null ? (
            <PriorityBar skor={desa.skor} />
          ) : (
            <p className="mono-label normal-case tracking-normal !text-[0.625rem]">Belum dinilai</p>
          )}
        </div>
      </div>

      {/* Foot */}
      <div className="px-5 py-3 border-t border-[var(--color-kapur-dalam)] bg-[var(--color-kertas-tua)]/40 flex items-center justify-between">
        <StatusBadge status={desa.status} size="sm" />
        <div className="flex items-center gap-1 mono-label normal-case tracking-normal">
          <Clock size={11} className="shrink-0" />
          {lastDropRelative(desa.lastDroppingAt)}
        </div>
      </div>
    </article>
  );
}

// =============================================
// Main page
// =============================================

export default function HomePage() {
  const [filter, setFilter] = useState<ReportStatus | "semua">("semua");
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [reporterAuthed, setReporterAuthed] = useState(false);
  const [wa, setWa] = useState<{ number: string | null; link: string | null }>({ number: null, link: null });
  const [villages, setVillages] = useState<PublicDirectoryVillage[]>([]);
  const [loadingVillages, setLoadingVillages] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    // Cek sesi dari cookie — CTA menyesuaikan status login (petugas & pelapor)
    setAuthed(document.cookie.includes("rekah_demo_session=authenticated"));
    setReporterAuthed(document.cookie.includes("rekah_reporter_ui=1"));
    // Nomor WA bot dinamis (dari device Fonnte via dashboard)
    fetch("/api/public/wa")
      .then((r) => r.json())
      .then((d) => setWa({ number: d?.number ?? null, link: d?.link ?? null }))
      .catch(() => {});
    // Direktori desa terdampak — data nyata dari Supabase
    fetch("/api/public/villages")
      .then((r) => r.json())
      .then((d) => setVillages(Array.isArray(d?.villages) ? d.villages : []))
      .catch(() => {})
      .finally(() => setLoadingVillages(false));
    return () => clearTimeout(t);
  }, []);

  // Format nomor tampil: 6285111305036 → +62 851-1130-5036
  const waDisplay = wa.number
    ? `+62 ${(wa.number.startsWith("62") ? wa.number.slice(2) : wa.number).replace(/(\d{3,4})(\d{4})(\d+)/, "$1-$2-$3")}`
    : null;

  // CTA utama menyesuaikan siapa yang login: petugas > pelapor > belum login.
  const cta = authed
    ? { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard }
    : reporterAuthed
      ? { href: "/portal", label: "Portal Saya", Icon: FileText }
      : { href: "/login", label: "Masuk Petugas", Icon: LogIn };

  const filtered = villages.filter((d) => {
    const matchStatus = filter === "semua" || d.status === filter;
    const q = search.toLowerCase();
    const matchSearch =
      search === "" ||
      d.name.toLowerCase().includes(q) ||
      d.district.toLowerCase().includes(q) ||
      d.regency.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const stats = {
    total: villages.length,
    pending: villages.filter((d) => d.status === "pending").length,
    scheduled: villages.filter((d) => d.status === "scheduled").length,
    done: villages.filter((d) => d.status === "done").length,
  };

  // Pagination — 6 desa per halaman (paling terdampak dulu).
  const PAGE_SIZE = 6;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset ke halaman 1 saat filter/pencarian berubah.
  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  const filterOptions: { value: ReportStatus | "semua"; label: string }[] = [
    { value: "semua", label: "Semua" },
    { value: "pending", label: "Menunggu" },
    { value: "verified", label: "Verifikasi" },
    { value: "scheduled", label: "Jadwal" },
    { value: "done", label: "Selesai" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* ========================= HEADER ========================= */}
      <header className="sticky top-0 z-40 bg-[var(--color-kapur-karang)]/90 backdrop-blur-md border-b border-[var(--color-kapur-garis)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <a href="#beranda" className="flex items-center gap-2.5 shrink-0">
            <LogoMark size={30} />
            <span
              className="text-xl font-semibold text-[var(--color-tanah-pecah)] tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Rekah
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-3 py-2 text-sm font-medium text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)] rounded-md hover:bg-[var(--color-kertas-tua)] transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* CTA — sadar status login (petugas / pelapor / belum login) */}
          <div className="flex items-center gap-2">
            <a
              href={cta.href}
              className="group hidden sm:inline-flex items-center gap-2 bg-[var(--color-tanah-pecah)] !text-white text-sm font-medium pl-4 pr-3.5 py-2 rounded-md hover:bg-[var(--color-air-jernih)] hover:!text-white transition-colors shadow-sm"
            >
              <cta.Icon size={15} />
              {cta.label}
            </a>

            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-md text-[var(--color-tanah-pecah)] hover:bg-[var(--color-kertas-tua)] transition-colors"
              aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-[var(--color-kapur-garis)] bg-[var(--color-kapur-karang)] px-4 py-3 space-y-1 animate-fade-in">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)] hover:bg-[var(--color-kertas-tua)] rounded-md transition-colors"
              >
                {l.label}
              </a>
            ))}
            <a
              href={cta.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 mt-2 bg-[var(--color-tanah-pecah)] !text-white text-sm font-medium px-3 py-2.5 rounded-md"
            >
              <cta.Icon size={15} />
              {cta.label}
            </a>
          </div>
        )}
      </header>

      {/* ========================= HERO ========================= */}
      <section
        id="beranda"
        className="texture-crack relative overflow-hidden border-b border-[var(--color-kapur-garis)]"
      >
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-12 items-center">
            {/* Kolom kiri: copy */}
            <div>
              <div
                className={`inline-flex items-center gap-3 mb-7 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
              >
                <span className="h-3.5 w-[3px] rounded-full bg-[var(--color-genting)]" aria-hidden />
                <span className="mono-label !text-[var(--color-tanah-pecah)]">
                  Status darurat kekeringan
                </span>
                <span className="mono-label normal-case tracking-normal !text-[0.6875rem]">
                  Madura · Kemarau 2026
                </span>
              </div>

              <h1
                className={`text-[2.75rem] leading-[1.05] sm:text-6xl md:text-[4.25rem] font-semibold text-[var(--color-tanah-pecah)] transition-all duration-700 delay-75 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Dari laporan ke{" "}
                <span className="relative whitespace-nowrap text-[var(--color-air-jernih)]">
                  air
                  <svg
                    className="absolute -bottom-1 left-0 w-full"
                    height="6"
                    viewBox="0 0 100 6"
                    preserveAspectRatio="none"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M1 4.2 C 22 1.4, 48 1.2, 99 3.4"
                      stroke="var(--color-air-jernih)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>{" "}
                yang terverifikasi.
              </h1>

              <p
                className={`mt-6 text-lg text-[var(--color-lempung)] max-w-xl leading-relaxed transition-all duration-700 delay-150 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
              >
                Koordinasi bantuan air bersih kekeringan di Madura. Terstruktur,
                teraudit, dan bisa dipertanggungjawabkan sampai ke titik dropping.
              </p>

              <div
                className={`mt-8 flex flex-wrap items-center gap-3 transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
              >
                <a
                  href="#desa"
                  className="group inline-flex items-center gap-2 bg-[var(--color-laterit)] !text-white text-sm font-medium pl-4 pr-3.5 py-2.5 rounded-md hover:bg-[var(--color-laterit-tua)] hover:!text-white transition-colors shadow-sm"
                >
                  Lihat desa terdampak
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </a>
                <a
                  href="#cara-kerja"
                  className="inline-flex items-center gap-2 border border-[var(--color-kapur-garis)] bg-[var(--color-kertas)] text-[var(--color-tanah-pecah)] text-sm font-medium px-4 py-2.5 rounded-md hover:border-[var(--color-air-jernih)] transition-colors"
                >
                  Cara kerja
                </a>
              </div>
            </div>

            {/* Kolom kanan: peta rute dropping Madura — elemen tanda tangan */}
            <div
              className={`card rounded-xl overflow-hidden shadow-[var(--shadow-lift)] transition-all duration-700 delay-150 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            >
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--color-kapur-dalam)] bg-[var(--color-sumur)]">
                <Route size={13} className="text-[var(--color-garam)]" />
                <span className="mono-label !text-[var(--color-garam)]/80">Rute dropping · Bangkalan &amp; Sampang</span>
              </div>
              <div className="p-4 bg-[var(--color-kertas)]">
                <HeroLeafletMap points={heroPoints} className="w-full rounded-md overflow-hidden" />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-[var(--color-kapur-dalam)]">
                  {[
                    { c: "var(--color-genting)", t: "Kritis" },
                    { c: "var(--color-siaga)", t: "Langka" },
                    { c: "var(--color-lempung)", t: "Terbatas" },
                  ].map((l) => (
                    <span key={l.t} className="inline-flex items-center gap-1.5 mono-label normal-case tracking-normal !text-[0.625rem]">
                      <span className="w-2 h-2 rounded-full" style={{ background: l.c }} />
                      {l.t}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1.5 mono-label normal-case tracking-normal !text-[0.625rem] ml-auto">
                    <span className="w-3 border-t-2 border-dashed border-[var(--color-air-jernih)]" />
                    Jalur armada
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ledger stat bar — lebar penuh di bawah */}
          <div
            className={`mt-12 card rounded-xl overflow-hidden shadow-[var(--shadow-lift)] transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          >
            <div className="flex items-center px-5 py-2.5 border-b border-[var(--color-kapur-dalam)] bg-[var(--color-kertas-tua)]">
              <span className="mono-label">Status penanganan · real-time</span>
              <span className="ml-auto flex items-center gap-1.5 mono-label !text-[0.625rem] text-[var(--color-hijau-tuntas)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-hijau-tuntas)] animate-pulse-soft" />
                Live
              </span>
            </div>
            <div className="flex flex-wrap divide-x divide-[var(--color-kapur-dalam)]">
              <LedgerCell label="Total Desa" value={stats.total} icon={MapPin} tone="text-[var(--color-tanah-pecah)]" />
              <LedgerCell label="Menunggu" value={stats.pending} icon={Clock} tone="text-[var(--color-siaga)]" />
              <LedgerCell label="Dijadwalkan" value={stats.scheduled} icon={Truck} tone="text-[var(--color-air-jernih)]" />
              <LedgerCell label="Selesai" value={stats.done} icon={CheckCircle2} tone="text-[var(--color-hijau-tuntas)]" />
            </div>
          </div>
        </div>
      </section>

      {/* ========================= CARA KERJA ========================= */}
      <section
        id="cara-kerja"
        className="section-stone section-edge border-b border-[var(--color-kapur-garis)]"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="max-w-2xl">
            <div className="mono-label mb-2">Alur penanganan</div>
            <h2
              className="text-3xl sm:text-4xl font-semibold text-[var(--color-tanah-pecah)] leading-[1.15] pb-1"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Dari pesan WhatsApp warga sampai air tiba
            </h2>
            <p className="mt-3 text-[var(--color-lempung)] leading-relaxed">
              Lima langkah yang setiap tahapnya tercatat dan bisa ditelusuri ulang
              oleh petugas maupun publik.
            </p>
          </div>

          {/* Timeline rute: node dirangkai satu garis, offset selang-seling */}
          <div className="mt-12 relative">
            {/* Garis penghubung horizontal (desktop) */}
            <div className="hidden lg:block absolute left-0 right-0 top-[22px] h-px border-t-2 border-dashed border-[var(--color-kapur-garis)]" />
            <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-8">
              {[
                { kind: "wa", icon: MessageCircle, title: "Warga melapor", desc: "Kirim laporan lewat WhatsApp. Tanpa aplikasi, tanpa form rumit." },
                { kind: "plain", icon: Sparkles, title: "Ekstraksi AI", desc: "AI membaca pesan: desa, jumlah KK, dan durasi kekeringan." },
                { kind: "plain", icon: ListChecks, title: "Skoring prioritas", desc: "Sistem menghitung skor urgensi agar yang genting didahulukan." },
                { kind: "plain", icon: ShieldCheck, title: "Verifikasi petugas", desc: "Petugas BPBD memeriksa dan menyetujui laporan yang masuk." },
                { kind: "route", icon: Route, title: "Jadwal & dropping", desc: "Rute armada disusun, air dikirim, bukti NFC direkam di titik." },
              ].map((step, i) => {
                const Icon = step.icon;
                const marker =
                  step.kind === "wa" ? (
                    <ChatBubble><Icon size={18} /></ChatBubble>
                  ) : step.kind === "route" ? (
                    <RouteNode><Icon size={18} /></RouteNode>
                  ) : (
                    <div className="w-11 h-11 rounded-md border border-[var(--color-kapur-garis)] bg-[var(--color-kertas)] flex items-center justify-center text-[var(--color-tanah-pecah)]">
                      <Icon size={18} />
                    </div>
                  );
                return (
                  <li key={step.title} className="relative flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className="relative z-10 rounded-xl bg-[var(--color-kertas-tua)] ring-4 ring-[var(--color-kertas-tua)]">{marker}</div>
                      <span className="relative z-10 mono-label !text-[0.625rem] bg-[var(--color-kertas-tua)] px-1.5 py-0.5 rounded">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3
                      className="text-base font-semibold text-[var(--color-tanah-pecah)]"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm text-[var(--color-lempung)] leading-relaxed">
                      {step.desc}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* ========================= FITUR (band gelap — pecah monotoni) ========================= */}
      <section id="fitur" className="section-dark texture-crack texture-crack-dark relative overflow-hidden border-y border-[var(--color-sumur)]">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-2xl">
            <div className="mono-label mb-2 !text-[#79AEBC]">Fitur</div>
            <h2
              className="text-3xl sm:text-4xl font-semibold text-[var(--color-garam)]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Dibangun untuk keputusan yang cepat &amp; jujur
            </h2>
          </div>

          {/* Bento: satu tile besar (WA, kanal utama) + tile kecil variatif */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:auto-rows-[minmax(0,1fr)]">
            {/* Tile utama = demo percakapan WhatsApp (tema gelap WA, jelas ini kanal WA) */}
            <article
              className="card-lift rounded-lg p-6 flex flex-col sm:col-span-2 lg:row-span-2 shadow-[var(--shadow-lift)]"
              style={{ backgroundColor: "#1C333A", border: "1px solid rgba(121,174,188,0.28)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-semibold text-[var(--color-garam)]" style={{ fontFamily: "var(--font-heading)" }}>
                    Lapor via WhatsApp
                  </h3>
                  <p className="mt-2 text-sm text-[#C7D0CE] leading-relaxed max-w-sm">
                    Warga cukup kirim pesan biasa. AI membaca, menanyakan yang kurang, lalu meneruskan ke petugas.
                  </p>
                </div>
                <span className="shrink-0 mono-label !text-[0.625rem] !text-[#79AEBC] border border-[#3A5762] rounded-full px-2 py-1">
                  Demo
                </span>
              </div>

              {/* Jendela chat WhatsApp — animasi berjalan sendiri */}
              <div className="mt-5">
                <WhatsAppDemo />
              </div>
            </article>

            {[
              { kind: "plain", icon: Sparkles, title: "Ekstraksi otomatis", desc: "Pesan bebas diubah jadi data terstruktur: lokasi, jumlah KK, durasi." },
              { kind: "plain", icon: BarChart3, title: "Skoring prioritas", desc: "Urgensi dihitung transparan, bukan berdasar siapa yang paling ramai." },
              { kind: "plain", icon: ShieldCheck, title: "Verifikasi nomor", desc: "Nomor pelapor ditandai resmi atau belum, mengurangi laporan palsu." },
              { kind: "route", icon: Route, title: "Generator rute dropping", desc: "Rute armada air disusun efisien berdasarkan prioritas dan jarak." },
              { kind: "nfc", icon: Camera, title: "Bukti serah terima", desc: "Foto, geotag, dan tag NFC merekam bahwa air benar-benar sampai." },
            ].map((f) => {
              const Icon = f.icon;
              const marker =
                f.kind === "route" ? (
                  <RouteNode><Icon size={18} /></RouteNode>
                ) : f.kind === "nfc" ? (
                  <NfcTag><Icon size={16} /></NfcTag>
                ) : (
                  <div className="relative w-11 h-11 rounded-md border border-[var(--color-kapur-garis)] bg-[var(--color-kertas-tua)] flex items-center justify-center text-[var(--color-air-jernih)]">
                    <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-[var(--color-air-jernih)]" aria-hidden />
                    <Icon size={18} />
                  </div>
                );
              return (
                <article
                  key={f.title}
                  className="card-lift rounded-lg p-6 flex flex-col gap-3 shadow-[var(--shadow-lift)]"
                  style={{ backgroundColor: "#1C333A", border: "1px solid rgba(121,174,188,0.22)" }}
                >
                  {marker}
                  <h3
                    className="text-lg font-semibold text-[var(--color-garam)]"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-sm text-[#C7D0CE] leading-relaxed">
                    {f.desc}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================= FILTER & SEARCH ========================= */}
      <section id="desa" className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-16">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <div className="mono-label mb-1">Direktori</div>
            <h2
              className="text-2xl font-semibold text-[var(--color-tanah-pecah)]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Desa terdampak
            </h2>
          </div>
          <p className="mono-label hidden sm:block pb-1">
            {filtered.length} / {villages.length} desa
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-lempung)] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Cari nama desa atau kecamatan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-kertas)] border border-[var(--color-kapur-dalam)] rounded-md text-sm text-[var(--color-tanah-pecah)] placeholder:text-[var(--color-lempung)] focus:outline-none focus:border-[var(--color-air-jernih)] focus:ring-2 focus:ring-[var(--color-air-jernih)]/20 transition-all"
            />
          </div>

          {/* Segmented filter */}
          <div className="inline-flex items-center p-1 bg-[var(--color-kertas-tua)] border border-[var(--color-kapur-dalam)] rounded-md gap-1 overflow-x-auto">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  filter === opt.value
                    ? "bg-[var(--color-tanah-pecah)] text-[var(--color-kapur-karang)] shadow-[var(--shadow-sink)]"
                    : "text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ========================= DESA GRID ========================= */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 pt-6 pb-20">
        {loadingVillages ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card rounded-xl h-[340px] animate-pulse-soft" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card rounded-lg text-center py-20 text-[var(--color-lempung)]">
            <AlertTriangle size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              {villages.length === 0
                ? "Belum ada data desa. Jalankan seeder atau tambah desa dari dashboard."
                : "Tidak ada desa yang sesuai filter."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pageItems.map((desa, i) => (
                <div
                  key={desa.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <DesaCard desa={desa} />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Navigasi halaman desa">
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
          </>
        )}
      </main>

      {/* ========================= CTA ========================= */}
      <section className="border-y border-[var(--color-kapur-garis)] bg-[var(--color-tanah-pecah)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mono-label !text-white/60 mb-3">
              <Eye size={13} />
              Transparansi terbuka untuk publik
            </div>
            <h2
              className="text-3xl sm:text-4xl font-semibold text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Setiap tetes air, bisa ditelusuri.
            </h2>
            <p className="mt-3 text-white/70 leading-relaxed">
              Publik memantau prioritas dan progres. Petugas BPBD mengelola verifikasi
              dan penjadwalan lewat dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <a
              href="/peta"
              className="inline-flex items-center gap-2 bg-white text-[var(--color-tanah-pecah)] text-sm font-medium px-4 py-2.5 rounded-md hover:bg-[var(--color-air-muda)] transition-colors"
            >
              <MapPin size={15} />
              Peta transparansi
              <ArrowRight size={15} />
            </a>
            <a
              href={cta.href}
              className="inline-flex items-center gap-2 border border-white/30 text-white text-sm font-medium px-4 py-2.5 rounded-md hover:bg-white/10 transition-colors"
            >
              <cta.Icon size={15} />
              {authed ? "Buka dashboard" : reporterAuthed ? "Portal saya" : "Masuk sebagai petugas"}
            </a>
          </div>
        </div>
      </section>

      {/* ========================= FOOTER ========================= */}
      <footer id="kontak" className="section-stone section-edge">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-2.5">
                <LogoMark size={26} />
                <span
                  className="text-lg font-semibold text-[var(--color-tanah-pecah)]"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Rekah
                </span>
              </div>
              <p className="mt-3 text-sm text-[var(--color-lempung)] leading-relaxed max-w-xs">
                Sistem koordinasi bantuan air bersih kekeringan di Madura.
                Terstruktur, teraudit, dan bisa dipertanggungjawabkan sampai titik
                dropping.
              </p>
            </div>

            {/* Navigasi */}
            <div>
              <div className="mono-label mb-3">Navigasi</div>
              <ul className="space-y-2">
                {navLinks
                  .filter((l) => l.href !== "#beranda" && l.href !== "#kontak")
                  .map((l) => (
                    <li key={l.href}>
                      <a
                        href={l.href}
                        className="text-sm text-[var(--color-lempung)] hover:text-[var(--color-air-jernih)] transition-colors"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                <li>
                  <a
                    href="/portal"
                    className="text-sm text-[var(--color-lempung)] hover:text-[var(--color-air-jernih)] transition-colors"
                  >
                    Portal Pelapor (lacak laporan)
                  </a>
                </li>
                <li>
                  <a
                    href={authed ? "/dashboard" : "/login"}
                    className="text-sm text-[var(--color-lempung)] hover:text-[var(--color-air-jernih)] transition-colors"
                  >
                    {authed ? "Dashboard Petugas" : "Masuk Petugas"}
                  </a>
                </li>
              </ul>
            </div>

            {/* Kontak */}
            <div>
              <div className="mono-label mb-3">Kontak</div>
              <ul className="space-y-2.5">
                <li className="flex items-center gap-2 text-sm text-[var(--color-lempung)]">
                  <MessageCircle size={14} className="shrink-0 text-[var(--color-air-jernih)]" />
                  {wa.link ? (
                    <a href={wa.link} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-air-jernih)] transition-colors">
                      Lapor via WhatsApp: {waDisplay}
                    </a>
                  ) : (
                    <span>WhatsApp posko (segera)</span>
                  )}
                </li>
                <li className="flex items-center gap-2 text-sm text-[var(--color-lempung)]">
                  <Mail size={14} className="shrink-0 text-[var(--color-air-jernih)]" />
                  halo@rekah.id
                </li>
                <li className="flex items-center gap-2 text-sm text-[var(--color-lempung)]">
                  <Phone size={14} className="shrink-0 text-[var(--color-air-jernih)]" />
                  Posko BPBD Sampang & Bangkalan
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-6 border-t border-[var(--color-kapur-garis)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo_tcc.png"
                alt="Logo TCC Vibe Code 2026"
                className="h-10 w-auto shrink-0"
              />
              <p className="text-xs text-[var(--color-lempung)]">
                © 2026 Rekah. Prototipe kompetisi<br className="hidden sm:block" /> TCC Vibe Code 2026.
              </p>
            </div>
            <p className="mono-label normal-case tracking-normal">
              Bukan aplikasi resmi BPBD Sampang / Bangkalan.
            </p>
          </div>
        </div>
      </footer>

      {/* Tombol WhatsApp mengambang — nomor bot dinamis */}
      {wa.link && (
        <a
          href={wa.link}
          target="_blank"
          rel="noopener noreferrer"
          className="group fixed bottom-5 right-5 z-50 flex items-center justify-center"
          aria-label="Lapor via WhatsApp"
        >
          <span className="pointer-events-none absolute right-16 whitespace-nowrap bg-[var(--color-tanah-pecah)] text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-[var(--shadow-lift)] opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
            Lapor via WhatsApp
          </span>
          <span className="w-14 h-14 rounded-full bg-[var(--color-hijau-tuntas)] text-white flex items-center justify-center shadow-[var(--shadow-float)] transition-transform duration-200 group-hover:scale-105">
            <MessageCircle size={24} />
          </span>
        </a>
      )}
    </div>
  );
}

// =============================================
// Brand mark
// =============================================



// Wadah ikon berbeda per sumber data — bukan rounded-square seragam.

// Gelembung chat WhatsApp (warga melapor)
function ChatBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-11 h-11 rounded-xl rounded-bl-sm bg-[var(--color-hijau-tuntas)] flex items-center justify-center text-white shadow-sm">
      {children}
      <span className="absolute -bottom-1 left-1.5 w-2.5 h-2.5 bg-[var(--color-hijau-tuntas)] [clip-path:polygon(0_0,100%_0,0_100%)]" />
    </div>
  );
}

// Tag NFC dengan gelombang — bukti serah terima
function NfcTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-11 h-11 rounded-md border-2 border-[var(--color-siaga)] bg-[var(--color-kertas-tua)] flex items-center justify-center text-[var(--color-siaga)] overflow-hidden">
      <svg viewBox="0 0 44 44" className="absolute inset-0" aria-hidden="true">
        <path d="M30 12 A 16 16 0 0 1 30 32" fill="none" stroke="var(--color-siaga)" strokeWidth="1.5" opacity="0.35" />
        <path d="M34 8 A 22 22 0 0 1 34 36" fill="none" stroke="var(--color-siaga)" strokeWidth="1.5" opacity="0.2" />
      </svg>
      <span className="relative">{children}</span>
    </div>
  );
}

// Node rute armada — titik pada garis
function RouteNode({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-11 h-11 rounded-full border-2 border-dashed border-[var(--color-air-jernih)] bg-[var(--color-air-muda)] flex items-center justify-center text-[var(--color-air-jernih)]">
      {children}
    </div>
  );
}
