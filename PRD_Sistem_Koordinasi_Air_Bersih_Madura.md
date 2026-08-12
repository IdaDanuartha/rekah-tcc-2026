# Product Requirements Document
## Sistem Koordinasi Bantuan Air Bersih Kekeringan Madura

**Kompetisi:** TCC Vibe Code 2026 — UKM Triple-C, Universitas Trunodjoyo Madura
**Sub tema:** Web Application Development
**Tema acara:** Shaping Tomorrow — Digital Innovation, Artificial Intelligence, and Sustainable Communities
**Versi dokumen:** 1.0
**Status:** Draft untuk pengembangan MVP

---

## 1. Ringkasan Eksekutif

Sistem yang mengubah laporan kekeringan dari kepala desa, dikirim lewat WhatsApp dalam bahasa bebas berupa teks atau suara, menjadi keputusan prioritas dropping air yang bisa dipertanggungjawabkan oleh BPBD. AI berperan di tiga titik: mengekstrak laporan tidak terstruktur jadi data terstruktur, menyusun skor prioritas beralasan, dan memprediksi desa berisiko krisis sebelum mereka sempat lapor. Seluruh siklus ditutup dengan bukti serah terima terverifikasi (foto, geotag, dan NFC opsional) serta halaman transparansi publik. Dibangun sebagai Progressive Web App agar bisa diinstal dan tetap terpakai pada kondisi sinyal lemah di pedesaan.

> **Disclaimer:** Ini adalah prototipe kompetisi, bukan aplikasi resmi BPBD Sampang maupun BPBD Bangkalan. Data institusi dan angka yang dikutip berasal dari rilis publik dan pemberitaan media, dipakai sebagai dasar riset masalah, bukan berarti kedua institusi telah mengadopsi atau berafiliasi dengan sistem ini.

---

## 2. Latar Belakang Masalah

BPBD Sampang telah memetakan 94 desa terdampak kekeringan di 12 kecamatan sejak status siaga darurat ditetapkan 29 Mei 2026, dengan anggaran dan armada dropping air yang sudah siap. Namun hingga pertengahan Juli 2026, belum ada satu pun permintaan resmi bantuan air bersih yang masuk dari desa-desa tersebut. Di Bangkalan, 27 desa di 10 kecamatan berdampak pada 15.789 kepala keluarga, dilayani hanya dua armada tangki dengan jadwal dropping Senin sampai Kamis, sementara warga di sejumlah wilayah terpaksa membeli air mandiri seharga Rp250.000 per tangki 5.000 liter.

Ini bukan masalah kekurangan sumber daya. Ini kegagalan alur informasi: desa yang butuh bantuan tidak tahu cara meminta secara resmi, dan institusi yang sudah siap membantu tidak menerima permintaan yang bisa ditindaklanjuti.

---

## 3. Tujuan Produk

**Tujuan utama:** memangkas jarak antara desa yang butuh air dan institusi yang punya sumber daya untuk mengirimkannya, lewat kanal yang sudah dipakai sehari-hari oleh kepala desa, dengan keputusan prioritas yang bisa diaudit, bukan kotak hitam.

**Tujuan turunan:**
- Menurunkan waktu antara kondisi darurat terjadi dan permintaan resmi tercatat
- Memastikan alokasi armada terbatas jatuh ke desa dengan urgensi tertinggi, bukan yang paling keras meminta
- Memberi bukti yang bisa diverifikasi bahwa bantuan benar-benar sampai
- Mengurangi beban administratif petugas BPBD dalam menyusun laporan harian ke atas

**Bukan tujuan (out of scope untuk MVP):**
- Menggantikan prosedur administratif resmi berjenjang yang berlaku di BPBD
- Menangani distribusi bantuan selain air bersih
- Sistem pembayaran atau donasi pihak ketiga (disebut di roadmap, tidak dibangun)
- Aplikasi native, karena kebutuhan instalasi tanpa app store lebih penting daripada fitur native murni

---

## 4. Pengguna dan Peran

| Peran | Kanal akses | Kebutuhan utama |
|---|---|---|
| Kepala Desa / Perangkat Desa | WhatsApp (nomor terdaftar) | Melapor cepat tanpa mengisi form, dapat kepastian status |
| Warga | WhatsApp (opsional, sinyal pendukung) | Melapor kondisi tanpa harus lewat perangkat desa |
| Petugas Kedaruratan BPBD | Dashboard web (PWA) | Melihat antrean prioritas beralasan, menjadwalkan armada, memverifikasi bukti |
| Publik | Halaman web publik, tanpa login | Memastikan tidak ada desa yang terlupa |

