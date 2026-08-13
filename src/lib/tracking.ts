import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { POSKO, latLngByName } from "@/lib/madura-coords";
import type { DropStatus } from "@/lib/types";

// Kecepatan rata-rata armada tangki (km/jam) untuk estimasi ETA.
const AVG_SPEED_KMH = 30;

export type LatLng = [number, number];

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface TrackingData {
  scheduleId: string;
  status: DropStatus;
  fleet: string;
  villageName: string;
  origin: LatLng;
  destination: LatLng | null;
  current: { lat: number; lng: number; updatedAt: string } | null;
  remainingKm: number | null;
  etaMinutes: number | null;
  // true bila update lokasi terakhir > 90 detik lalu (sinyal sopir hilang)
  stale: boolean;
}

export async function getTrackingData(scheduleId: string): Promise<TrackingData | null> {
  const supabase = createAdminClient();

  const { data: sched } = await supabase
    .from("drop_schedules")
    .select("id, fleet, status, villages(name, lat, lng)")
    .eq("id", scheduleId)
    .maybeSingle();
  if (!sched) return null;

  const s = sched as unknown as {
    id: string;
    fleet: string;
    status: DropStatus;
    villages: { name: string; lat: number | null; lng: number | null } | null;
  };

  const villageName = s.villages?.name ?? "—";
  const destination: LatLng | null =
    s.villages?.lat != null && s.villages?.lng != null
      ? [s.villages.lat, s.villages.lng]
      : latLngByName(villageName);

  const { data: track } = await supabase
    .from("delivery_tracking")
    .select("lat, lng, updated_at")
    .eq("schedule_id", scheduleId)
    .maybeSingle();

  const current = track
    ? { lat: (track as { lat: number }).lat, lng: (track as { lng: number }).lng, updatedAt: (track as { updated_at: string }).updated_at }
    : null;

  let remainingKm: number | null = null;
  let etaMinutes: number | null = null;
  if (current && destination) {
    remainingKm = haversineKm([current.lat, current.lng], destination);
    etaMinutes = Math.max(1, Math.round((remainingKm / AVG_SPEED_KMH) * 60));
  }

  const stale = current ? Date.now() - new Date(current.updatedAt).getTime() > 90_000 : false;

  return {
    scheduleId: s.id,
    status: s.status,
    fleet: s.fleet,
    villageName,
    origin: POSKO,
    destination,
    current,
    remainingKm,
    etaMinutes,
    stale,
  };
}
