-- =============================================
-- Rekah — Volume air per dropping (liter)
-- Dipakai agregat Laporan Harian (volume nyata, bukan estimasi). Idempotent.
-- =============================================

alter table drop_schedules
  add column if not exists volume_liters integer;
