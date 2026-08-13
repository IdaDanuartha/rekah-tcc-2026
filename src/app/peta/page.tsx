import Link from "next/link";
import { ArrowLeft, Droplets, TriangleAlert, Truck, CheckCircle2, Inbox } from "lucide-react";
import PublicMapExplorer from "@/components/public/PublicMapExplorer";
import { getPublicMap } from "@/lib/public-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Peta Transparansi Air Bersih — Rekah",
  description: "Pantauan publik status kekeringan & penyaluran air bersih di Madura.",
};

export default async function PetaPublikPage() {
  const { villages, stats, generatedAt } = await getPublicMap();

  const kpi = [
    { label: "Desa terpantau", value: stats.totalDesa, Icon: Droplets, color: "var(--color-air-jernih)" },
    { label: "Kategori kritis", value: stats.krisis, Icon: TriangleAlert, color: "var(--color-genting)" },
    { label: "Sudah dropping", value: stats.sudahDropping, Icon: Truck, color: "var(--color-hijau-tuntas)" },
    { label: "Dikonfirmasi warga", value: stats.dikonfirmasiWarga, Icon: CheckCircle2, color: "var(--color-hijau-tuntas)" },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-kapur-karang)]">
      {/* Header publik */}
      <header className="sticky top-0 z-40 bg-[var(--color-kapur-karang)]/90 backdrop-blur-md border-b border-[var(--color-kapur-garis)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 mono-label hover:text-[var(--color-tanah-pecah)] transition-colors">
            <ArrowLeft size={14} /> Beranda
          </Link>
          <Link
            href="/portal"
            className="text-sm font-medium !text-white bg-[var(--color-air-jernih)] px-3 py-2 rounded-md hover:bg-[var(--color-air-tua)] transition-colors"
          >
            Lapor kekeringan
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <div className="mono-label mb-1">Transparansi publik</div>
          <h1
            className="text-3xl sm:text-4xl font-semibold text-[var(--color-tanah-pecah)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Peta air bersih Madura
          </h1>
          <p className="text-sm text-[var(--color-lempung)] mt-1.5 max-w-2xl">
            Status kekeringan tiap desa dan bukti penyaluran air — terbuka untuk publik. Tiap dropping
            dikonfirmasi langsung oleh warga penerima.
          </p>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpi.map((k) => (
            <div key={k.label} className="card rounded-lg p-4">
              <k.Icon size={16} style={{ color: k.color }} />
              <div
                className="text-3xl font-semibold tnum text-[var(--color-tanah-pecah)] mt-2 leading-none"
                style={{ fontFamily: "var(--font-data)" }}
              >
                {k.value}
              </div>
              <div className="mono-label mt-1">{k.label}</div>
            </div>
          ))}
        </div>

        {villages.length === 0 ? (
          <div className="card rounded-lg text-center py-16 text-[var(--color-lempung)]">
            <Inbox size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Belum ada data desa untuk ditampilkan.</p>
          </div>
        ) : (
          <PublicMapExplorer villages={villages} />
        )}

        <p className="mono-label normal-case tracking-normal">
          Diperbarui {new Date(generatedAt).toLocaleString("id-ID")} · data tanpa informasi pribadi pelapor
        </p>
      </main>
    </div>
  );
}
