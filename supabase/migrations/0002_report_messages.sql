-- =============================================
-- Rekah — Chat riwayat pelapor (report_messages)
-- Menyimpan percakapan pelapor <-> asisten per laporan.
-- Idempotent: aman di-run ulang.
-- =============================================

do $$ begin
  create type chat_role as enum ('user', 'assistant');
exception when duplicate_object then null; end $$;

create table if not exists report_messages (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  phone text not null,
  role chat_role not null,
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists report_messages_report_idx on report_messages (report_id, created_at);
create index if not exists report_messages_phone_idx on report_messages (phone, created_at desc);

-- RLS: akses lewat SERVICE ROLE saja (sama seperti tabel lain).
alter table report_messages enable row level security;