---

## 5. Ruang Lingkup Fitur

### 5.1 Fitur Inti (wajib, dibangun penuh untuk MVP)

| # | Fitur | Deskripsi |
|---|---|---|
| 1 | Registrasi Nomor WA Resmi per Desa | Admin BPBD mendaftarkan nomor WA kepala desa saat onboarding. Laporan dari nomor terdaftar otomatis berstatus terverifikasi; dari nomor tak dikenal berstatus belum terverifikasi dan butuh approval manual |
| 2 | Intake WhatsApp (teks dan suara) | Kepala desa atau warga melapor bebas lewat WA, teks atau catatan suara, tanpa form |
| 3 | Ekstraksi Berbasis AI | Mengubah laporan bebas menjadi data terstruktur: desa, jumlah KK terdampak, durasi, indikator urgensi |
| 4 | Deduplikasi Laporan | Rule-based, laporan dari desa sama dalam rentang 24 jam digabung jadi satu entri |
| 5 | Skoring Prioritas Berbasis AI | Skor plus alasan tertulis, dari kombinasi kategori resmi BPBD, laporan warga, dan riwayat dropping |
| 6 | Dashboard Petugas BPBD | Peta, antrean prioritas, tombol setujui dan jadwalkan, riwayat per desa |
| 7 | Eskalasi Otomatis | Laporan pending lebih dari 12 jam tanpa respons memicu flag dan pengingat ke petugas jaga |
| 8 | Generator Rute Dropping | Urutan kunjungan armada dari kapasitas terbatas, mempertimbangkan kapasitas liter per rit terhadap estimasi kebutuhan KK |
| 9 | Notifikasi Balik Otomatis | Balasan WA berisi status: diterima, dijadwalkan, estimasi tanggal |
| 10 | Halaman Transparansi Publik | Status semua desa, hanya baca, tanpa login |

### 5.2 Fitur Nilai Tambah (pembeda dari solusi sejenis)

| # | Fitur | Deskripsi |
|---|---|---|
| 11 | Bukti Serah Terima Terverifikasi | Foto, geotag, dan timestamp saat armada tiba. Status selesai baru berubah setelah bukti masuk. Diperkuat dengan tap NFC di titik distribusi desa sebagai lapisan tambahan, lihat bagian 9 |
| 12 | Prediksi Risiko Dini | Berjalan terjadwal harian, memprediksi desa berisiko krisis dari kategori BPBD historis, lama sejak dropping terakhir, dan sinyal harga air mandiri, lalu mengirim WA proaktif sebelum desa sempat lapor |
| 13 | Narasi Laporan Resmi Harian | Draf otomatis laporan ke Bupati/Pemprov dari data agregat harian, petugas tinggal meninjau |
| 14 | Sinyal Tidak Langsung dari Warga | Laporan harga air tangki tinggi dari beberapa warga menaikkan level pantauan desa meski belum ada laporan resmi |

### 5.3 Visi Lanjutan (disebutkan, tidak dibangun untuk MVP)

- Kanal kontribusi pihak ketiga untuk desa dengan antrean terlama
- Integrasi data curah hujan BMKG untuk prediksi musiman
- Kartu NFC per kepala keluarga untuk verifikasi sampai level rumah tangga

---

## 6. Alur Sistem

### 6.1 Flow A — Pelaporan hingga Verifikasi Selesai

