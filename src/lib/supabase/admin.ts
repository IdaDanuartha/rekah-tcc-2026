import { createClient } from "@supabase/supabase-js";

// =============================================
// Supabase admin client (SERVICE ROLE)
// HANYA dipakai di server (route handler / server component).
// Bypass RLS — jangan pernah diimpor ke kode client.
// =============================================

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase belum dikonfigurasi: butuh NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
