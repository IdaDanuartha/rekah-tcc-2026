-- =============================================
-- Rekah — Penanda pertanyaan harga air sudah dijawab/dilewati
-- Supaya jawaban harga (setelah data inti lengkap) tetap ter-thread
-- ke laporan yang sama, bukan dianggap pesan baru. Idempotent.
-- =============================================

alter table reports
  add column if not exists price_resolved boolean not null default false;