```
1. Kepala Desa/Warga kirim laporan via WA (teks atau catatan suara)
        |
   [Cek nomor pengirim]
1a. Nomor terdaftar -> berstatus terverifikasi
1b. Nomor tak dikenal -> tetap diproses, berstatus belum terverifikasi,
    perlu persetujuan manual sebelum dihitung skor prioritas
        |
2. [AI] Transkripsi suara jika perlu -> ekstraksi jadi data terstruktur
        |  Jika keyakinan ekstraksi rendah -> AI kirim pertanyaan
        |  klarifikasi balik via WA
        |
3. Sistem mencocokkan desa ke database referensi
   (kategori resmi BPBD: kritis, langka, terbatas)
        |
   [Cek duplikasi]
3a. Ada laporan lain dari desa sama dalam 24 jam -> digabung
    sebagai laporan pendukung
3b. Tidak ada duplikat -> entri baru
        |
4. [AI] Skoring prioritas -> skor dan alasan tertulis
        |
5. Laporan masuk dashboard BPBD, status pending
        |
   [SLA berjalan]
5a. Lebih dari 12 jam tanpa respons -> flag naik di dashboard,
    pengingat terkirim ke petugas jaga
        |
6. Petugas BPBD meninjau dan menyetujui
        |
7. [AI] Generator rute -> urutan kunjungan armada, mempertimbangkan
   kapasitas liter per rit terhadap estimasi kebutuhan KK
        |
8. Petugas menjadwalkan dropping -> status dijadwalkan
        |
9. Notifikasi WA otomatis ke pelapor: tanggal dan estimasi waktu
        |
10. Armada tiba -> Kepala Desa memfoto proses pengisian via WA
        |
11. Sistem menyematkan geotag dan timestamp, mencocokkan dengan
    koordinat desa terdaftar
        |
    [Jika perangkat petugas mendukung Web NFC API]
11a. Petugas menempelkan HP ke tag NFC di titik distribusi desa
11b. Sistem mencatat ID tag, identitas petugas, dan waktu tap
    [Jika tidak mendukung -> lanjut tanpa NFC, tetap sah dengan
    foto dan geotag]
        |
12. Status berubah menjadi selesai dan terverifikasi
        |
13. Halaman transparansi publik diperbarui otomatis
```

### 6.2 Flow B — Deteksi Dini Proaktif

```
1. [AI] Proses batch harian menganalisis:
   - Kategori resmi BPBD per desa (historis)
   - Lama waktu sejak dropping terakhir
   - Sinyal harga air mandiri dari laporan warga terbaru
        |
2. Desa dengan skor risiko naik -> status pantauan
        |
3. Sistem kirim WA proaktif ke kepala desa meminta update kondisi
        |
4. Jika dibalas -> masuk Flow A dari langkah 2
   Jika tidak dibalas dalam batas waktu -> tetap masuk radar petugas
   dengan prioritas menengah, belum terkonfirmasi
```

### 6.3 Flow C — Laporan Harian ke Atas

```
1. Setiap akhir hari, sistem mengumpulkan: jumlah desa dilayani,
   liter tersalurkan, kendala tercatat, desa masih dalam antrean
        |
2. [AI] Menyusun draf laporan format resmi
        |
3. Petugas meninjau, menyunting seperlunya, mengekspor sebagai PDF
```

---

## 7. Peran AI

| Titik AI | Input | Output | Model |
|---|---|---|---|
| Transkripsi suara | Catatan suara WA | Transkrip teks | Model transkripsi ringan |
| Ekstraksi | Teks bebas | JSON terstruktur | Claude Haiku 4.5, tugas klasifikasi ringan |
| Skoring prioritas | Data terstruktur, histori, kategori resmi | Skor dan alasan tertulis | Claude Haiku 4.5, dijalankan batch harian untuk deteksi dini |
| Narasi laporan | Data agregat harian | Draf teks laporan resmi | Claude Haiku 4.5 atau Sonnet tergantung kompleksitas format |

**Yang sengaja dibuat rule-based, bukan AI:** penentuan kategori resmi BPBD tetap menjadi bobot dominan dalam skor, supaya keputusan darurat tidak sepenuhnya bergantung pada model dan tetap bisa diaudit manusia.

**Estimasi biaya operasional AI** (Claude Haiku 4.5, USD 1 per juta token input, USD 5 per juta token output, per Agustus 2026):

| Skenario | Laporan per hari | Estimasi biaya per bulan |
|---|---|---|
| Normal | 20 | sekitar USD 0,45 |
| Puncak kemarau | 100 | sekitar USD 2,25 |
| Stress test dua kabupaten sekaligus | 300 | sekitar USD 6,75 |

Bahkan pada skenario stress test, biaya bulanan tetap di bawah harga satu tangki air 5.000 liter yang dibeli mandiri warga (Rp250.000).

---

## 8. Arsitektur Teknis

**Stack:**
- Frontend: Next.js (App Router), Tailwind CSS
- Backend/Database: Supabase (Postgres, Realtime, Auth untuk petugas)
- Kanal pesan: Fonnte (WhatsApp Business API)
- AI: Claude API (Haiku 4.5)
- Hosting: Vercel

**Skema database (ringkas):**

