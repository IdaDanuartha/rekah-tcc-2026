import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  REPORTER_COOKIE,
  verifySessionToken,
} from "@/lib/reporter-session";

// =============================================
// Helper server component — sesi pelapor
// =============================================

export async function getReporterPhone(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(REPORTER_COOKIE)?.value;
  const session = await verifySessionToken(token);
  return session?.nomor ?? null;
}

// Wajib login — redirect ke halaman masuk jika belum
export async function requireReporterPhone(): Promise<string> {
  const nomor = await getReporterPhone();
  if (!nomor) redirect("/portal/login");
  return nomor;
}
