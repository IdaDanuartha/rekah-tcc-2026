# Rekah — Platform Koordinasi Darurat Air Bersih BPBD Madura

<p align="center">
  <img src="public/images/logo_tcc.png" alt="TCC Vibe Code 2026" height="72" />
</p>

<p align="center"><sub>Prototipe untuk <b>TCC Vibe Code 2026</b>.</sub></p>

Rekah adalah platform tanggap kekeringan yang menghubungkan **laporan warga (via WhatsApp)**, **prioritisasi berbasis AI**, dan **pelacakan pengiriman air (dropping) secara realtime** dalam satu alur akuntabel — dari laporan masuk sampai bukti air diterima warga.

Dibangun untuk konteks nyata krisis air Madura 2026: **94 desa di Sampang** berpotensi kekeringan (12 kecamatan kritis), **27 desa di Bangkalan** terancam, serta siaga darurat di Sumenep (lihat [Sumber Data](#sumber-data)).

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Arsitektur & Teknologi](#arsitektur--teknologi)
- [Prasyarat](#prasyarat)
- [Setup Lokal](#setup-lokal)
- [Environment Variables](#environment-variables)
- [Migrasi Database](#migrasi-database)
- [Menjalankan Aplikasi](#menjalankan-aplikasi)
- [Peta Halaman](#peta-halaman)
- [Deploy ke Produksi](#deploy-ke-produksi)
- [Catatan Operasional](#catatan-operasional)
- [Sumber Data](#sumber-data)

---

## Fitur Utama

### Kanal warga & pelaporan
- **Lapor via WhatsApp** — warga/kepala desa kirim pesan bebas; webhook Fonnte menerima.
- **Ekstraksi AI** — teks bebas (Indonesia/Madura/campuran) → data terstruktur: desa, jumlah KK, durasi, harga air mandiri, indikator urgensi, confidence. Fallback parser deterministik untuk notasi uang (`125rb` → 125000).
- **Portal pelapor** (`/portal`) — login **OTP via WhatsApp**, lihat status laporan, chat panel.
- **Loop konfirmasi penerima** — setelah dropping, warga balas **YA/BELUM** (via WA atau tombol portal) sebagai bukti akuntabilitas.

### Dashboard BPBD (`/dashboard`, auth)
- **Ringkasan** — jumlah laporan per status, laporan eskalasi, jadwal hari ini.
- **Laporan Masuk** — filter (Semua/Eskalasi/Menunggu/Verifikasi/Jadwal/Selesai), badge kategori, skor prioritas. **Eskalasi** = laporan `pending` lebih dari 12 jam (SLA).
- **Detail laporan** — teks asli, data AI, **skor prioritas 0–100** (bisa re-score), **bukti serah terima** (foto + geotag + NFC), status konfirmasi warga, tombol **follow-up WhatsApp** bila warga menjawab "belum diterima".
- **Peringatan Dini** — skor risiko prediktif (kategori + jeda dropping + laporan aktif + durasi) dengan narasi AI.
- **Data Desa** — CRUD desa, kategori BPBD (kritis/langka/terbatas), saran kategori heuristik, pencarian.
- **Jadwal Dropping** — buat jadwal + volume, salin link sopir, lacak armada.
- **Laporan Harian** — agregat dropping selesai (desa/KK/volume/antrean), ekspor PDF.
- **Stiker NFC** — registry stiker fisik: daftarkan tiap stiker ke desa/titik, edit, hapus.
- **Perangkat WhatsApp** — status & reconnect device Fonnte.

### Pengiriman air & bukti
- **Pelacakan armada realtime** (`/track/[id]`) — sopir bagikan GPS (kirim tiap ~8 detik); warga & posko memantau di peta Leaflet (posko → armada → desa) dengan rute & ETA jalan nyata (OSRM). Ada **mode simulasi demo** tanpa GPS asli.
- **Bukti serah terima** — di titik dropping sopir wajib: **foto** (dikompres di HP), **geotag GPS**, dan **tap NFC**. Foto & tag NFC wajib untuk menandai selesai.
- **Validasi NFC** — UID stiker harus terdaftar **dan** cocok dengan desa tujuan jadwal (mencegah penandaan palsu). Pakai Web NFC (`NDEFReader`, Chrome Android) dengan fallback input manual.

### Transparansi publik
- **Landing** (`/`) — direktori desa terdampak.
- **Peta publik** (`/peta`) — sebaran desa tanpa data pribadi.

---

## Arsitektur & Teknologi

| Lapisan | Teknologi |
|---|---|
| Framework | **Next.js 16** (App Router, Server Actions, Turbopack), **React 19** |
| Bahasa | TypeScript |
| Database & Storage | **Supabase** (Postgres + RLS + Storage bucket `proofs`) |
| Auth | Supabase Auth (dashboard) · OTP WhatsApp + cookie sesi (portal pelapor) |
| AI | **OpenAI GPT** (primary) → **Google Gemini** (fallback) |
| WhatsApp | **Fonnte** (webhook masuk + kirim pesan) |
| Peta & rute | **Leaflet** + **OSRM** (routing jalan nyata) + **OpenStreetMap** |
| NFC | Web NFC API (`NDEFReader`) |

Akses DB dari server memakai **service role** (bypass RLS); anon key tertutup (deny-all) sehingga data sensitif tidak bocor ke client.

---

## Prasyarat

- **Node.js** ≥ 18.18 (disarankan 20+)
- **npm** (atau pnpm/yarn/bun)
- Akun **Supabase** (project + database)
- Akun **Fonnte** dengan device WhatsApp terhubung (opsional untuk demo — ada fallback)
- API key **OpenAI** dan/atau **Gemini** (opsional untuk demo — ada mock fallback)

---

## Setup Lokal

```bash
# 1. Clone
git clone https://github.com/IdaDanuartha/rekah-tcc-2026.git
cd rekah-tcc-2026

# 2. Install dependency
npm install

# 3. Siapkan environment
cp .env.example .env.local
# lalu isi nilainya (lihat tabel Environment Variables di bawah)

# 4. Jalankan migrasi database (lihat bagian Migrasi Database)

# 5. Jalankan dev server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Salin `.env.example` → `.env.local`, lalu isi:

| Variable | Wajib | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL project Supabase. `Settings → API`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon/public key Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (server-only, **jangan** expose ke client). Dipakai semua akses data server. |
| `OPENAI_API_KEY` | ⭕ | Primary AI (ekstraksi, scoring, laporan). Tanpa ini → fallback Gemini/mock. |
| `GEMINI_API_KEY` | ⭕ | Fallback AI bila OpenAI gagal/absen. |
| `FONNTE_DEVICE_TOKEN` | ⭕ | Token **device** Fonnte (per WhatsApp terhubung) untuk kirim pesan. Diutamakan. |
| `FONNTE_API_KEY` | ⭕ | Fallback token akun Fonnte bila device token kosong. |
| `FONNTE_WEBHOOK_SECRET` | ⭕ | Secret verifikasi webhook masuk dari Fonnte (jika diaktifkan). |
| `NEXT_PUBLIC_WA_NUMBER` | ⭕ | Nomor WhatsApp tujuan lapor (dipakai tombol/link "chat WA"). |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL publik aplikasi. Lokal: `http://localhost:3000`. Prod: domain kamu (dipakai link sopir, callback AI internal). |
| `REPORTER_SESSION_SECRET` | ⭕ | Rahasia tanda tangan cookie sesi pelapor. Generate: `openssl rand -base64 32`. Kosong → fallback ke service role key. |
| `REPORTER_DEMO_OTP` | ⭕ | Kode OTP demo (mis. `123456`) supaya juri tanpa WhatsApp bisa login. **Kosongkan di produksi.** |

> ⭕ = opsional untuk demo (ada fallback), tapi **wajib untuk fungsi penuh** di produksi (WA nyata, AI nyata).

---

## Migrasi Database

Migrasi ada di `supabase/migrations/`. **Semua wajib dijalankan** (idempotent, aman diulang). Cara termudah: buka **Supabase Studio → SQL Editor**, tempel isi tiap file berurutan, Run.

| File | Isi |
|---|---|
| `0001_init.sql` | Skema inti (villages, reports, priority_scores, drop_schedules, delivery_proofs, reporter_otps) + RLS + seed demo |
| `0002_report_messages.sql` | Riwayat pesan laporan |
| `0003_reports_water_price.sql` | Kolom harga air mandiri |
| `0004_report_receipt_confirmation.sql` | Konfirmasi penerima (`received_ok`, `received_confirmed_at`) |
| `0005_drop_schedules_volume.sql` | Kolom volume liter jadwal |
| `0006_delivery_tracking.sql` | Tabel pelacakan armada realtime |
| `0007_proofs_bucket.sql` | Storage bucket publik `proofs` (foto bukti) |
| `0008_reports_price_resolved.sql` | Flag threading jawaban harga |
| `0009_nfc_tags.sql` | Registry stiker NFC + seed `DEMO-TAG-PAKAAN` |

---

## Menjalankan Aplikasi

```bash
npm run dev     # dev server (Turbopack) di http://localhost:3000
npm run build   # build produksi
npm run start   # jalankan hasil build
npm run lint    # ESLint
```

**Akun demo & login:**
- **Dashboard BPBD** (`/login`) — Supabase Auth.
- **Portal pelapor** (`/portal/login`) — nomor WhatsApp + OTP. Untuk demo, set `REPORTER_DEMO_OTP` (mis. `123456`); nomor demo bawaan seed: `+6281234567890`.

---

## Peta Halaman

| Route | Akses | Fungsi |
|---|---|---|
| `/` | Publik | Landing + direktori desa |
| `/peta` | Publik | Peta sebaran desa |
| `/portal` · `/portal/login` · `/portal/reports/[id]` | Pelapor (OTP) | Status laporan, konfirmasi, lacak |
| `/track/[id]` | Sopir/warga (link) | Bagikan/lacak lokasi armada |
| `/login` | — | Login dashboard |
| `/dashboard` | BPBD | Ringkasan |
| `/dashboard/reports` · `/reports/[id]` | BPBD | Laporan masuk & detail |
| `/dashboard/early-warning` | BPBD | Peringatan dini |
| `/dashboard/villages` · `/villages/[id]` | BPBD | Data desa |
| `/dashboard/schedule` | BPBD | Jadwal dropping |
| `/dashboard/daily-reports` | BPBD | Laporan harian |
| `/dashboard/nfc` | BPBD | Registry stiker NFC |
| `/dashboard/settings` | BPBD | Perangkat WhatsApp |

---

## Deploy ke Produksi

1. Deploy ke **Vercel** (repo → import).
2. Set **semua environment variables** di Vercel (Settings → Environment Variables). Tanpa `SUPABASE_SERVICE_ROLE_KEY` / URL, Server Action gagal.
3. Jalankan **semua migrasi** di database produksi + pastikan bucket `proofs` ada (migration 0007).
4. Set `NEXT_PUBLIC_APP_URL` ke domain produksi (HTTPS).
5. Atur **webhook Fonnte** menunjuk ke `https://<domain>/api/webhook/fonnte`.

Catatan teknis penting:
- Upload foto bukti menaikkan batas body Server Action (`serverActions.bodySizeLimit = 10mb` di `next.config.ts`) + foto dikompres di client.
- Web NFC hanya berjalan di **Chrome Android** + **HTTPS**; perangkat lain memakai input manual.
- Kirim WhatsApp memakai timeout agar tidak menahan proses bila Fonnte lambat.

---

## Catatan Operasional

- **Kategori BPBD** (kritis/langka/terbatas) diisi **manual** oleh petugas; skor prioritas (0–100) yang dihitung otomatis dengan kategori sebagai bobot dominan.
- Akses data server memakai service role (bypass RLS); jangan pernah mengimpor admin client ke kode client.
- Demo tanpa perangkat fisik: stiker seed `DEMO-TAG-PAKAAN` (desa Pakaan Barat) bisa diketik manual untuk melewati validasi NFC.

---

## Sumber Data

Konteks krisis kekeringan Madura 2026 yang melatari platform ini:

- ANTARA News Jawa Timur. (2026). *BPBD Sampang data desa terdampak kekeringan.* Diakses 10 Agustus 2026, dari https://jatim.antaranews.com/berita/1082551/bpbd-sampang-data-desa-terdampak-kekeringan
- ANTARA News Jawa Timur. (2026). *BPBD Sampang perkuat mitigasi dengan membentuk desa tangguh bencana.* Diakses 10 Agustus 2026, dari https://jatim.antaranews.com/berita/1085727/bpbd-sampang-perkuat-mitigasi-dengan-membentuk-desa-tangguh-bencana
- Beritajatim.com. (2026). *27 desa di Bangkalan terancam kekeringan, BPBD siapkan 300 ribu liter air bersih.* Diakses 10 Agustus 2026, dari https://beritajatim.com/27-desa-di-bangkalan-terancam-kekeringan-bpbd-siapkan-300-ribu-liter-air-bersih
- Kompas.com. (2026, 16 Juli). *94 desa di Sampang berpotensi dilanda kekeringan, 12 kecamatan masuk kategori kritis.* Diakses 10 Agustus 2026, dari https://surabaya.kompas.com/read/2026/07/16/132017978/94-desa-di-sampang-berpotensi-dilanda-kekeringan-12-kecamatan-masuk
- Koran Jakarta. (2026, 17 Juli). *BPBD Sampang catat 94 desa terdampak kekeringan dan krisis air bersih 2026.* Diakses 10 Agustus 2026, dari https://koran-jakarta.com/2026-07-17/bpbd-sampang-catat-94-desa-terdampak-kekeringan-dan-krisis-air-bersih-2026
- Koran Madura. (2026, 15 Juli). *Kekeringan melanda 94 desa di Sampang.* Diakses 10 Agustus 2026, dari https://koranmadura.com/2026/07/kekeringan-melanda-94-desa-di-sampang/
- PortalMadura.com. (2026, 7 Juli). *Antisipasi kemarau ekstrem, Bupati Sumenep perintahkan seluruh OPD siaga darurat kekeringan.* Diakses 10 Agustus 2026, dari https://portalmadura.com/antisipasi-kemarau-ekstrem-bupati-sumenep-perintahkan-seluruh-opd-siaga-darurat-kekeringan-340804

---

<sub>Rekah — dibangun untuk TCC 2026. Domain: koordinasi darurat air bersih BPBD Madura.</sub>
