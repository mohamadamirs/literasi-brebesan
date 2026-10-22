# 📖 Literasi Brebesan — Comprehensive AI Architecture & Context Guide

> **Petunjuk untuk AI Assistant (Antigravity, Cursor, Claude, Copilot, dll.):**
> Dokumen ini adalah acuan konteks menyeluruh (*Single Source of Truth*) untuk proyek **Literasi Brebesan**. Baca dokumen ini untuk memahami struktur berkas, arsitektur, domain logika, model database, alur data, dan pantangan teknis tanpa perlu menjelajahi seluruh repositori secara manual.

---

## 1. 📌 Identitas & Spesifikasi Proyek

* **Nama Proyek:** Literasi Brebesan (v5.0.1)
* **Domain Publik:** `literasibrebesan.my.id`
* **Deskripsi:** Platform web komunitas literasi di Brebes: publikasi karya penulis lokal dengan alur moderasi, pengelolaan agenda kegiatan dengan penayangan terjadwal, dokumentasi galeri arsip Google Drive, dan panel admin.
* **Target Deploy:** **Vercel Serverless** (wajib mematuhi kaidah *stateless & ephemeral filesystem*).
* **Path repositori:** `/root/Documents/literasi-brebesan`

---

## 2. 🛠️ Tech Stack & Tooling

| Lapisan | Teknologi | Catatan Implementasi |
| :--- | :--- | :--- |
| **Framework Web** | **Astro 6.0.x** (Mode SSR, `output: "server"`) | Adapter `@astrojs/vercel` di `astro.config.mjs` |
| **UI Components** | **Preact 10.x** (Astro Islands) | Komponen interaktif `.tsx` di `src/features/*` dan `src/shared/ui/*` |
| **Styling** | **Tailwind CSS v4** | Via `@tailwindcss/vite` & `@tailwindcss/typography` |
| **Database** | **TiDB Cloud Serverless** | Protokol MySQL melalui `DATABASE_URL` (format `mysql://...:4000/...?sslaccept=strict`) |
| **ORM** | **Prisma 6.x** | Singleton client di `src/lib/prisma.ts` |
| **Media / CDN** | **ImageKit.io** | CDN optimasi gambar real-time & auto WebP (`src/shared/utils/imagekit.ts`) |
| **Auth & Security** | **JWT (`jose`)** + Refresh Token DB | Cookie HTTP-only, rate limiter DB, guard di `src/middleware.ts` |
| **Email Service** | **Resend API** | Reset password & notifikasi kontak |
| **Docs Storage** | **Google Drive API** | Service account + caching di model `DriveCache` (`src/features/docs/googleDrive.ts`) |
| **Testing** | **Vitest** (jsdom) | Unit test services, utils, cron |
| **Package Engine** | **Node.js** (lokal) / **Bun** (build pipeline) | Di lokal selalu gunakan perintah `npm` |

---

## 3. 📂 Granular Directory & File Dictionary (Katalog Berkas Lengkap)

