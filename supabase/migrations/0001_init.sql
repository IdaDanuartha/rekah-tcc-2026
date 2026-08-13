-- =============================================
-- Rekah — Initial schema (English)
-- Run in Supabase Studio > SQL Editor (paste all, Run).
-- Idempotent: safe to re-run.
-- Mirrors: src/lib/types.ts
-- Domain terms kept: "BPBD" (agency), "dropping" (water delivery).
-- =============================================

-- ---------- Enums ----------
do $$ begin
  create type bpbd_category as enum ('kritis', 'langka', 'terbatas');
exception when duplicate_object then null; end $$;

do $$ begin
  create type phone_verification_status as enum ('verified', 'unverified');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('pending', 'verified', 'scheduled', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type drop_status as enum ('scheduled', 'in_transit', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_source as enum ('wa', 'web');
exception when duplicate_object then null; end $$;

-- ---------- Tables ----------
create table if not exists villages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district text not null,
  regency text not null,
  bpbd_category bpbd_category,
  lat double precision,
  lng double precision,
  registered_phone text,
  last_dropping_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  source report_source not null default 'wa',
  phone text,
  phone_verification_status phone_verification_status,
  raw_text text not null,
  village_id uuid references villages(id) on delete set null,
  estimated_households integer,
  duration_days integer,
  ai_confidence double precision,
  status report_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists reports_phone_idx on reports (phone);
create index if not exists reports_village_id_idx on reports (village_id);
create index if not exists reports_created_at_idx on reports (created_at desc);

create table if not exists priority_scores (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  score integer not null,
  reason text not null default '',
  computed_at timestamptz not null default now()
);
create index if not exists priority_scores_report_idx on priority_scores (report_id);

create table if not exists drop_schedules (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references villages(id) on delete cascade,
  fleet text not null,
  date date not null,
  status drop_status not null default 'scheduled',
  created_at timestamptz not null default now()
);
create index if not exists drop_schedules_village_idx on drop_schedules (village_id);

create table if not exists delivery_proofs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references drop_schedules(id) on delete cascade,
  photo_url text,
  geotag_lat double precision,
  geotag_lng double precision,
  nfc_tag_id text,
  officer_id text,
  verified_at timestamptz not null default now()
);
create index if not exists delivery_proofs_schedule_idx on delivery_proofs (schedule_id);

-- Reporter OTP login (option 2 — OTP via WhatsApp)
create table if not exists reporter_otps (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,      -- SHA-256 hex of the code, not plaintext
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists reporter_otps_phone_idx on reporter_otps (phone, created_at desc);

-- ---------- RLS ----------
-- Enable RLS everywhere. Server access uses the SERVICE ROLE (bypasses RLS).
-- No public policies = closed by default (anon key cannot read/write).
alter table villages         enable row level security;
alter table reports          enable row level security;
alter table priority_scores  enable row level security;
alter table drop_schedules   enable row level security;
alter table delivery_proofs  enable row level security;
alter table reporter_otps    enable row level security;

-- ---------- Seed demo ----------
-- Demo phone for the reporter portal: +6281234567890
insert into villages (id, name, district, regency, bpbd_category, registered_phone, last_dropping_at)
values
  ('11111111-1111-1111-1111-111111111111', 'Pakaan Barat', 'Blega', 'Bangkalan', 'kritis', '+6281234567890', null),
  ('22222222-2222-2222-2222-222222222222', 'Banyuanyar', 'Robatal', 'Sampang', 'kritis', null, now() - interval '3 days'),
  ('33333333-3333-3333-3333-333333333333', 'Labuhan', 'Sreseh', 'Sampang', 'langka', null, now() - interval '8 days')
on conflict (id) do nothing;

insert into reports (id, source, phone, phone_verification_status, raw_text, village_id, estimated_households, duration_days, ai_confidence, status, created_at)
values
  ('aaaaaaa1-0000-0000-0000-000000000001', 'wa', '+6281234567890', 'verified',
   'Air di desa kami sudah habis 3 minggu, sekitar 480 KK terdampak, mohon bantuan segera.',
   '11111111-1111-1111-1111-111111111111', 480, 22, 0.94, 'scheduled', now() - interval '2 days'),
  ('aaaaaaa1-0000-0000-0000-000000000002', 'wa', '+6281234567890', 'verified',
   'Sumur kering lagi pak, warga mulai kesulitan air bersih untuk masak.',
   '11111111-1111-1111-1111-111111111111', 120, 6, 0.81, 'pending', now() - interval '6 hours')
on conflict (id) do nothing;

insert into priority_scores (report_id, score, reason)
values
  ('aaaaaaa1-0000-0000-0000-000000000001', 91,
   'Kategori BPBD kritis, durasi 22 hari, 480 KK terdampak, belum pernah dropping.'),
  ('aaaaaaa1-0000-0000-0000-000000000002', 58,
   'Durasi masih 6 hari, jumlah KK menengah, kategori desa kritis menambah bobot.')
on conflict do nothing;

insert into drop_schedules (id, village_id, fleet, date, status)
values
  ('bbbbbbb1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Tangki-01', current_date, 'in_transit')
on conflict (id) do nothing;

insert into delivery_proofs (schedule_id, photo_url, geotag_lat, geotag_lng, officer_id)
values
  ('bbbbbbb1-0000-0000-0000-000000000001', null, -6.8123, 113.0567, 'petugas-demo')
on conflict do nothing;