```
laporan
  id, sumber (wa/web), nomor_wa, status_verifikasi_nomor,
  teks_asli, desa_id, estimasi_kk, durasi_hari,
  confidence_ai, status (pending/verified/scheduled/done)

desa_referensi
  id, nama, kecamatan, kabupaten, kategori_bpbd,
  koordinat_lat, koordinat_lng, nomor_wa_terdaftar,
  terakhir_dropping_at

skor_prioritas
  laporan_id, skor, alasan_teks, dihitung_at

jadwal_dropping
  id, desa_id, armada, tanggal, status

bukti_serah_terima
  jadwal_id, foto_url, geotag_lat, geotag_lng,
  nfc_tag_id (nullable), petugas_id, waktu_verifikasi
```

---

## 9. Verifikasi NFC

Menggunakan Web NFC API pada peramban, bukan hardware terminal terpisah. Satu tag NFC fisik ditempel permanen di titik distribusi tetap tiap desa. Saat verifikasi serah terima, petugas menempelkan telepon genggamnya ke tag tersebut sebagai bukti kehadiran fisik yang tidak bisa dipalsukan dari jarak jauh.

**Batasan:** hanya berjalan pada Chrome for Android, wajib HTTPS, butuh izin akses NFC tiap sesi. Karena keterbatasan ini, NFC dirancang sebagai peningkatan bertahap, bukan gerbang wajib. Perangkat yang tidak mendukung tetap bisa menyelesaikan verifikasi lewat foto dan geotag.

**Kebutuhan demo:** satu perangkat Android dengan Chrome terbaru, dua sampai tiga tag NFC tipe NTAG213.

---

## 10. Spesifikasi PWA

| Komponen | Fungsi |
|---|---|
| manifest.json | Metadata instalasi: nama, ikon, warna tema, mode standalone |
| Service Worker | Cache aset statis, strategi luring untuk dashboard |
| Ikon multi-ukuran | 192x192 dan 512x512 untuk layar utama |
| HTTPS | Wajib, otomatis terpenuhi di Vercel |

**Strategi luring:** dashboard petugas menyimpan data terakhir agar tetap terbaca saat koneksi terputus sebentar, dengan sinkronisasi ulang otomatis. Aksi seperti menjadwalkan dropping tersimpan lokal lewat Background Sync API saat sinyal lemah, terkirim otomatis begitu koneksi kembali.

---

## 11. Gap dan Mitigasi

### Sudah ditutup di desain

| Gap | Mitigasi |
|---|---|
| Siapa saja bisa mengaku sebagai kepala desa lewat WA | Registrasi nomor WA resmi, laporan dari nomor tak dikenal butuh persetujuan manual |
| Laporan ganda dari desa sama membanjiri antrean | Deduplikasi berbasis desa dan rentang waktu |
| Laporan menumpuk tanpa respons petugas | Eskalasi otomatis dengan SLA 12 jam |
| Rute dropping tidak mempertimbangkan volume kebutuhan riil | Generator rute menghitung kapasitas liter per rit terhadap estimasi KK |
| Sistem terkesan berafiliasi resmi dengan BPBD | Disclaimer eksplisit di dokumen dan presentasi |

### Keterbatasan yang disadari, tidak ditutup penuh untuk MVP

| Gap | Alasan | Jawaban singkat |
|---|---|---|
| Tag NFC dapat dicabut, dipindah, atau digandakan | Tag polos tanpa enkripsi, di luar cakupan waktu enam minggu | Lapisan tambahan, bukan pengaman utama; verifikasi utama tetap foto dan geotag |
| Model prediksi risiko belum punya data historis dropping riil di awal | Data historis baru terkumpul setelah sistem berjalan | Skor awal bergantung kategori resmi BPBD yang rule-based, akurasi membaik bertahap |
| AI tidak belajar dari koreksi manual petugas | Butuh jalur pelatihan ulang di luar cakupan prototipe | Koreksi tercatat, perbaikan model berkala jadi pengembangan lanjutan |
| Status hukum laporan digital versus prosedur surat berjenjang | Di luar kewenangan tim mengubah SOP birokrasi | Sistem sebagai pelengkap yang mempercepat koordinasi, bukan pengganti prosedur resmi |
| Akurasi ekstraksi untuk campuran bahasa dan istilah lokal Madura belum diuji formal | Butuh dataset uji berlabel yang belum tersedia | Diuji dengan skenario campuran, validasi formal jadi pengembangan lanjutan |

---

## 12. Konsep dan Filosofi Desain

### 12.1 Prinsip dasar

Desain sistem ini tidak dimulai dari palet warna atau font yang populer dipakai untuk produk AI pada umumnya. Ia dimulai dari pertanyaan: apa yang secara visual dan material mendefinisikan pengalaman kekeringan di Madura, dan bagaimana desain bisa menceritakan perjalanan dari krisis menuju penyelesaian, bukan sekadar menjadi wadah kosong untuk data.

