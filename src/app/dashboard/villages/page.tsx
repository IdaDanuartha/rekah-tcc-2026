import { listVillages } from "@/lib/dashboard-data";
import VillagesManager from "@/components/dashboard/VillagesManager";

export const dynamic = "force-dynamic";

export default async function VillagesPage() {
  const villages = await listVillages();

  const stats = {
    total: villages.length,
    kritis: villages.filter((d) => d.bpbd_category === "kritis").length,
    belumDropping: villages.filter((d) => !d.last_dropping_at).length,
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <div className="mono-label mb-1.5">Direktori desa terdampak</div>
        <h1 className="text-3xl font-semibold text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
          Data Desa
        </h1>
      </div>

      {/* Stats ledger */}
      <div className="card rounded-lg flex divide-x divide-[var(--color-kapur-dalam)] overflow-hidden">
        <div className="flex-1 px-5 py-4 border-l-[3px] border-l-[var(--color-tanah-pecah)]">
          <div className="mono-label">Total Desa</div>
          <div className="text-3xl font-semibold tnum text-[var(--color-tanah-pecah)] mt-1" style={{ fontFamily: "var(--font-heading)" }}>
            {stats.total}
          </div>
        </div>
        <div className="flex-1 px-5 py-4 border-l-[3px] border-l-[var(--color-genting)]">
          <div className="mono-label !text-[var(--color-genting)]">Kritis</div>
          <div className="text-3xl font-semibold tnum text-[var(--color-genting)] mt-1" style={{ fontFamily: "var(--font-heading)" }}>
            {stats.kritis}
          </div>
        </div>
        <div className="flex-1 px-5 py-4 border-l-[3px] border-l-[var(--color-siaga)]">
          <div className="mono-label !text-[var(--color-siaga)]">Belum Dropping</div>
          <div className="text-3xl font-semibold tnum text-[var(--color-siaga)] mt-1" style={{ fontFamily: "var(--font-heading)" }}>
            {stats.belumDropping}
          </div>
        </div>
      </div>

      {/* Grid + CRUD (client) */}
      <VillagesManager villages={villages} />
    </div>
  );
}
