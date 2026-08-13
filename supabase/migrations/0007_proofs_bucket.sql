-- =============================================
-- Rekah — Storage bucket untuk bukti serah terima (foto dropping)
-- Public read; upload lewat service role (admin client) bypass RLS. Idempotent.
-- =============================================

insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', true)
on conflict (id) do nothing;
