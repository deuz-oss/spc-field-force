# SPC Field Force

Aplikasi manajemen **Field Sales & Incubation Agent** untuk proyek **ByteDance/TikTok ID-SMB** sesuai **Quotation Option 3 – Integrated Merchant Acquisition & Incubation** (field agent merangkap sebagai incubation agent).

Satu codebase untuk **Android, iOS, dan Web App** dibangun dengan Expo (React Native + TypeScript).

## Menjalankan

```bash
npm install
npx expo start
```

- Tekan `w` → buka Web App di browser
- Tekan `a` → Android (perlu emulator/HP terhubung + Expo Go)
- Tekan `i` → iOS (perlu Mac/simulator)

Build produksi (APK/IPA/store):

```bash
npm i -g eas-cli
eas build -p android   # atau -p ios
```

## Akun Demo

| Posisi | Username | Password | Akses |
|---|---|---|---|
| Super Admin | `superadmin` | `super123` | Monitor seluruh aktivitas + performa semua posisi + **atur akun akses** (buat/ubah posisi/tim/reset password/nonaktifkan) |
| Client | `client` | `client123` | **Read-only**: monitor aktivitas & performa Ops Manager, Team Lead, Field Agent + ekspor laporan |
| Ops Manager | `admin` | `admin123` | Operasional penuh: merchant, assign, impor, laporan (tanpa atur akun) |
| Team Lead | `lead.jaksel` | `lead123` | Data timnya saja: dashboard, merchant, assign agen, impor CSV, laporan |
| Field Agent (+Incubation) | `agent.budi` | `agent123` | Merchant miliknya, kunjungan/check-in/out, absensi & rute |

Data demo tersimpan lokal (AsyncStorage); reset kapan pun lewat **Profil → Reset Data Demo**.
Akun Super Admin & Client otomatis tersedia juga pada data lama (migrasi otomatis).

## Matriks Hak Akses per Posisi

| Fitur | Super Admin | Client | Ops Manager | Team Lead | Field Agent |
|---|---|---|---|---|---|
| Dashboard monitor semua tim | ✓ | ✓ | ✓ | timnya | dirinya |
| **Performance KPI interaktif** (di dalam Dashboard) | semua tim, per TL | semua tim, per TL | semua tim, per TL | agen satu tim | individu |
| Lihat merchant / kunjungan / absensi | ✓ semua | ✓ semua (read-only) | ✓ semua | timnya | miliknya |
| Tambah/impor/assign/status merchant | ✓ | — | ✓ | ✓ | — |
| Mulai kunjungan check-in/out merchant | — | — | — | — | ✓ |
| Absensi clock in/out (di halaman utama) + tracking rute | — | — | ✓ | ✓ | ✓ |
| Ekspor laporan (absensi, merchant, kunjungan) | ✓ | ✓ | ✓ | ✓ timnya | — |
| Estimasi Fee Quotation Option 3 | ✓ saja | — | — | — | — |
| Atur akun akses (posisi, tim, password) | ✓ | — | — | — | — |

Catatan Performance KPI (bagian bawah halaman Dashboard) — selaras dengan tabel **KPI and SLA** pada RFP:
- Disiplin: working hours 8 jam/hari · on-site outreach ≥6 jam/hari · geo-fence compliance ≥99% · route check-in completion ≥95% · valid visit (geofence + durasi ≥10 menit + bukti foto) ≥95%
- Funnel BD Field Merchant Onboarding: Kunjungan → Connect WA → Registered → Qualifikasi Lolos → Upload Produk → Redemption → Cold Start Selesai (ringkasan tim + rincian per agen, jangkauan kumulatif)
- Status agen otomatis: On Track / Perlu Perhatian / Di Bawah Target berdasarkan jumlah target yang terlewati
- Sumber angka: hasil check-in/out absensi, tracking rute GPS, dan milestone kunjungan per merchant

## Cakupan Requirement → Implementasi

