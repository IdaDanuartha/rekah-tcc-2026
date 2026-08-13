import { NextResponse } from "next/server";
import { REPORTER_COOKIE, REPORTER_UI_FLAG } from "@/lib/reporter-session";

// POST /api/reporter/logout — hapus cookie sesi pelapor
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(REPORTER_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(REPORTER_UI_FLAG, "", { path: "/", maxAge: 0 });
  return res;
}
