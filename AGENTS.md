# 📖 Literasi Brebesan — Comprehensive AI Architecture & Context Guide

> **Petunjuk untuk AI Assistant (Antigravity, Cursor, Claude, Copilot):**
> Dokumen ini adalah acuan konteks menyeluruh (*Single Source of Truth*) untuk proyek **Literasi Brebesan**. Baca dokumen ini untuk memahami seluruh struktur berkas, arsitektur, domain logika, model database, alur data, dan pantangan teknis tanpa perlu menjelajahi seluruh repositori secara manual.

---

## 1. 📌 Identitas & Spesifikasi Proyek

* **Nama Proyek:** Literasi Brebesan (v5.0.1)
* **Domain Publik:** `literasibrebesan.my.id`
* **Deskripsi:** Platform web komunitas literasi di Brebes yang memfasilitasi publikasi karya penulis lokal, pengelolaan agenda literasi, dokumentasi galeri arsip Google Drive, dan panel moderasi artikel untuk admin.
* **Target Deploy:** **Vercel Serverless** (Wajib mematuhi kaidah *stateless & ephemeral filesystem*).

---

## 2. 🛠️ Tech Stack & Tooling

| Lapisan | Teknologi | Catatan Implementasi |
| :--- | :--- | :--- |
| **Framework Web** | **Astro 6.0.x** (Mode SSR) | Adapter `@astrojs/vercel` di `astro.config.mjs` |
| **UI Components** | **Preact 10.x** (Astro Islands) | Komponen interaktif di `src/features/*` dan `src/shared/ui/*` |
| **Styling** | **Tailwind CSS v4** | Via `@tailwindcss/vite` & `@tailwindcss/typography` |
| **Database** | **TiDB Cloud Serverless** | Protokol MySQL melalui koneksi `DATABASE_URL` |
| **ORM** | **Prisma 6.x** | Singleton client di `src/lib/prisma.ts` |
| **Media / CDN** | **ImageKit.io** | CDN optimasi gambar real-time & auto WebP (`src/shared/utils/imagekit.ts`) |
| **Auth & Security** | **JWT (`jose`)** + Refresh Token | Cookie HTTP-only, rate limiting in-memory, guard di `src/middleware.ts` |
| **Email Service** | **Resend API** | Reset password & notifikasi kontak (`src/features/auth/auth.ts`, `src/features/home/contact.ts`) |
| **Docs Storage** | **Google Drive API** | Service account + caching di DB model `DriveCache` (`src/features/docs/googleDrive.ts`) |
| **Testing** | **Vitest** | Unit test untuk services & utilities |
| **Package Engine** | **Node.js** (Lokal laptop pengguna) / **Bun** (Build pipeline) | Di lokal selalu gunakan perintah `npm` |

---

## 3. 📂 Granular Directory & File Dictionary (Katalog Berkas Lengkap)

