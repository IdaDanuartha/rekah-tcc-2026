-- =============================================
-- Rekah — Konfirmasi penerimaan air oleh warga (loop akuntabilitas)
-- Setelah dropping 'done', pelapor mengonfirmasi air benar-benar diterima.
-- received_ok: true = diterima, false = belum/tidak; null = belum dikonfirmasi.
-- Idempotent.
-- =============================================

alter table reports
  add column if not exists received_ok boolean,
  add column if not exists received_confirmed_at timestamptz;