| Requirement | Lokasi |
|---|---|
| Batasan akses berdasarkan posisi | Navigasi tab per role (`App.tsx`) + scope data per posisi (`src/store/useStore.ts`: `scopeUsers`, `merchantScope`) |
| Dashboard harian/mingguan/bulanan (pilih bulan)/all time | `DashboardScreen.tsx` + filter periode (`PeriodPicker`) |
| Laporan ekspor: Absensi, Merchant Registered/Activated/Cold Start | `ReportsScreen.tsx` → CSV via share sheet (mobile) / unduhan (web), plus ekspor Kunjungan |
| Impor daftar merchant oleh Team Lead utk di-assign | `ImportScreen.tsx` (CSV + preview + bulk assign ke agent) |
| Data visit: nama pemilik, kontak merchant, geo pin point, foto lokasi, upload dokumen | `VisitFlowScreen.tsx` |
| Check-in/check-out di lokasi merchant + durasi di lokasi | `MerchantDetailScreen` → `VisitFlowScreen` (timer live, jarak ke pin merchant, flag geo valid ≤300 m) |
| Tracking rute selama clock-in s/d clock-out | `AttendanceScreen.tsx` (GPS watch → polyline), peta Leaflet, riwayat + detail rute |
| Option 3: agent merangkap incubation | Milestone kunjungan: pitch → follow-up WA → registered → kualifikasi → upload produk → redemption → cold start complete; status merchant otomatis naik (Cold Start → Registered → Activated) |
| Estimasi fee Option 3 (base + success fee + insentif cap) | Kartu "Estimasi Fee" di `ReportsScreen.tsx` (rate per tier kota di `src/config.ts`) |

## Alur Kerja Harian Agent

1. Buka tab **Dashboard** → **CLOCK IN** (absensi) → GPS mulai merekam rute otomatis (berjalan global selama aplikasi terbuka).
2. Tab Merchant → buka merchant yang di-assign → **CHECK IN** → isi nama pemilik, kontak WA, hasil milestone, foto lokasi (kamera/galeri), upload dokumen, catatan.
3. **CHECK OUT** → durasi di lokasi tersimpan, status merchant diperbarui.
4. Kembali ke Dashboard → **CLOCK OUT** → rute selesai; lihat riwayat di tab Absensi & peta di detail absensi.

## Format CSV Impor Merchant

Kolom wajib `nama`, lainnya opsional:

```
nama,alamat,telepon,pemilik,kategori,lat,lng
Warung Bu Ani,"Jl. Kebon Sirih No.10",081298760001,Ani,F&B,-6.183022,106.826771
```

Template siap unduh dari layar Impor.

## Design System

Mengacu hasil `ui-ux-pro-max` untuk *enterprise workforce SaaS* (density dashboard, motion subtle):

- **Palet**: Trust Blue `#2563EB` di atas slate (`bg #F8FAFC`, teks `#1E293B`, muted `#475569`, border `#E2E8F0`); semantik AA: ok `#15803D`, warn `#B45309`, info `#0369A1`, destructive `#DC2626`
- **Tipografi**: Plus Jakarta Sans (400/600/700/800) via `@expo-google-fonts`
- **Komponen**: kartu radius 16 + shadow lembut, tombol min-height 48dp, chip filter dengan hitSlop (target sentuh ≥44pt), badge tint 10%
- **Aksesibilitas**: kontras teks ≥4.5:1, `accessibilityRole="button"`, feedback sentuh (opacity/spinner), ikon vektor Ionicons (bukan emoji)
- Token terpusat di `src/theme.ts` (`C` warna, `F` font, `T` tipografi, `SP` spacing, `R` radius)

## Struktur

```
App.tsx                  # navigasi + gate login + tab per role
src/
  config.ts              # rate Option 3, radius geo valid, label
  types.ts               # model domain
  store/useStore.ts      # state global (zustand) + persistensi
  store/seed.ts          # data demo (tim Jaksel/Surabaya, agen, merchant, kunjungan)
  utils/                 # csv, geo (haversine), period, export, format
  components/            # UI kit, PeriodPicker, LeafletMap (peta via WebView)
  screens/               # 12 layar aplikasi
```

## Catatan & Pengembangan Lanjutan

- **Penyimpanan lokal** (demo/offline-first): sinkronisasi multi-user memerlukan backend (mis. Supabase/Firebase/REST API) — struktur store sudah memisahkan action agar mudah dialihkan.
- Tracking rute berjalan saat aplikasi terbuka (foreground). Mode *background location* dapat ditambahkan via `expo-task-manager` + `Location.startLocationUpdatesAsync`.
- Foto/dokumen disimpan sebagai URI lokal; untuk produksi gunakan object storage.
- Peta web memuat tile OpenStreetMap (butuh internet).
- Kepatuhan geo-fence absensi & validitas visit mengikuti definisi KPI RSP (valid attendance/valid visit).
