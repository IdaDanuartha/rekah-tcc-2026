import DailyReportClient from "@/components/dashboard/DailyReportClient";
import { getDailyReport } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function LaporanHarianPage() {
  const data = await getDailyReport();
  return <DailyReportClient data={data} />;
}
