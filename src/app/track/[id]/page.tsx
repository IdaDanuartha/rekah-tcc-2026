import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import DriverTracker from "@/components/tracking/DriverTracker";
import { getTrackingData } from "@/lib/tracking";

export const dynamic = "force-dynamic";

export default async function DriverTrackPage({ params }: PageProps<"/track/[id]">) {
  const { id } = await params;
  const data = await getTrackingData(id);
  if (!data) notFound();

  if (data.status === "done") {
    return (
      <div className="min-h-screen bg-[var(--color-kapur-karang)] flex items-center justify-center px-4">
        <div className="card rounded-xl px-6 py-8 max-w-sm text-center">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-[var(--color-hijau-tuntas)]" />
          <h1 className="text-xl font-semibold text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
            Dropping selesai
          </h1>
          <p className="text-sm text-[var(--color-lempung)] mt-2">
            Pengiriman ke {data.villageName} sudah ditandai selesai. Terima kasih.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DriverTracker
      scheduleId={data.scheduleId}
      villageName={data.villageName}
      fleet={data.fleet}
      origin={data.origin}
      destination={data.destination}
    />
  );
}
