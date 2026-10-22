# 📖 Literasi Brebesan

**Live:** [literasibrebesan.my.id](https://literasibrebesan.my.id) · **Versi:** 5.0.1 · **Deploy:** Vercel Serverless (Astro 6 SSR)

Platform web komunitas literasi di Brebes: publikasi karya penulis lokal dengan alur moderasi, agenda kegiatan dengan penayangan terjadwal, dan galeri dokumentasi dari arsip Google Drive.

---

## 1. Tujuan Proyek

- Wadah terpusat publikasi tulisan penulis Brebes dengan alur moderasi admin.
- Pengelolaan agenda kegiatan komunitas (hanya 1 agenda tayang pada satu waktu, dengan penjadwalan otomatis).
- Dokumentasi visual kegiatan yang diarsipkan di Google Drive, ditampilkan lewat galeri ter-cache.
- Ruang kontribusi terbuka: pendaftaran akun penulis, submit draft, moderasi, penerbitan.

## 2. Fitur Berdasarkan Peran

### 👤 Pengunjung (Publik)
- Landing page (Hero, statistik, 3 artikel terbaru, galeri dokumentasi sorotan, profil komunitas).
- Arsip publikasi: pencarian realtime, filter kategori, paginasi.
- Halaman detail artikel SEO-ready (OpenGraph, sitemap dinamis).
- Galeri dokumentasi Google Drive dengan navigasi hirarki Tahun → Bulan → Kegiatan → Berkas.
- Form kontak dengan honeypot anti-bot dan pengiriman email via Resend.

### ✍️ Penulis (User, `role: "user"`)
- Daftar / masuk / reset kata sandi via email.
- Menulis draft artikel dengan rich text editor (upload gambar drag-and-drop ke ImageKit).
- Mengirimkan artikel untuk ditinjau (`status: "pending"`).
- Memantau status artikel: draft, pending, published, atau ditolak beserta alasan penolakan.
- Mengelola profil: nama, bio, Instagram, avatar.

### 👑 Admin (Pengelola, `role: "admin"`)
- Dasbor moderasi: menyetujui (→ `published`) atau menolak (→ `draft` + `rejectionReason`) artikel penulis.
- Membuat artikel yang langsung tayang tanpa moderasi.
- Mengelola agenda kegiatan (CRUD, poster, jadwal rilis otomatis, tombol tayangkan instan).
- Mengelola kategori artikel (dengan proteksi hapus kategori yang masih dipakai).
- Membuat / mengubah / menghapus akun pengguna dan promosi role.

## 3. Arsitektur & Alur Data

```text
Browser ──▶ src/middleware.ts ──▶ Pages (Astro SSR) ──▶ Server Actions ──▶ Services ──▶ Prisma ──▶ TiDB
                 │                     │                     │
                 │                     ├─ Preact Islands      ├─ ImageKit (upload/hapus gambar)
                 │                     │  (client:load)       └─ Resend (email)
                 └─ JWT verify / refresh rotation
```

### A. Autentikasi (Dual-Token, Rotasi Otomatis)
1. **Access token:** JWT HS256 (`jose`), payload `{ userId, role, fullName, avatarUrl }`, exp **2 jam**. Disimpan di cookie `access_token` (httpOnly, SameSite=Lax, maxAge **10 menit**).
2. **Refresh token:** UUID acak, disimpan di tabel `user_sessions`, berlaku **14 hari**. Cookie `refresh_token` (httpOnly).
3. **Rotasi:** `src/middleware.ts` mencoba verifikasi JWT → gagal/expired → lookup `refresh_session()` → terbitkan JWT baru + set cookie baru tanpa memaksa login ulang.
4. **Revoke:** ganti password, reset password, atau ubah role → semua session user dihapus (force relogin).

### B. Moderasi Artikel
```text
Penulis: draft ──submit──▶ pending ──(admin)──▶ published
                            │                      │
                            └──(admin reject)──▶ draft + rejectionReason (penulis revisi)
```
- Penulis tidak pernah bisa mem-publish sendiri: `posts.service.createPost()` memaksa `published → pending` jika `userRole !== "admin"`.
- Slug dibuat saat pertama disimpan dan **tidak berubah** saat update artikel yang sudah published (stabilitas URL SEO).
- Konten selalu disanitasi `sanitize-html` (tag img/h1/h2/blockquote diizinkan, skema http/https/data).

### C. Agenda (Invariant: Hanya 1 Agenda Tayang)
- Status: `draft` | `scheduled` | `published` | `archived`.
- **Konflik:** menerbitkan agenda baru saat masih ada agenda `published` → error `CONFLICT`, kecuali admin mencentang "Timpa Agenda" (agenda lama otomatis `archived`).
- **Penjadwalan:** `status: "scheduled"` + `publishAt` → cron `GET /api/cron/publish-agenda` menerbitkan saat waktunya tiba. Cron memakai *optimistic locking* (`updateMany` conditional claim dalam `$transaction`) supaya aman dari race condition antar eksekusi cron ganda.
- Cron dilindungi `Authorization: Bearer <CRON_SECRET>` (fail-closed: tanpa secret → selalu 401).

### D. Media (ImageKit CDN, Tanpa Disk Lokal)
- Semua unggahan (gambar artikel, poster agenda, avatar) → `uploadToImageKit()`. Folder:
  - Artikel: `/literasibrebesan/posts/<userId>/<YYYY-MM>`
  - Poster: `/literasibrebesan/agenda-posters`
  - Avatar: `/literasibrebesan/avatars/<userId>`
- Validasi server-side sebelum upload: magic bytes JPEG/PNG/WEBP + maks 3 MB (`src/shared/utils/image-validation.ts`).
- *Garbage collection:* hapus artikel/poster/avatar lama → `deleteFromImageKitByUrl()` (path-scoped whitelist + validasi nama file regex, gagal non-fatal).

### E. Arsip Dokumentasi (Google Drive API)
- Service account (JWT RS256, scope `drive.readonly`), token akses di-cache di DB (buffer −60 detik).
- Semua hasil listing folder/file di-cache ke tabel `drive_cache` (key SHA-256, TTL 1 jam).
- Hirarki arsip: ROOT → Tahun → Bulan → Kegiatan → Berkas, lewat `?yearId=&monthId=&activityId=`.
- Proxy gambar `GET /api/drive-image/[id]` menghindari CORS Google Drive.

## 4. Tech Stack

| Lapisan | Teknologi | Catatan |
| :--- | :--- | :--- |
| Framework | **Astro 6.0.x** (SSR `output: "server"`) | Adapter `@astrojs/vercel` |
| UI Interaktif | **Preact 10.x** (Astro Islands) | Komponen `.tsx` di `src/features/*`, `src/shared/ui/*` |
| Styling | **Tailwind CSS v4** | `@tailwindcss/vite` + `@tailwindcss/typography` |
| Database | **TiDB Cloud Serverless** (protokol MySQL) | Koneksi via `DATABASE_URL` |
| ORM | **Prisma 6.x** | Singleton di `src/lib/prisma.ts` |
| Media/CDN | **ImageKit.io** | Upload, optimasi real-time, auto WebP |
| Auth | **JWT (`jose`)** + refresh token DB | bcryptjs untuk hash password |
| Email | **Resend API** | Reset password, notifikasi kontak |
| Arsip docs | **Google Drive API** | Service account + cache DB |
| Testing | **Vitest** (jsdom) | Unit test service & utilitas |
| Runtime | Node.js (lokal) / Bun (build pipeline) | Perintah lokal selalu `npm` |

## 5. Struktur Proyek

```text
src/
├── actions/index.ts          # Agregasi semua Server Actions → export server
├── features/                 # Modul domain
│   ├── admin/                # UI moderasi & manajemen (Preact)
│   ├── agenda/               # Service, action, komponen agenda
│   ├── auth/                 # Auth service/actions, profil
│   ├── docs/                 # Google Drive + galeri dokumentasi
│   ├── home/                 # Hero, About, Stats, kontak
│   └── posts/                # Artikel, kategori, editor, publikasi
├── lib/prisma.ts             # Singleton PrismaClient (anti pool leak serverless)
├── pages/                    # File-based routing Astro
│   ├── admin/ user/ publikasi/ dokumentasi/ p/
│   ├── api/                  # upload-image, posts, agendas, drive-*, cron/*
│   └── (auth pages, kontak, logout, sitemap.xml.ts)
├── services/                 # Barrel export service (posts, auth, agenda)
├── shared/
│   ├── layouts/              # Layout, DashboardLayout, Header, Footer
│   ├── ui/                   # ActionFeedback, Pagination, Icon, ScrollToTop
│   └── utils/                # jwt, imagekit, image-validation, rate-limiter,
│                             # cron-auth, constants, utils
├── styles/global.css
├── test-mocks/astro.ts       # Mock astro:actions & astro:schema untuk Vitest
└── middleware.ts             # Guard auth & otorisasi rute

prisma/schema.prisma          # Skema DB (7 model)
scripts/                      # migrate-to-imagekit.ts, sync-db-imagekit.ts
```

## 6. Model Data (Ringkas)

| Model | Tabel | Peran |
| :--- | :--- | :--- |
| `User` | `users` | Kredensial login (email unik, password bcrypt, token reset) |
| `Profile` | `profiles` | Profil publik + **`role`** (`user`/`admin`), PK = `User.id` (shared PK 1:1) |
| `Category` | `categories` | Kategori artikel (slug unik) |
| `Post` | `posts` | Artikel: `draft`/`pending`/`published`, `rejectionReason`, slug unik nullable |
| `Agenda` | `agendas` | Kegiatan + `status` + `publishAt` (auto-publish) |
| `UserSession` | `user_sessions` | Refresh token + `expiresAt` (14 hari) |
| `DriveCache` | `drive_cache` | Cache JSON Google Drive + **dipakai juga rate limiter** (prefix `rl:`) |

## 7. Keamanan

- **Rate limiting berbasis DB** (`DatabaseRateLimiter`): sign-in 10×/15m per IP, register 5×/1j, forgot-password 5×/30m per IP + 3×/30m per email, reset-password 10×/15m. Kunci di-hash SHA-256, disimpan di `drive_cache`.
- **Defense in depth:** otorisasi admin dicek di middleware **dan** di dalam setiap server action admin.
- **Sanitisasi konten:** `sanitize-html` saat create/update post (anti XSS).
- **Validasi gambar:** magic bytes (JPEG/PNG/WEBP) + ukuran maks 3 MB, bukan sekadar cek MIME header.
- **Cookie:** httpOnly + SameSite=Lax, `secure` di produksi. Akses token berumur pendek (10 menit di cookie) + rotasi refresh token.
- **Cron:** Bearer `CRON_SECRET`, fail-closed.
- **Anti spam kontak:** honeypot field `hp` (bot yang mengisi → silent success).
- **GC media:** `deleteFromImageKitByUrl()` hanya menghapus file yang path-nya cocok whitelist folder (mencegah penghapusan asal-asalan).

## 8. Environment Variables

Lihat [`.env.example`](.env.example) untuk template lengkap.

| Variabel | Keterangan |
| :--- | :--- |
| `DATABASE_URL` | Koneksi MySQL protocol (TiDB). Format `mysql://user:pass@host:4000/db?sslaccept=strict` |
| `AUTH_SECRET` | Secret JWT HS256 (≥ 32 karakter acak) |
| `IMAGEKIT_PUBLIC_KEY` / `IMAGEKIT_PRIVATE_KEY` / `IMAGEKIT_URL_ENDPOINT` | Kredensial ImageKit |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Email reset password & kontak |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` / `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Arsip dokumentasi Drive |
| `CRON_SECRET` | Proteksi endpoint `/api/cron/*` |

> Catatan: `package.json` dan `prisma/schema.prisma` memakai **`DATABASE_URL` (MySQL/TiDB)** — variabel `POSTGRES_URL` tidak lagi dipakai.

## 9. Perintah Operasional

```bash
npm run dev              # Dev server Astro
npm test                 # Unit test Vitest
npm run build            # Build produksi
npm run migrate:imagekit # Migrasi foto lokal ke ImageKit (sekali jalan)
npm run sync:db-imagekit # Sinkronisasi referensi gambar DB ke ImageKit
npx prisma generate      # Regenerasi Prisma Client setelah ubah skema
```

## 10. Deployment (Vercel)

1. Pastikan semua environment variable di §8 terkonfigurasi di Vercel Project Settings.
2. Build command: `bun run build` (atau `npm run build`). Output serverless otomatis via `@astrojs/vercel`.
3. Cron job berjalan otomatis via blok `crons` di `vercel.json` (Vercel mengirim `Authorization: Bearer $CRON_SECRET` dari env project); fallback GitHub Actions tersedia di `.github/workflows/` dan memakai repository secret `CRON_SECRET` (**nilai harus sama** dengan env Vercel). Tanpa `CRON_SECRET` di Vercel, semua request cron ditolak 401 (fail-closed).
4. File bersifat **ephemeral** — jangan pernah menulis ke disk lokal di runtime produksi.

## 11. Catatan Implementasi

- **`drive_cache` ganda fungsi:** selain cache Google Drive, tabel ini menjadi penyimpanan rate limiter (entri prefix `rl:`). Cleanup otomatis berjalan 1% sampling per pengecekan.
- **Slug artikel:** `generateSlug()` menambahkan sufiks acak 5 karakter untuk menghindari konflik judul antar penulis.
- **Shortlink:** `/p/<postId>` redirect ke `/publikasi/<slug>` untuk artikel published.

Dokumen AI-agent utama: [`AGENTS.md`](AGENTS.md). Dokumen desain teknis: [`TECH_DESIGN.md`](TECH_DESIGN.md).
