import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTrackingData } from "@/lib/tracking";

export const dynamic = "force-dynamic";

// Sopir mengirim posisi GPS. id jadwal berfungsi sbg token (uuid tak tertebak).
export async function POST(req: NextRequest, ctx: RouteContext<"/api/track/[id]">) {
  const { id } = await ctx.params;
  let body: { lat?: number; lng?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body bukan JSON." }, { status: 400 });
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ ok: false, error: "Koordinat tidak valid." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Pastikan jadwal ada (hindari upsert liar).
  const { data: sched } = await supabase.from("drop_schedules").select("id").eq("id", id).maybeSingle();
  if (!sched) {
    return NextResponse.json({ ok: false, error: "Jadwal tidak ditemukan." }, { status: 404 });
  }

  const { error } = await supabase
    .from("delivery_tracking")
    .upsert(
      { schedule_id: id, lat, lng, updated_at: new Date().toISOString() },
      { onConflict: "schedule_id" },
    );
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Polling posisi terkini + ETA (dipakai portal & dashboard).
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/track/[id]">) {
  const { id } = await ctx.params;
  const data = await getTrackingData(id);
  if (!data) {
    return NextResponse.json({ ok: false, error: "Jadwal tidak ditemukan." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data });
}