Sistem ini melayani dua jenis pengguna dengan kebutuhan visual yang berbeda: petugas BPBD yang butuh dashboard padat data dan tenang untuk bekerja cepat di bawah tekanan, serta publik yang butuh halaman transparansi yang mudah dipahami sekilas pandang. Keduanya dijembatani oleh satu identitas visual yang konsisten, dengan intensitas warna dan kepadatan informasi yang disesuaikan pada tiap konteks.

### 12.2 Elemen penanda: Retakan yang Terisi

Elemen visual utama yang membedakan sistem ini adalah motif garis retakan tanah kering, direpresentasikan sebagai pola garis organik dan tidak beraturan, mengacu langsung pada permukaan sawah dan ladang di Madura saat kemarau panjang. Motif ini bukan dekorasi, melainkan alat penyampai informasi: setiap kartu status desa menampilkan pola retakan yang terisi warna biru air secara proporsional terhadap tingkat penyelesaian penanganannya. Desa yang belum tersentuh bantuan menampilkan retakan penuh berwarna cokelat tanah kering. Desa yang sudah dilayani menampilkan retakan yang nyaris seluruhnya terisi warna air jernih.

Pendekatan ini menjawab prinsip bahwa elemen struktural pada sebuah desain seharusnya mengandung informasi yang sebenarnya, bukan sekadar mempercantik tampilan. Progres bar generik tidak bercerita apa-apa tentang subjeknya. Retakan yang terisi air bercerita tentang subjeknya secara langsung: perjalanan dari tanah pecah menuju air yang mengalir kembali, yang persis merupakan inti masalah yang diselesaikan sistem ini.

### 12.3 Palet warna

Warna diturunkan dari material yang benar-benar ada di lanskap Madura saat kemarau, bukan dari tren warna yang umum dipakai produk digital.

| Nama | Nilai heks | Peran | Sumber material |
|---|---|---|---|
| Tanah Pecah | #5C4430 | Warna gelap utama untuk teks dan struktur | Tanah liat kering yang retak di sawah tadah hujan Madura |
| Lempung | #B08968 | Warna tengah untuk pembatas dan teks sekunder | Warna tanah liat basah, penanda transisi |
| Kapur Karang | #E8E2CF | Latar belakang utama | Batu kapur dan gamping, formasi geologis khas pesisir Madura |
| Air Jernih | #1D6F87 | Aksen utama, status terselesaikan, tautan dan aksi utama | Air bersih sebagai penyelesaian masalah, warna paling jenuh dalam palet |
| Siaga | #C97A2B | Status pantauan dan peringatan menengah | Warna tanah yang mulai mengering, sebelum retak sepenuhnya |
| Genting | #A23E2C | Status darurat dan prioritas tertinggi, dipakai sangat terbatas | Warna genteng tanah liat bakar khas rumah Madura, dipakai untuk urgensi tertinggi |

Kapur Karang sengaja dipilih dengan nuansa lebih kelabu dan hangat dibanding warna krem yang umum dipakai desain buatan AI, karena mengacu langsung pada warna batu kapur pesisir, bukan sekadar warna netral generik. Warna Genting juga sengaja dipilih dengan kejenuhan berbeda dari warna terakota yang umum muncul di desain AI, karena mengacu pada genteng tanah liat bakar, bukan aksen dekoratif.

### 12.4 Tipografi

| Peran | Typeface | Alasan pemilihan |
|---|---|---|
| Judul dan tajuk | Fraunces | Serif dengan karakter kuat dan sedikit tekstur tulisan tangan, memberi kesan institusional tanpa terasa dingin, dipakai terbatas hanya di judul dan angka besar |
| Isi dan antarmuka | Plus Jakarta Sans | Typeface humanis buatan desainer Indonesia, terbaca jernih pada kepadatan data tinggi di dashboard, sekaligus menjadi pilihan yang punya akar lokal, konsisten dengan semangat produk yang melayani masyarakat Indonesia |
| Data dan kode | IBM Plex Mono | Dipakai khusus untuk angka koordinat, identitas tag NFC, dan cap waktu, memberi kejelasan visual bahwa data tersebut adalah catatan presisi, bukan narasi |

### 12.5 Tata letak

