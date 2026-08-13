import ScheduleBoard from "@/components/dashboard/ScheduleBoard";
import { listSchedules, listVillages } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const [schedules, villages] = await Promise.all([listSchedules(), listVillages()]);
  const villageOptions = villages.map((v) => ({ id: v.id, name: v.name, district: v.district }));

  return <ScheduleBoard schedules={schedules} villages={villageOptions} />;
}