### A. Root Files & Configurations
* [`astro.config.mjs`](file:///root/Documents/literasi-brebesan/astro.config.mjs): Astro SSR + adapter Vercel, plugin Preact, Tailwind v4 via Vite, `security.checkOrigin: false`, remote image patterns (Vercel Blob, Drive).
* [`package.json`](file:///root/Documents/literasi-brebesan/package.json): Dependensi & scripts (`dev`, `build`, `test`, `migrate:imagekit`, `sync:db-imagekit`, `format`). Ada `overrides` untuk `astro`, `path-to-regexp`, `vite`, `htmlparser2`.
* [`tsconfig.json`](file:///root/Documents/literasi-brebesan/tsconfig.json): TypeScript strict, path alias `@/*` → `./src/*`.
* [`vitest.config.ts`](file:///root/Documents/literasi-brebesan/vitest.config.ts): Environment jsdom, alias `astro:actions` & `astro:schema` → `src/test-mocks/astro.ts`.
* [`bunfig.toml`](file:///root/Documents/literasi-brebesan/bunfig.toml): Konfigurasi Bun install (`backend = "copyfile"` untuk Prisma engines).
* [`vercel.json`](file:///root/Documents/literasi-brebesan/vercel.json): Konfigurasi deployment Vercel (kosong/minimal).
* [`prisma/schema.prisma`](file:///root/Documents/literasi-brebesan/prisma/schema.prisma): Skema DB relasional (7 model, lihat §4).
* [`scripts/migrate-to-imagekit.ts`](file:///root/Documents/literasi-brebesan/scripts/migrate-to-imagekit.ts): Skrip CLI migrasi foto backup lokal ke CDN ImageKit + manifest pemetaan URL.
* [`scripts/sync-db-imagekit.ts`](file:///root/Documents/literasi-brebesan/scripts/sync-db-imagekit.ts): Skrip sinkronisasi referensi gambar di DB ke ImageKit.

### B. `src/actions/` (Astro Server Actions)
* [`src/actions/index.ts`](file:///root/Documents/literasi-brebesan/src/actions/index.ts): Titik agregasi Server Actions, diekspor sebagai `server`:
  * `authActions` dari `src/features/auth/auth.ts`
  * `postActions` dari `src/features/posts/posts.ts`
  * `agendaActions` dari `src/features/agenda/agenda.ts`
  * `profileActions` dari `src/features/auth/profile.ts`
  * `categoryActions` dari `src/features/posts/categories.ts`
  * `contactActions` dari `src/features/home/contact.ts`

### C. `src/features/` (Modular Domain-Driven Modules)

#### 1. `features/admin/` (Panel Moderasi & Manajemen Pengelola)
* `AdminModal.tsx`: Modal konfirmasi hapus / tolak artikel.
* `AgendaStatusManager.tsx`: Ubah status publikasi agenda instan (draft, published, scheduled, archived).
* `ArticleCard.tsx`: Kartu moderasi artikel (approve / reject dengan dialog alasan `rejectionReason`).
* `UserCard.tsx`: Kartu data pengguna untuk manajemen akun.
* `UserRoleManager.tsx`: Ubah role pengguna (`user` ↔ `admin`).

#### 2. `features/agenda/` (Manajemen Kegiatan & Acara Komunitas)
* `agenda.service.ts`: Business logic CRUD agenda, filter upcoming vs archive, konflik single-published, `quickPublishAgenda`.
* `agenda.ts`: Server actions `saveAgenda`, `deleteAgenda`, `quickPublishAgenda` (upload poster ImageKit + GC poster lama).
* `Agenda.astro`: Komponen SSR daftar agenda halaman publik.
* `AgendaIsland.tsx`: Navigasi tab interaktif agenda (Mendatang vs Arsip).
* `agenda.service.test.ts`: Unit test business logic agenda.

#### 3. `features/auth/` (Autentikasi & Akun Pengguna)
* `auth.service.ts`: Registrasi, login (bcrypt), session `user_sessions`, refresh session, revoke, reset token, ganti password (revoke all sessions), CRUD user admin.
* `auth.ts`: Server actions `signIn`, `register`, `forgotPassword`, `resetPassword`, `createUser`, `updateUser`, `deleteUser` (semua admin-only kecuali 4 pertama).
* `profile.ts`: Server actions `updateProfile`, `updateAvatar` (upload `/literasibrebesan/avatars/<userId>` + GC avatar lama), `changePassword`.
* `auth.service.test.ts`, `auth.actions.test.ts`: Unit test alur auth & otorisasi.

#### 4. `features/docs/` (Dokumentasi & Galeri Google Drive)
* `googleDrive.ts`: Integrasi Drive API via service account JWT RS256, token access di-cache, traversal folder, cache payload ke `DriveCache` (key SHA-256).
* `FileGallery.tsx`: Galeri berkas dengan modal preview.
* `FolderGallery.tsx`: Penjelajahan hirarki folder Drive.
* `FeaturedGallery.tsx`: Galeri dokumentasi sorotan untuk halaman muka.
* `GaleriGrid.astro`: Grid dokumen server-rendered.
* `Sidebar.astro`: Navigasi sidebar folder arsip.

#### 5. `features/home/` (Komponen Halaman Utama & Kontak)
* `Hero.astro`: Banner utama landing page.
* `About.astro`: Visi, misi, latar belakang komunitas.
* `Stats.astro`: Statistik dinamis (total publikasi, penulis aktif, agenda terlaksana).
* `CopyAccount.tsx`: Tombol salin nomor rekening donasi ke clipboard.
* `contact.ts`: Server action `sendContact` (Resend + honeypot `hp`).

#### 6. `features/posts/` (Publikasi, Artikel, & Editor)
* `posts.service.ts`: Query Prisma dengan paginasi, pencarian judul/konten, filter kategori, slug otomatis dengan sufiks acak 5 karakter, sanitisasi HTML (`sanitize-options`), GC gambar ImageKit saat artikel dihapus.
* `posts.ts`: Server actions `createPost`, `updatePost`, `deletePost`, `approvePost`, `rejectPost`.
* `categories.ts`: Server actions `createCategory`, `updateCategory`, `deleteCategory` (proteksi hapus kategori yang masih dipakai).
* `RichTextEditor.tsx` / `RichTextEditor.astro`: Editor artikel lengkap, toolbar formatting, drag-and-drop / upload gambar via `/api/upload-image`, tab preview.
* `PublicationList.tsx`: Daftar publikasi dengan pencarian realtime + filter kategori.
* `CategoryScroll.tsx`: Scroll filter kategori horizontal.
* `LatestPosts.astro`: 3 artikel terbaru di landing page.
* `TitleEditor.tsx`: Inline editor judul artikel.
* `UserPostCard.tsx`: Kartu artikel dasbor penulis (status draft/pending/published/rejected + alasan penolakan).
* `posts.service.test.ts`: Unit test filter & query artikel.

### D. `src/pages/` (Peta Rute & Halaman Lengkap)

#### 1. Rute Publik
* `index.astro`: Landing page (Hero, Stats, LatestPosts, FeaturedGallery, About).
* `publikasi/index.astro`: Arsip publikasi dengan filter kategori + paginasi.
* `publikasi/[slug].astro`: Detail artikel SEO (OpenGraph).
* `p/[id].astro`: Shortlink redirect berbasis ID artikel.
* `dokumentasi/index.astro`: Galeri arsip dokumentasi Google Drive.
* `kontak.astro`: Form kontak + media sosial komunitas.
* `login.astro`, `register.astro`, `forgot-password.astro`, `reset-password.astro`: Halaman auth.
* `logout.ts`: Endpoint GET/POST hapus cookie + revoke session di DB.
* `sitemap.xml.ts`: Generator sitemap dinamis.

#### 2. Rute Penulis (`/user/*`)
* `dashboard.astro`: Redirect otomatis → `/admin` (jika admin) atau `/user`.
* `profile.astro`: Pengaturan profil (nama, bio, Instagram, ganti avatar).
* `user/index.astro`: Dasbor penulis — status artikel yang diajukan.
* `user/posts/create.astro`: Form menulis draft baru dengan `RichTextEditor`.
* `user/posts/edit/[id].astro`: Edit draft artikel milik pengguna.

#### 3. Rute Panel Pengelola (`/admin/*`)
* `admin/index.astro`: Dasbor ringkasan (statistik postingan pending, agenda, user).
* `admin/posts/[id].astro`: Peninjauan detail artikel (Setujui / Tolak).
* `admin/posts/create.astro`: Admin membuat artikel langsung published.
* `admin/posts/edit/[id].astro`: Admin mengedit postingan apa pun.
* `admin/agendas/create.astro` & `admin/agendas/[id].astro`: Buat / edit agenda kegiatan.
* `admin/categories/edit/[id].astro`: Manajemen kategori artikel.
* `admin/users/create.astro` & `admin/users/edit/[id].astro`: Manajemen akun & role.

#### 4. Backend API Endpoints (`/api/*`)
* `api/upload-image.ts`: POST upload gambar artikel ke ImageKit (`/literasibrebesan/posts/<userId>/<YYYY-MM>`), wajib login + validasi magic bytes.
* `api/agendas.ts`: GET JSON agenda untuk konsumsi client.
* `api/posts.ts`: GET JSON artikel untuk pencarian & filtering.
* `api/drive-files.ts`: GET daftar berkas Drive per folder ID.
* `api/drive-image/[id].ts`: Streaming proxy gambar Drive (anti-CORS).
* `api/drive-latest.ts`: GET dokumen gambar terbaru Drive.
* `api/drive-navigation.ts`: GET pohon navigasi folder Drive (hirarki tahun→bulan→kegiatan→berkas).
* `api/cron/cleanup-sessions.ts`: Cron pembersih session expired (`user_sessions`).
* `api/cron/publish-agenda.ts`: Cron publikasi agenda `scheduled` (`publishAt <= NOW()`), pakai optimistic locking `updateMany` claim dalam `$transaction`. Dilindungi Bearer `CRON_SECRET`.
* `api/cron/publish-agenda.test.ts`: Unit test logika cron.

### E. `src/shared/`, `src/lib/`, `src/services/`
* `src/lib/prisma.ts`: Singleton `PrismaClient` via `globalThis` (anti connection pool leak serverless).
* `src/shared/layouts/Layout.astro`: Layout dasar HTML + SEO + font Plus Jakarta Sans.
* `src/shared/layouts/DashboardLayout.astro`: Shell dasbor (`/admin` & `/user`) dengan sidebar responsif.
* `src/shared/layouts/Header.astro`, `Footer.astro`: Navigasi global & footer.
* `src/shared/ui/ActionFeedback.tsx`: Toast notifikasi setelah eksekusi Action.
* `src/shared/ui/Pagination.astro`, `Icon.astro`, `ScrollToTop.tsx`: Komponen UI reusable.
* `src/shared/utils/jwt.ts`: Sign JWT (`jose`, HS256, exp 2 jam) & `generateRefreshToken()`.
* `src/shared/utils/imagekit.ts`: Singleton ImageKit SDK, `uploadToImageKit()`, `deleteFromImageKitByUrl()` (path-scoped whitelist).
* `src/shared/utils/image-validation.ts`: Validasi magic bytes JPEG/PNG/WEBP + ukuran maks 3MB.
* `src/shared/utils/rate-limiter.ts`: `DatabaseRateLimiter` (storage di `drive_cache`, key SHA-256, prefix `rl:`) + `MemoryRateLimiter` (untuk test) + `getClientIp()`.
* `src/shared/utils/cron-auth.ts`: Validasi `Authorization: Bearer <CRON_SECRET>`, fail-closed.
* `src/shared/utils/constants.ts`: `CONTACT_INFO` (email, telepon, WhatsApp, Instagram, Facebook).
* `src/shared/utils/utils.ts`: `generateSlug` (dengan sufiks acak), `stripHtml`, `truncateText`, `formatDate` (id-ID).
* `src/services/index.ts`: Barrel export service.
* `src/test-mocks/astro.ts`: Mock modul `astro:actions` & `astro:schema` untuk Vitest.

---

## 4. 🗄️ Skema Database (Prisma Models)

* **`User`** (`users`): `id` UUID PK, `email` (unique), `passwordHash` Text, `resetToken`/`resetExpiry` nullable, relasi `Profile?`, `Post[]`, `UserSession[]`.
* **`Profile`** (`profiles`): `id` = `User.id` (shared PK 1:1, cascade), `fullName`, `bio`, **`role`** (`user`/`admin`), `instagram`, `avatarUrl` (URL ImageKit).
* **`Category`** (`categories`): `id` UUID PK, `name`, `slug` (unique), `description`, relasi `Post[]`.
* **`Post`** (`posts`): `id` UUID PK, `title`, `content` LongText (sanitized HTML), **`status`** (`draft`/`pending`/`published`), `slug` (unique, nullable), `userId` FK, `categoryId` FK (SetNull on delete), `rejectionReason`.
* **`Agenda`** (`agendas`): `id` UUID PK, `title`, `description`, `eventDate` (Date), `eventTime`, `location`, `waLink`, `imageUrl`, **`status`** (`draft`/`published`/`scheduled`/`archived`), `publishAt` (nullable, untuk cron).
* **`UserSession`** (`user_sessions`): `id`, `userId` FK, `refreshToken` (unique), `expiresAt`, index `userId`.
* **`DriveCache`** (`drive_cache`): `key` PK (String), `value` Json, `expiresAt`. **Catatan: tabel ini juga menjadi storage rate limiter dengan entri prefix `rl:`.**

---

## 5. ⚠️ Aturan Rekayasa & Pantangan Mutlak untuk AI

1. ❌ **Pantangan Penyimpanan Berkas:**
   * **DILARANG KERAS** menulis kode upload yang menyimpan file ke disk lokal (`public/uploads/...`) di production. Vercel Serverless bersifat *ephemeral*. Seluruh media (avatar, poster, foto artikel) **wajib menggunakan `uploadToImageKit()`**.
2. ⚠️ **Akses Environment Variable yang Aman:**
   * Jangan gunakan `import.meta.env.KEY` secara mentah jika kode mungkin dijalankan di luar Vite (skrip CLI Node.js). Selalu gunakan pola:
     ```ts
     const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : process.env;
     const value = env.KEY || process.env.KEY;
     ```
3. 🔒 **Validasi Otorisasi Ganda (*Defense in Depth*):**
   * Pengecekan peran admin tidak boleh hanya mengandalkan `middleware.ts`. Di dalam setiap Server Action admin, wajib lakukan validasi ulang:
     ```ts
     if (!user || user.role !== "admin") {
       throw new ActionError({ code: "UNAUTHORIZED", message: "Akses ditolak." });
     }
     ```
4. 📦 **Prisma Client Singleton:**
   * Jangan pernah membuat instance `new PrismaClient()` baru di sembarang file. Selalu impor singleton dari `@/lib/prisma`.
5. 🛡️ **Sanitisasi Konten:**
   * Sebelum menyimpan atau menampilkan `post.content`, selalu lewatkan ke `sanitize-html` dengan `sanitizeOptions` (lihat `posts.service.ts`) untuk mencegah XSS.
6. 🗑️ **Pembersihan Berkas Media (*Garbage Collection*):**
   * Saat artikel/poster/avatar dihapus atau diganti, ekstrak URL gambar ImageKit dan panggil `deleteFromImageKitByUrl(url, allowedFolder)`. Jangan hapus di luar folder yang di-whitelist.
7. 🔑 **Auth Dual-Token (Jangan Diubah Sepihak):**
   * Access token JWT (exp 2 jam, cookie 10 menit) + refresh token DB (14 hari). Rotasi token di `middleware.ts`. Setiap operasi yang mengubah password atau role **wajib** revoke semua session (`userSession.deleteMany`).
8. ⏰ **Cron Protection:**
   * Endpoint `/api/cron/*` wajib memanggil `verifyCronRequest(request)` di awal handler. Jangan implementasi auth cron dengan cara lain.
9. ✅ **Validasi Gambar (Magic Bytes):**
   * Setiap endpoint/action yang menerima file `File` harus memanggil `validateImageFile()` (magic bytes + ukuran), bukan sekadar cek `file.type`.
10. 🧪 **Testing:**
    * Test dengan Vitest, environment jsdom. Modul `astro:actions`/`astro:schema` di-mock via `src/test-mocks/astro.ts` (sudah dikonfigurasi di `vitest.config.ts`). Jangan menambah framework test baru.

---

## 6. 🔑 Detail Kritis Auth (Paling Sering Salah Paham)

* **Cookie names:** `access_token` (JWT) dan `refresh_token` (UUID di DB `user_sessions`) — **bukan** `auth_token`.
* **Alur middleware** (`src/middleware.ts`):
  1. Bypass `sitemap.xml`, `robots.txt`, `favicon.ico`.
  2. Verifikasi `access_token` → sukses: set `locals.user` `{id, role, fullName, avatarUrl}`.
  3. Gagal/expired: hapus cookie access, coba `refreshSession(refresh_token)` → sukses: terbitkan JWT baru + set cookie baru (rotasi tanpa login ulang). Gagal: hapus cookie refresh.
  4. Gate rute: `/admin` → wajib `role === "admin"` (else redirect `/login?error=unauthorized` + hapus cookies). `/user` jika admin → redirect `/admin`. Protected (`/admin`, `/user`, `/dashboard`) tanpa user → `/login`. Auth page (`/login`, `/register`) dengan user aktif → `/dashboard`.
* **Revoke session terjadi pada:** `changePassword`, `resetPassword`, `updateUser` (saat password/role berubah).
* **Post status sebenarnya:** `draft` | `pending` | `published`. Penulis selalu dipaksa ke `pending` saat submit published. Admin bisa langsung `published`. Reject admin → kembalikan ke `draft` + isi `rejectionReason`.
* **Slug stabil:** saat update, slug hanya digenerate ulang jika status sebelumnya `draft`. Artikel published tidak berubah URL-nya.

---

## 7. ⌨️ Perintah Operasional (Commands)

```bash
# Dev server Astro lokal
npm run dev

# Pengujian unit (Vitest)
npm test

# Build proyek untuk deployment
npm run build

# Regenerasi Prisma Client setelah perubahan skema
npx prisma generate

# Migrasi foto lokal ke ImageKit CDN (sekali jalan)
npm run migrate:imagekit

# Sinkronisasi referensi gambar DB ke ImageKit
npm run sync:db-imagekit

# Format kode
npm run format
```
