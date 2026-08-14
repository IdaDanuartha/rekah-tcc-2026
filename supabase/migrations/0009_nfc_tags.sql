-- =============================================
-- Rekah — Registry stiker NFC titik dropping
-- Tiap stiker fisik didaftarkan sekali: UID (serial number NFC) → desa + label titik.
-- Saat sopir tap di lapangan, UID divalidasi cocok dgn desa tujuan jadwal.
-- Idempotent: aman di-run ulang.
-- =============================================

create table if not exists nfc_tags (
  uid text primary key,                        -- serial number tag (atau kode payload), unik
  village_id uuid not null references villages(id) on delete cascade,
  label text not null default '',              -- cth: "Balai Desa", "Masjid RW02"
  registered_at timestamptz not null default now()
);
create index if not exists nfc_tags_village_idx on nfc_tags (village_id);

-- RLS: akses lewat SERVICE ROLE saja (deny-all utk anon), sama seperti tabel lain.
alter table nfc_tags enable row level security;

-- ---------- Seed demo ----------
-- Satu tag demo utk Pakaan Barat (desa jadwal in_transit di seed 0001).
-- Juri tanpa stiker fisik bisa ketik manual 'DEMO-TAG-PAKAAN' → lolos validasi.
insert into nfc_tags (uid, village_id, label)
values ('DEMO-TAG-PAKAAN', '11111111-1111-1111-1111-111111111111', 'Balai Desa Pakaan Barat')
on conflict (uid) do nothing;
