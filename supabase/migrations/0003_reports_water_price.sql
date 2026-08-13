-- =============================================
-- Rekah — Harga air mandiri per tangki di laporan
-- Sinyal urgensi opsional (dipakai skoring). Idempotent.
-- =============================================

alter table reports
  add column if not exists water_price integer;
