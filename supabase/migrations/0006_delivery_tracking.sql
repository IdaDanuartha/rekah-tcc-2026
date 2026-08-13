-- =============================================
-- Rekah — Pelacakan lokasi armada realtime (GPS HP sopir)
-- Satu baris per jadwal (posisi terkini di-upsert). Idempotent.
-- =============================================

create table if not exists delivery_tracking (
  schedule_id uuid primary key references drop_schedules(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: akses lewat SERVICE ROLE saja (sama seperti tabel lain — deny-all utk anon).
alter table delivery_tracking enable row level security;
