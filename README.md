# SPC Field Force

Aplikasi manajemen **Field Sales & Incubation Agent** untuk proyek **ByteDance/TikTok ID-SMB** sesuai **Quotation Option 3 – Integrated Merchant Acquisition & Incubation** (field agent merangkap sebagai incubation agent).

Satu codebase untuk **Android, iOS, dan Web App** dibangun dengan Expo (React Native + TypeScript).

## Menjalankan

```bash
npm install
npx expo start
```

- Tekan `w` → buka Web App di browser
- Tekan `a` / `i` → **hanya untuk fitur tanpa background location.** Live tracking pakai task GPS native (`expo-task-manager`) yang tidak didukung Expo Go — di Android/iOS gunakan custom **dev client** (lihat di bawah), bukan `npx expo start` polos.

Butuh `.env` (salin dari `.env.example`) berisi kredensial Supabase — lihat bagian **Backend (Supabase)**.

### Dev client (Android/iOS, wajib untuk background location)

```bash
npx eas-cli login
npx eas-cli build --platform android --profile development   # atau --platform ios
```

Install APK/IPA hasil build ke device/emulator, lalu jalankan bundler dengan:

```bash
npx expo start --dev-client            # HP di jaringan/USB yang sama
npx expo start --dev-client --tunnel   # HP di jaringan berbeda (butuh @expo/ngrok)
```

Build produksi (APK/IPA/store) pakai profile `eas.json` yang sesuai (`eas build -p android --profile production`, dsb — profile produksi belum dikonfigurasi, baru ada `development`).

## Akun Demo

| Posisi | Username | Password | Akses |
|---|---|---|---|
| Super Admin | `superadmin` | `super123` | Monitor seluruh aktivitas + performa semua posisi + **atur akun akses** (buat/ubah posisi/tim/reset password/nonaktifkan) |
| Client | `client` | `client123` | **Read-only**: monitor aktivitas & performa Ops Manager, Team Lead, Field Agent + ekspor laporan |
| Ops Manager | `admin` | `admin123` | Operasional penuh: merchant, assign, impor, laporan (tanpa atur akun) |
| Team Lead | `lead.jaksel` | `lead123` | Data timnya saja: dashboard, merchant, assign agen, impor CSV, laporan |
| Field Agent (+Incubation) | `agent.budi` | `agent123` | Merchant miliknya, kunjungan/check-in/out, absensi & rute |

Data disimpan di **Supabase** (Postgres + Auth + Realtime), bukan lokal — semua akun/tim/merchant di atas berasal dari seed data yang dijalankan sekali via `npm run seed:supabase` (lihat bagian **Backend**). Tombol **Profil → Muat Ulang Data** cuma refetch dari server, bukan reset ke kondisi awal (tidak ada tombol reset destruktif lagi, karena datanya sekarang live/shared).

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
| Check-in/check-out di lokasi merchant + durasi di lokasi | `MerchantDetailScreen` → `VisitFlowScreen` (timer live, jarak ke pin merchant). Check-in **diblokir** (bukan cuma ditandai) kalau agent belum clock-in aktif atau berada di luar radius 300 m dari pin merchant. |
| Tracking rute selama clock-in s/d clock-out (live, lintas device, termasuk saat app di-background di Android/iOS) | `TrackingWatcher.tsx` + `src/tasks/locationTask.ts` (native background task), realtime via Supabase, peta live `LiveMapScreen.tsx`, riwayat + detail rute + deteksi "titik berhenti" di `AttendanceDetailScreen.tsx` |
| Option 3: agent merangkap incubation | Milestone kunjungan: pitch → follow-up WA → registered → kualifikasi → upload produk → redemption → cold start complete; status merchant otomatis naik (Cold Start → Registered → Activated) |
| Estimasi fee Option 3 (base + success fee + insentif cap) | Kartu "Estimasi Fee" di `ReportsScreen.tsx` (rate per tier kota di `src/config.ts`) |

## Alur Kerja Harian Agent

1. Buka tab **Dashboard** → **CLOCK IN** (absensi) → GPS mulai merekam rute otomatis. Di Android/iOS (dev client) tetap merekam walau app di-background/layar terkunci; di Web hanya selama tab terbuka.
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

## Backend (Supabase)

Postgres + Auth + Realtime + Storage. Migration ada di `supabase/migrations/` (`0001_init.sql` = schema/RLS/trigger/RPC, `0002_visit_media_storage.sql` = bucket foto/dokumen visit).

