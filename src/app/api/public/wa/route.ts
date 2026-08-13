import { NextRequest, NextResponse } from "next/server";
import { getBotNumber, getDeviceInfo } from "@/lib/fonnte-device";

// Nomor WA bot (dinamis, dari device Fonnte) untuk landing/publik. Tanpa token.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("debug") === "1" && process.env.NODE_ENV !== "production") {
    return NextResponse.json(await getDeviceInfo());
  }
  const number = await getBotNumber();
  return NextResponse.json({
    number,
    link: number ? `https://wa.me/${number}` : null,
  });
}