### A. Root Files & Configurations
* [`astro.config.mjs`](file:///root/Project/Literasi_brebesan/astro.config.mjs): Konfigurasi Astro SSR dengan adapter Vercel, plugin Preact, dan Tailwind CSS v4 via Vite.
* [`package.json`](file:///root/Project/Literasi_brebesan/package.json): Definisi paket dependensi, scripts (`dev`, `build`, `test`, `migrate:imagekit`), dan overrides.
* [`tsconfig.json`](file:///root/Project/Literasi_brebesan/tsconfig.json): Konfigurasi TypeScript dengan path alias `@/*` mengarah ke `./src/*`.
* [`vitest.config.ts`](file:///root/Project/Literasi_brebesan/vitest.config.ts): Konfigurasi pengujian unit Vitest.
* [`vercel.json`](file:///root/Project/Literasi_brebesan/vercel.json): Konfigurasi rute dan deployment Vercel.
* [`prisma/schema.prisma`](file:///root/Project/Literasi_brebesan/prisma/schema.prisma): Definisi skema dan model basis data relasional.
* [`scripts/migrate-to-imagekit.ts`](file:///root/Project/Literasi_brebesan/scripts/migrate-to-imagekit.ts): Skrip CLI otomatis untuk mengunggah 176+ foto backup lokal ke CDN ImageKit dan membuat file manifest pemetaan URL.

---

### B. `src/actions/` (Astro Server Actions)
* [`src/actions/index.ts`](file:///root/Project/Literasi_brebesan/src/actions/index.ts): Titik agregasi Server Actions yang diekspor untuk Astro Form Mutations:
  * `auth`: `authActions` dari `src/features/auth/auth.ts`
  * `post`: `postActions` dari `src/features/posts/posts.ts`
  * `agenda`: `agendaActions` dari `src/features/agenda/agenda.ts`
  * `profile`: `profileActions` dari `src/features/auth/profile.ts`
  * `category`: `categoryActions` dari `src/features/posts/categories.ts`
  * `contact`: `contactActions` dari `src/features/home/contact.ts`

---

### C. `src/features/` (Modular Domain-Driven Modules)

#### 1. `features/admin/` (Panel Moderasi & Manajemen Pengelola)
* `AdminModal.tsx`: Komponen modal interaktif Preact untuk konfirmasi hapus, penolakan artikel, dan aksi admin.
* `AgendaStatusManager.tsx`: Komponen Preact untuk mengubah status publikasi agenda secara instan (draft, published, scheduled, archived).
* `ArticleCard.tsx`: Kartu moderasi artikel admin (menyetujui publikasi atau menolak dengan dialog alasan `rejectionReason`).
* `UserCard.tsx`: Komponen kartu data pengguna untuk pengelolaan akun.
* `UserRoleManager.tsx`: Komponen Preact untuk mengubah role pengguna (`user` ↔ `admin`).

#### 2. `features/agenda/` (Manajemen Kegiatan & Acara Komunitas)
* `agenda.service.ts`: Business logic CRUD agenda, filter kegiatan mendatang (*upcoming*) vs selesai (*past*), dan query Prisma.
* `agenda.ts`: Definisi server action `saveAgenda` (termasuk upload poster via `uploadToImageKit` dan pembersihan poster lama via `deleteFromImageKitByUrl`).
* `Agenda.astro`: Komponen Astro SSR untuk merender daftar agenda di halaman publik.
* `AgendaIsland.tsx`: Komponen Preact Island untuk navigasi tab interaktif agenda (Mendatang vs Arsip).
* `agenda.service.test.ts`: Unit test untuk validasi bisnis logic agenda.

#### 3. `features/auth/` (Autentikasi & Akun Pengguna)
* `auth.service.ts`: Layanan registrasi, login, verifikasi password bcrypt, pencatatan session refresh token di DB, rotasi token, dan reset token.
* `auth.ts`: Server Actions untuk `login`, `register`, `logout`, `requestPasswordReset`, dan `resetPassword`.
* `profile.ts`: Server Actions untuk update profil (`updateProfile`, `updateAvatar` dengan upload ke `/literasibrebesan/avatars` di ImageKit).
* `auth.service.test.ts` & `auth.actions.test.ts`: Pengujian unit untuk alur autentikasi dan otorisasi.

#### 4. `features/docs/` (Dokumentasi & Galeri Google Drive)
* `googleDrive.ts`: Modul integrasi Google Drive API via Service Account, traversal struktur folder, fetch metadata file, dan penyimpanan payload ke model `DriveCache`.
* `FileGallery.tsx`: Preact Island untuk galeri berkas gambar/dokumen dengan modal preview.
* `FolderGallery.tsx`: Preact Island untuk penjelajahan hierarki folder Google Drive.
* `FeaturedGallery.tsx`: Galeri dokumentasi sorotan untuk halaman muka.
* `GaleriGrid.astro`: Grid dokumen server-rendered.
* `Sidebar.astro`: Navigasi sidebar folder arsip.

#### 5. `features/home/` (Komponen Halaman Utama & Kontak)
* `Hero.astro`: Banner utama landing page berisi pengenalan komunitas dan call-to-action.
* `About.astro`: Bagian penjelasan visi, misi, dan latar belakang Literasi Brebesan.
* `Stats.astro`: Statistik dinamis (total publikasi, penulis aktif, agenda terlaksana).
* `CopyAccount.tsx`: Komponen Preact untuk tombol salin nomor rekening donasi/komunitas ke clipboard.
* `contact.ts`: Server Action `sendMessage` untuk pengiriman formulir kontak via Resend Email API.

#### 6. `features/posts/` (Publikasi, Artikel, & Editor)
* `posts.service.ts`: Layanan inti artikel: query prisma dengan paginasi, pencarian judul/konten, filter kategori, pembuatan slug otomatis yang ramah SEO, sanitisasi HTML via `sanitize-html`, dan *garbage collector* gambar ImageKit saat artikel dihapus.
* `posts.ts`: Server Actions untuk `createPost`, `updatePost`, `deletePost`, `approvePost`, dan `rejectPost`.
* `categories.ts`: Server Actions CRUD kategori artikel.
* `RichTextEditor.tsx`: Komponen Preact editor artikel lengkap dengan toolbar formatting Markdown/HTML, drag-and-drop / upload gambar via `/api/upload-image`, dan tab preview.
* `RichTextEditor.astro`: Astro wrapper island untuk RichTextEditor.
* `PublicationList.tsx`: Preact Island untuk daftar publikasi dengan pencarian real-time dan filter kategori.
* `LatestPosts.astro`: Menampilkan 3-6 artikel terbaru di landing page.
* `TitleEditor.tsx`: Komponen inline editor judul artikel.
* `UserPostCard.tsx`: Kartu artikel di dasbor penulis yang menampilkan status (`draft`, `published`, `rejected` beserta alasan penolakannya).
* `posts.service.test.ts`: Unit test untuk fungsi pemfilteran dan query artikel.

---

### D. `src/pages/` (Peta Rute & Halaman Lengkap)

#### 1. Rute Publik:
* `index.astro`: Landing page utama (Hero, Stats, LatestPosts, FeaturedGallery, About).
* `publikasi/index.astro`: Arsip publikasi karya penulis dengan filter kategori dan paginasi.
* `publikasi/[slug].astro`: Halaman detail artikel yang ramah SEO (SSR dengan OpenGraph metadata).
* `p/[id].astro`: Shortlink redirect / fallback rute berbasis ID artikel.
* `dokumentasi/index.astro`: Halaman galeri arsip dokumentasi Google Drive.
* `kontak.astro`: Halaman form kontak dan media sosial komunitas.
* `login.astro`, `register.astro`: Halaman form masuk dan pendaftaran akun.
* `forgot-password.astro`, `reset-password.astro`: Alur pemulihan kata sandi.
* `logout.ts`: Endpoint GET/POST untuk menghapus cookie JWT dan mencabut sesi di database.
* `sitemap.xml.ts`: Dynamic generator XML sitemap untuk search engine.

#### 2. Rute Penulis / Kontributor (`/user/*`):
* `dashboard.astro`: Rute pengarah otomatis (mengarahkan ke `/admin` jika user adalah admin, atau `/user` jika kontributor).
* `profile.astro`: Pengaturan profil akun (nama, bio, Instagram, ganti avatar ImageKit).
* `user/index.astro`: Dasbor penulis untuk memantau status artikel yang diajukan.
* `user/posts/create.astro`: Halaman form menulis draft artikel baru dengan `RichTextEditor`.
* `user/posts/edit/[id].astro`: Halaman edit draft artikel milik pengguna.

#### 3. Rute Panel Pengelola (`/admin/*`):
* `admin/index.astro`: Dasbor ringkasan admin (statistik postingan pending, agenda, user).
* `admin/posts/[id].astro`: Halaman peninjauan detail artikel untuk moderasi (Setujui / Tolak).
* `admin/posts/create.astro`: Admin membuat artikel yang langsung diterbitkan.
* `admin/posts/edit/[id].astro`: Admin mengedit postingan apa pun.
* `admin/agendas/create.astro` & `admin/agendas/[id].astro`: Pembuatan dan penyuntingan agenda kegiatan.
* `admin/categories/edit/[id].astro`: Manajemen kategori artikel.
* `admin/users/create.astro` & `admin/users/edit/[id].astro`: Manajemen peran user (promosi ke admin).

#### 4. Backend API Endpoints (`/api/*`):
* `api/upload-image.ts`: Endpoint POST upload gambar artikel langsung ke ImageKit (`/literasibrebesan/posts`).
* `api/agendas.ts`: Endpoint GET data JSON agenda untuk konsumsi client.
* `api/posts.ts`: Endpoint GET data JSON artikel untuk pencarian & filtering.
* `api/drive-files.ts`: API pengambil daftar berkas Google Drive per folder ID.
* `api/drive-image/[id].ts`: API streaming proxy gambar Google Drive untuk mencegah CORS.
* `api/drive-latest.ts`: API dokumen terbaru dari Google Drive.
* `api/drive-navigation.ts`: API pohon navigasi folder Google Drive.
* `api/cron/cleanup-sessions.ts`: Cron job pembersih token sesi kedaluwarsa dari tabel `user_sessions`.
* `api/cron/publish-agenda.ts`: Cron job otomatisasi publikasi agenda terjadwal (`status = "scheduled"` dan `publishAt <= NOW()`).

---

### E. `src/shared/` & `src/lib/` (Reusable Infrastructure)
* `src/lib/prisma.ts`: Singleton instance `PrismaClient` untuk mencegah *connection pool leak* di Vercel Serverless.
* `src/shared/layouts/Layout.astro`: Layout dasar HTML dengan konfigurasi `<head>`, meta tags, SEO, dan font Plus Jakarta Sans.
* `src/shared/layouts/DashboardLayout.astro`: Shell layout dasbor (`/admin` dan `/user`) dengan sidebar navigasi responsif.
* `src/shared/layouts/Header.astro` & `Footer.astro`: Navigasi global dan footer situs.
* `src/shared/ui/ActionFeedback.tsx`: Komponen notifikasi pop-up / toast feedback setelah eksekusi Action.
* `src/shared/ui/Pagination.astro`: Komponen navigasi nomor halaman.
* `src/shared/ui/Icon.astro`: Wrapper komponen ikon SVG.
* `src/shared/ui/ScrollToTop.tsx`: Tombol floating kembali ke atas halaman.
* `src/shared/utils/jwt.ts`: Generator dan verifikator token JWT menggunakan pustaka `jose`.
* `src/shared/utils/imagekit.ts`: Inisialisasi singleton ImageKit SDK, helper upload `uploadToImageKit()`, dan fungsi hapus `deleteFromImageKitByUrl()`.
* `src/shared/utils/rate-limiter.ts`: In-memory rate limiter untuk memproteksi endpoint autentikasi dari *brute force*.
* `src/shared/utils/cron-auth.ts`: Middleware validasi header `Authorization: Bearer <CRON_SECRET>` pada endpoint cron.
* `src/shared/utils/utils.ts`: Helper umum: format tanggal bahasa Indonesia, pembuatan slug, dan truncate string.
* `src/services/whatsapp.service.ts`: Integrasi WhatsApp gateway / format link pendaftaran agenda.

---

### F. `src/middleware.ts` (Routing Guard & Autentikasi)
Middleware ini mengintersepsi setiap request:
1. Mengekstrak cookie `auth_token`.
2. Jika token valid: Decode payload JWT dan pasang ke `context.locals.user`.
3. Jika token expired: Membaca cookie `refresh_token`, mencocokkan ke tabel `user_sessions`. Jika valid, otomatis menerbitkan token JWT baru (*token rotation*) tanpa memaksa user login ulang.
4. **Proteksi Akses:**
   * Jika rute dimulai dengan `/admin`, `/user`, atau `/dashboard` dan user belum login → Redirect ke `/login`.
   * Jika rute dimulai dengan `/admin` dan `user.role !== 'admin'` → Akses ditolak (redirect / 403).
   * Jika user sudah login mencoba membuka `/login` atau `/register` → Redirect otomatis ke `/dashboard`.

---

## 4. 🗄️ Skema Database (Prisma Models)

* **`User`** (`users`):
  * `id`: UUID (Primary Key, VarChar 36)
  * `email`: VarChar 255 (Unique)
  * `passwordHash`: Text
  * `resetToken`: VarChar 255 (Nullable)
  * `resetExpiry`: DateTime (Nullable)
  * Relasi: `Profile?`, `Post[]`, `UserSession[]`

* **`Profile`** (`profiles`):
  * `id`: FK ke `User.id` (Cascade Delete)
  * `fullName`: VarChar 255
  * `bio`: Text
  * `role`: VarChar 50 (Default: `"user"`, opsi: `"admin"`)
  * `instagram`: VarChar 100
  * `avatarUrl`: Text (Menyimpan URL ImageKit)

* **`Category`** (`categories`):
  * `id`: UUID (Primary Key)
  * `name`: VarChar 100
  * `slug`: VarChar 100 (Unique)
  * `description`: Text (Nullable)
  * Relasi: `Post[]`

* **`Post`** (`posts`):
  * `id`: UUID (Primary Key)
  * `title`: VarChar 255
  * `content`: LongText (Markdown / Sanitized HTML)
  * `status`: VarChar 50 (Default: `"draft"`, opsi: `"published"`, `"rejected"`)
  * `slug`: VarChar 255 (Unique, Nullable saat draft)
  * `userId`: FK ke `User.id`
  * `categoryId`: FK ke `Category.id` (SetNull on delete)
  * `rejectionReason`: Text (Catatan admin jika ditolak)

* **`Agenda`** (`agendas`):
  * `id`: UUID (Primary Key)
  * `title`: VarChar 255
  * `description`: Text
  * `eventDate`: Date
  * `eventTime`: VarChar 100
  * `location`: VarChar 255
  * `waLink`: VarChar 255 (Tautan WhatsApp pendaftaran)
  * `imageUrl`: Text (Poster kegiatan di ImageKit)
  * `status`: VarChar 50 (`"draft"`, `"published"`, `"scheduled"`, `"archived"`)
  * `publishAt`: DateTime (Nullable, untuk auto-publish via cron)

* **`UserSession`** (`user_sessions`):
  * `id`: UUID
  * `userId`: FK ke `User.id`
  * `refreshToken`: VarChar 500 (Unique)
  * `expiresAt`: DateTime

* **`DriveCache`** (`drive_cache`):
  * `key`: VarChar 255 (Primary Key)
  * `value`: Json
  * `expiresAt`: DateTime

---

## 5. ⚠️ Aturan Rekayasa & Pantangan Mutlak untuk AI (Engineering Rules)

1. ❌ **Pantangan Penyimpanan Berkas:**
   * **DILARANG KERAS** menulis kode upload yang menyimpan file ke disk lokal (`public/uploads/...`) di production. Vercel Serverless bersifat *ephemeral*. Seluruh media (avatar, poster, foto artikel) **wajib menggunakan `uploadToImageKit()`**.
2. ⚠️ **Akses Environment Variable yang Aman:**
   * Jangan gunakan `import.meta.env.KEY` secara mentah jika kode mungkin dijalankan di luar Vite (seperti skrip CLI Node.js). Selalu gunakan:
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
   * Sebelum menampilkan `post.content` ke halaman publik, selalu lewatkan ke `sanitize-html` untuk mencegah celah XSS.
6. 🗑️ **Pembersihan Berkas Media (*Garbage Collection*):**
   * Saat artikel dihapus, pastikan URL gambar ImageKit di dalam konten diekstrak dan dihapus dari CDN via `deleteFromImageKitByUrl()`.

---

## 6. ⌨️ Perintah Operasional (Commands)

```bash
# Menjalankan dev server Astro lokal
npm run dev

# Menjalankan pengujian unit
npm test

# Menjalankan migrasi berkas foto lokal ke ImageKit CDN
npm run migrate:imagekit

# Build proyek untuk deployment
npm run build

# Menghasilkan ulang Prisma Client setelah perubahan skema
npx prisma generate
```