1. Buat project di [supabase.com](https://supabase.com), jalankan isi `0001_init.sql` lalu `0002_visit_media_storage.sql` di SQL Editor (berurutan).
2. Salin `.env.example` → `.env`, isi `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` (dari Project Settings → API). **Jangan commit `.env`.**
3. `npm run seed:supabase` — sekali jalan, membuat 8 akun demo + data contoh (reuse `src/store/seed.ts`).
4. Deploy Edge Function admin (wajib untuk fitur tambah-user/reset-password di layar Pengguna): `npx supabase functions deploy admin-users --project-ref <ref>` (lihat `supabase/functions/admin-users/index.ts`).

Login pakai username biasa di UI, di baliknya di-mapping ke email sintetis `{username}@internal.spc` lalu lewat Supabase Auth (`src/store/useStore.ts`).

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
index.ts                 # entry point; registrasi task background location
src/
  config.ts              # rate Option 3, radius geo valid, konstanta tracking/stop-detection, label
  types.ts                # model domain
  lib/supabase.ts         # klien Supabase (dipakai app)
  store/useStore.ts       # cache realtime di atas Supabase (zustand) — bukan lagi sumber data lokal
  store/seed.ts           # data demo; sekarang HANYA dipakai scripts/seed-supabase.ts, bukan runtime app
  tasks/locationTask.ts   # TaskManager.defineTask — perekaman GPS native, jalan walau app di-background
  utils/                  # csv, geo (haversine, detectStops), period, export, format
  components/             # UI kit, PeriodPicker, LeafletMap (peta via WebView), TrackingWatcher
  screens/                # 14 layar aplikasi (termasuk LiveMapScreen — "Peta Live")
supabase/
  migrations/0001_init.sql        # schema + RLS + trigger + RPC finish_visit
  functions/admin-users/index.ts  # Edge Function: create-user & reset-password (butuh service-role)
scripts/seed-supabase.ts          # seed 8 akun demo + data contoh ke Supabase
eas.json                          # profile build EAS (baru ada "development")
```

## Catatan & Pengembangan Lanjutan

Sudah selesai: backend Supabase (Postgres+Auth+Realtime), live tracking lintas device, dwell-time detection ("Titik Berhenti"), background location Android (native task, teruji di device fisik), foto/dokumen visit tersimpan di Supabase Storage (bucket `visit-media`, lihat `supabase/migrations/0002_visit_media_storage.sql`), pengambilan GPS yang tahan gangguan (timeout + fallback akurasi bertingkat di `src/utils/location.ts`), check-in visit yang mewajibkan clock-in aktif dan radius ≤300 m (`MerchantDetailScreen.tsx`/`VisitFlowScreen.tsx`), prompt in-app di tab Profil (field agent, Android) untuk keluar dari optimasi baterai OEM lewat `expo-intent-launcher`, profile build EAS `preview`/`production`, antrian offline untuk clock-in/out dan check-in/out visit (`src/utils/offlineQueue.ts` + `processPendingOps` di `useStore.ts`), `toggleUserActive`/`addTeam`/`assignMerchants` sekarang rollback + tampilkan dialog error kalau gagal tersimpan (dulu diam-diam/`console.warn` saja); `addUser`/`updateUser` sudah lebih dulu konsisten (mengembalikan pesan error yang ditampilkan pemanggil). **Fix bug RLS `profiles_select`**: dulu mensyaratkan `active = true` bahkan untuk super_admin/admin/client, yang bikin `toggleUserActive` gagal total di kedua arah (nonaktifkan → error RLS eksplisit karena hasilnya jadi tidak "terlihat" oleh policy SELECT-nya sendiri lewat mekanisme RETURNING; aktifkan lagi → gagal diam-diam karena user yang sudah nonaktif tidak ke-target sama sekali). Lihat komentar di `supabase/migrations/0001_init.sql` bagian `profiles_select`. `clockOut`/`finishVisit` juga sudah konsisten rollback+dialog kalau request *online*-nya sendiri ditolak server (sebelumnya cuma `console.warn`, beda dengan `clockIn`/`startVisit` yang sudah benar sejak awal) — superadmin juga tidak bisa lagi menonaktifkan akunnya sendiri lewat `toggleUserActive`.

Belum/sengaja di luar scope saat ini:
- **iOS background location** — config `app.json` (`UIBackgroundModes`, izin) sudah disiapkan tapi belum pernah di-build/dites (butuh Mac/Apple device).
- **Offline write queue** cakupannya sengaja dibatasi ke 4 aksi paling kritis (`clockIn`, `clockOut`, `startVisit`, `finishVisit`) — dideteksi via `@react-native-community/netinfo`, disimpan ke `AsyncStorage`, otomatis di-retry saat koneksi kembali (listener) maupun saat app dibuka lagi (`init()`). Edit field visit per-keystroke, `upsertMerchant`, `assignMerchants`, dan manajemen user **tidak** masuk antrian ini — kalau gagal karena offline, tetap gagal langsung dengan dialog error (lihat baris di atas). Kalau device offline lalu di-force-close/restart sebelum sempat sinkron, antrian tetap ada tapi rentan konflik kalau *user lain* login di device yang sama sebelum antrian kosong (payload menyimpan `userId`/`agentId` asli, RLS akan menolak replay atas nama user yang salah, bukan menulis ke akun yang salah — tapi item itu nyangkut di antrian sampai user aslinya login lagi). Butuh rebuild dev client (native module baru) sebelum bisa dites di device.
- **Prompt optimasi baterai** cuma tombol buka Settings (`IGNORE_BATTERY_OPTIMIZATION_SETTINGS`) — tidak mengecek status saat ini atau meminta exclude langsung (`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`) karena itu "special permission" yang diawasi ketat oleh kebijakan Play Store. Perlu rebuild dev client (native module baru, `expo-intent-launcher`) sebelum bisa dites di device.
- **eas.json** punya profile `development` (dev client, APK), `preview` (internal APK tanpa dev client, utk demo/UAT), dan `production` (Android App Bundle, `autoIncrement` versionCode) — jalankan lewat `npm run build:dev` / `build:preview` / `build:production`. Build `preview`/`production` **belum pernah dijalankan**; keduanya butuh env var Supabase dikonfigurasi lewat EAS (dashboard/`eas env:create`), bukan cuma `.env` lokal, karena `.env` tidak ikut ter-upload ke cloud build. `production` juga belum punya konfigurasi `eas submit` (signing/service account Play Store).
- Peta web memuat tile OpenStreetMap (butuh internet).
- Kepatuhan geo-fence absensi & validitas visit mengikuti definisi KPI RFP (valid attendance/valid visit).
