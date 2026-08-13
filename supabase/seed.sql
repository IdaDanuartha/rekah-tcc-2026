-- =============================================
-- Rekah — Seeder desa Madura (representatif ~50 desa, 4 kabupaten)
-- Idempotent: hanya insert bila (nama + kecamatan) belum ada.
-- Koordinat approx per kecamatan; kategori BPBD bervariasi.
-- Jalankan di Supabase Studio SQL / `supabase db reset` menyertakan file ini.
-- =============================================

insert into villages (name, district, regency, bpbd_category, lat, lng)
select v.name, v.district, v.regency, v.bpbd_category::bpbd_category, v.lat, v.lng
from (values
  -- ---------- Kabupaten Bangkalan ----------
  ('Bancaran',        'Bangkalan',      'Bangkalan', 'terbatas', -7.03, 112.74),
  ('Buluh',           'Socah',          'Bangkalan', 'langka',   -7.05, 112.78),
  ('Tajungan',        'Kamal',          'Bangkalan', 'terbatas', -7.15, 112.72),
  ('Ombul',           'Arosbaya',       'Bangkalan', 'langka',   -6.93, 112.96),
  ('Kombangan',       'Geger',          'Bangkalan', 'kritis',   -6.98, 112.90),
  ('Bulung',          'Klampis',        'Bangkalan', 'langka',   -6.88, 113.02),
  ('Klabang',         'Sepulu',         'Bangkalan', 'kritis',   -6.85, 113.08),
  ('Paseseh',         'Tanjung Bumi',   'Bangkalan', 'langka',   -6.87, 113.13),
  ('Katol Barat',     'Kokop',          'Bangkalan', 'kritis',   -6.98, 113.10),
  ('Tragah',          'Tragah',         'Bangkalan', 'terbatas', -7.05, 112.85),
  ('Blega',           'Blega',          'Bangkalan', 'langka',   -7.08, 113.00),
  ('Patereman',       'Modung',         'Bangkalan', 'terbatas', -7.15, 113.02),
  ('Konang',          'Konang',         'Bangkalan', 'kritis',   -7.10, 112.92),

  -- ---------- Kabupaten Sampang ----------
  ('Gunung Sekar',    'Sampang',        'Sampang',   'terbatas', -7.19, 113.25),
  ('Dharma Camplong', 'Camplong',       'Sampang',   'langka',   -7.17, 113.35),
  ('Torjun',          'Torjun',         'Sampang',   'terbatas', -7.15, 113.18),
  ('Labuhan',         'Sreseh',         'Sampang',   'langka',   -7.18, 113.15),
  ('Jrengik',         'Jrengik',        'Sampang',   'terbatas', -7.16, 113.22),
  ('Tambelangan',     'Tambelangan',    'Sampang',   'langka',   -7.10, 113.20),
  ('Banyuates',       'Banyuates',      'Sampang',   'kritis',   -6.92, 113.20),
  ('Banyuanyar',      'Robatal',        'Sampang',   'kritis',   -7.05, 113.28),
  ('Karang Penang Oloh','Karang Penang','Sampang',   'kritis',   -7.00, 113.33),
  ('Ketapang Daya',   'Ketapang',       'Sampang',   'langka',   -6.90, 113.30),
  ('Sokobanah Daya',  'Sokobanah',      'Sampang',   'kritis',   -6.90, 113.45),
  ('Kedungdung',      'Kedungdung',     'Sampang',   'langka',   -7.08, 113.28),
  ('Omben',           'Omben',          'Sampang',   'terbatas', -7.10, 113.38),

  -- ---------- Kabupaten Pamekasan ----------
  ('Bugih',           'Pamekasan',      'Pamekasan', 'terbatas', -7.16, 113.48),
  ('Tlanakan',        'Tlanakan',       'Pamekasan', 'langka',   -7.18, 113.42),
  ('Pademawu Timur',  'Pademawu',       'Pamekasan', 'terbatas', -7.17, 113.55),
  ('Galis',           'Galis',          'Pamekasan', 'langka',   -7.15, 113.58),
  ('Larangan Dalam',  'Larangan',       'Pamekasan', 'langka',   -7.12, 113.52),
  ('Pegantenan',      'Pegantenan',     'Pamekasan', 'kritis',   -7.05, 113.50),
  ('Palengaan Daya',  'Palengaan',      'Pamekasan', 'kritis',   -7.05, 113.45),
  ('Proppo',          'Proppo',         'Pamekasan', 'terbatas', -7.12, 113.42),
  ('Pakong',          'Pakong',         'Pamekasan', 'langka',   -7.00, 113.52),
  ('Waru Barat',      'Waru',           'Pamekasan', 'kritis',   -6.95, 113.48),
  ('Batu Bintang',    'Batumarmar',     'Pamekasan', 'kritis',   -6.92, 113.55),
  ('Kadur',           'Kadur',          'Pamekasan', 'langka',   -7.02, 113.55),
  ('Sana Tengah',     'Pasean',         'Pamekasan', 'kritis',   -6.90, 113.58),

  -- ---------- Kabupaten Sumenep ----------
  ('Pajagalan',       'Kota Sumenep',   'Sumenep',   'terbatas', -7.01, 113.87),
  ('Kalianget Timur', 'Kalianget',      'Sumenep',   'terbatas', -7.05, 113.95),
  ('Manding Laok',    'Manding',        'Sumenep',   'langka',   -7.00, 113.82),
  ('Lenteng Timur',   'Lenteng',        'Sumenep',   'langka',   -7.05, 113.78),
  ('Ganding',         'Ganding',        'Sumenep',   'kritis',   -7.08, 113.75),
  ('Guluk-Guluk',     'Guluk-Guluk',    'Sumenep',   'langka',   -7.10, 113.72),
  ('Pasongsongan',    'Pasongsongan',   'Sumenep',   'kritis',   -6.92, 113.72),
  ('Ambunten Tengah', 'Ambunten',       'Sumenep',   'langka',   -6.90, 113.80),
  ('Rubaru',          'Rubaru',         'Sumenep',   'kritis',   -6.95, 113.78),
  ('Dasuk Laok',      'Dasuk',          'Sumenep',   'langka',   -6.93, 113.85),
  ('Batuputih Laok',  'Batuputih',      'Sumenep',   'kritis',   -6.90, 113.88),
  ('Gapura Timur',    'Gapura',         'Sumenep',   'terbatas', -6.98, 113.95),
  ('Batang-Batang Daya','Batang-Batang','Sumenep',   'langka',   -6.95, 114.02),
  ('Dungkek',         'Dungkek',        'Sumenep',   'kritis',   -6.93, 114.08)
) as v(name, district, regency, bpbd_category, lat, lng)
where not exists (
  select 1 from villages e where e.name = v.name and e.district = v.district
);
