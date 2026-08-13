import { NextResponse } from "next/server";
import { getPublicDirectory } from "@/lib/public-data";

// Direktori desa terdampak untuk landing (publik, tanpa token).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const villages = await getPublicDirectory();
    return NextResponse.json({ ok: true, villages });
  } catch {
    return NextResponse.json({ ok: false, villages: [] }, { status: 200 });
  }
}
