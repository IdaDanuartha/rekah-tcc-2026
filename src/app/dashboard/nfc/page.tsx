import { listVillages } from "@/lib/dashboard-data";
import { listNfcTags } from "@/lib/nfc-actions";
import NfcManager from "@/components/dashboard/NfcManager";

export const dynamic = "force-dynamic";

export default async function NfcPage() {
  const [villages, tags] = await Promise.all([listVillages(), listNfcTags()]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="mono-label mb-1.5">Registry stiker NFC titik dropping</div>
        <h1 className="text-3xl font-semibold text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
          Stiker NFC
        </h1>
        <p className="text-sm text-[var(--color-lempung)] mt-1.5 max-w-2xl">
          Daftarkan tiap stiker fisik ke desa/titik-nya. Saat sopir tap stiker di lapangan, sistem
          memastikan tag benar milik titik tujuan sebelum dropping ditandai selesai.
        </p>
      </div>

      <NfcManager
        villages={villages.map((v) => ({ id: v.id, name: v.name, district: v.district }))}
        tags={tags}
      />
    </div>
  );
}