**Halaman transparansi publik:** tata letak peta dan daftar berdampingan. Latar belakang memakai tekstur retakan tanah yang samar sebagai motif ambient, memudar seiring desa berstatus selesai bertambah, sehingga kondisi visual keseluruhan halaman turut mencerminkan kemajuan penanganan secara agregat.

**Dashboard petugas:** tata letak padat data dengan latar netral tenang. Warna hanya dipakai untuk indikator status, bukan dekorasi, karena petugas bekerja di bawah tekanan waktu dan butuh pemindaian visual cepat tanpa gangguan.

**Penomoran pada Alur Sistem** di bagian 6 dokumen ini memang menggunakan urutan angka, karena tahapan tersebut benar-benar merepresentasikan urutan proses yang harus terjadi berurutan, bukan sekadar pola dekoratif tiga langkah yang umum dipakai desain generik.

### 12.6 Ikon

Seluruh ikon memakai pustaka Lucide dengan ketebalan garis konsisten, tanpa emoji dalam bentuk apa pun, baik di antarmuka maupun pada dokumentasi teknis maupun komunikasi WhatsApp otomatis. Pemetaan ikon terhadap makna:

| Konteks | Ikon Lucide | Makna |
|---|---|---|
| Laporan masuk | `message-circle` | Pesan diterima dari WA |
| Status belum terverifikasi | `shield-alert` | Perlu tinjauan manual |
| Status terverifikasi | `shield-check` | Nomor terdaftar resmi |
| Skor prioritas tinggi | `flame` | Urgensi tertinggi |
| Armada terjadwal | `truck` | Dropping air dalam perjalanan |
| Verifikasi lokasi | `map-pin` | Geotag tercatat |
| Verifikasi NFC | `nfc` | Tap tag terverifikasi |
| Status selesai | `check-circle-2` | Penanganan tuntas |
| Prediksi risiko | `radar` | Deteksi dini proaktif |
| Transparansi publik | `eye` | Halaman dapat dilihat publik |

### 12.7 Mengapa arah ini, bukan arah yang umum dipakai desain AI

Tiga pola yang paling sering muncul pada desain buatan AI saat ini adalah latar krem hangat dengan aksen terakota, latar nyaris hitam dengan aksen neon tunggal, atau tata letak ala koran dengan garis tipis dan kolom rapat. Ketiganya legal digunakan pada brief tertentu, tetapi cenderung dipakai tanpa alasan yang berakar pada subjek sebenarnya.

Sistem ini secara sadar menghindari ketiga pola tersebut. Warna diturunkan langsung dari material tanah, kapur, dan air yang menjadi inti persoalan yang diselesaikan, bukan dari tren warna produk digital. Elemen penanda visualnya, retakan yang terisi air, mengandung informasi nyata tentang status desa, bukan sekadar hiasan. Tipografi tubuh memilih typeface buatan desainer Indonesia sebagai pernyataan sadar bahwa produk ini melayani konteks lokal, bukan template global yang ditempeli konten Indonesia.

---

## 13. Metrik Keberhasilan (untuk keperluan presentasi)

| Metrik | Definisi | Cara ukur di prototipe |
|---|---|---|
| Waktu dari laporan ke keputusan | Rentang antara laporan masuk dan status disetujui petugas | Timestamp otomatis di database |
| Akurasi ekstraksi AI | Kesesuaian data terstruktur dengan isi laporan asli | Uji manual terhadap sampel skenario percakapan |
| Tingkat verifikasi bukti serah terima | Proporsi dropping dengan bukti lengkap (foto, geotag, dan NFC bila tersedia) terhadap total dropping | Query database |
| Waktu rata-rata eskalasi terpakai | Berapa sering SLA 12 jam terpicu | Query database |

---

## 14. Ringkasan Diferensiasi

Kebanyakan aplikasi lapor bencana berhenti pada pola warga melapor lalu petugas melihat daftar. Sistem ini menutup siklus penuh: deteksi lewat suara dan prediksi risiko proaktif, keputusan lewat skor beralasan yang bisa diaudit, eksekusi lewat rute yang mempertimbangkan kapasitas riil, verifikasi lewat bukti serah terima berlapis, pelaporan ke atas lewat narasi otomatis, dan transparansi lewat halaman publik. Ditambah kemampuan instalasi PWA yang menjawab kondisi sinyal lapangan yang nyata, dan lapisan verifikasi NFC yang murah tanpa hardware khusus, sistem ini dirancang sebagai alat kerja institusi dari ujung ke ujung dengan akuntabilitas yang bisa dibuktikan, bukan sekadar diklaim.
