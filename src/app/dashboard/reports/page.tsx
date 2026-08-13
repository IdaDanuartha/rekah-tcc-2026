import ReportsBrowser from "@/components/dashboard/ReportsBrowser";
import { listReports } from "@/lib/dashboard-data";
import type { ReportStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const validFilters = new Set(["semua", "eskalasi", "pending", "verified", "scheduled", "done"]);

export default async function ReportsPage({
  searchParams,
}: PageProps<"/dashboard/reports">) {
  const sp = await searchParams;
  const raw = typeof sp.filter === "string" ? sp.filter : "semua";
  const initialFilter = (validFilters.has(raw) ? raw : "semua") as
    | ReportStatus
    | "semua"
    | "eskalasi";
  const villageId = typeof sp.village === "string" ? sp.village : null;
  const villageName = typeof sp.name === "string" ? sp.name : null;

  const reports = await listReports();

  return (
    <ReportsBrowser
      reports={reports}
      initialFilter={initialFilter}
      initialVillageId={villageId}
      initialVillageName={villageName}
    />
  );
}
