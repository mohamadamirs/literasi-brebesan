# Technical Design Document - Literasi Brebesan

Dokumen ini merinci arsitektur teknis, tumpukan teknologi, dan desain sistem untuk proyek **Literasi Brebesan** sesuai dengan kondisi aktual repositori saat ini.

## 1. Tumpukan Teknologi (Tech Stack)

| Komponen | Teknologi |
| :--- | :--- |
| **Runtime** | Node.js / Bun-compatible |
| **Framework Utama** | [Astro](https://astro.build/) |
| **UI Library (Islands)** | [Preact](https://preactjs.com/) |
| **Bahasa Pemrograman** | [TypeScript](https://www.typescriptlang.org/) |
| **Database** | MySQL-compatible database via Prisma, di konfigurasi untuk TiDB / MySQL protocol |
| **ORM / Data Access** | [Prisma ORM](https://www.prisma.io/) |
| **Otentikasi & Keamanan** | JWT (`jose`), refresh token DB, rate limiting, middleware auth |
| **Penyimpanan Media/Gambar** | [ImageKit.io](https://imagekit.io/) |
| **Penyimpanan Arsip Docs** | Google Drive API + cache internal |
| **Styling** | Tailwind CSS v4 via `@tailwindcss/vite` |
| **Test Runner** | Vitest |
| **Deployment Target** | Vercel |

## 2. Arsitektur Sistem

Proyek ini menggunakan pola arsitektur **Astro Islands** dengan pemisahan tanggung jawab yang jelas:

### A. Middleware autentikasi (`src/middleware.ts`)
Bertanggung jawab atas:
- Verifikasi akses token JWT dan flow refresh token.
- Menetapkan `locals.user` untuk setiap request.
- Mengizinkan atau menolak akses ke rute yang bersifat protected.
- Redirect otomatis untuk `/admin`, `/user`, `/dashboard`, dan halaman auth seperti `/login`.
- Menutup akses ke file SEO statis dan asset publik tertentu.

Prinsip amanannya adalah: jika user tidak valid dan rute protected, ia diarahkan ke login; jika route admin dan user bukan admin, akses ditolak.

### B. Server actions dan logika domain (`src/actions/index.ts`)
Aplikasi membangun kumpulan action server dari modul fitur. Struktur yang benar sesuai implementasi saat ini adalah:
- `authActions` dari `@/features/auth/auth`
- `postActions` dari `@/features/posts/posts`
- `agendaActions` dari `@/features/agenda/agenda`
- `profileActions` dari `@/features/auth/profile`
- `categoryActions` dari `@/features/posts/categories`
- `contactActions` dari `@/features/home/contact`

Fitur ini mencakup:
- registrasi, login, logout, reset password
- CRUD postingan dan kategori
- manajemen agenda
- update profil dan foto pengguna
- pengiriman kontak/feedback

### C. Modul fitur (`src/features/`)
Setiap domain dipisah menjadi feature module yang terorganisasi sendiri:
- `auth/`: login, session, reset password, profil
- `posts/`: artikel, kategori, editor, publikasi
- `agenda/`: agenda dan status publikasi
- `admin/`: UI dan komponen panel admin
- `docs/`: galeri, Google Drive, navigasi dokumentasi
- `home/`: halaman depan, hero, kontak, CTA

### D. Shared utilities dan layout (`src/shared/` dan `src/lib/`)
- `src/shared/layouts/`: layout umum untuk halaman publik dan dashboard
- `src/shared/ui/`: komponen UI reusable
- `src/shared/utils/`: helper keamanan, `jwt`, `imagekit`, `rate-limiter`, `cron-auth`
- `src/lib/prisma.ts`: inisialisasi Prisma Client

Catatan penting: beberapa utilitas yang disebutkan di dokumen lama berada di lokasi yang berbeda dari struktur lama. Implementasi yang benar saat ini menempatkan `imagekit` dan `rate-limiter` di `src/shared/utils`, serta Google Drive pada `src/features/docs/googleDrive.ts`.

## 3. Infrastruktur Media & Storage

- **ImageKit.io (Media Aktif):** Digunakan untuk upload, optimasi, dan delivery gambar melalui CDN. File yang tidak lagi dipakai dapat dihapus secara otomatis di sisi aplikasi.
- **Google Drive (Arsip Dokumen/Galeri):** Digunakan untuk arsip dokumen dan galeri visual. Data diambil melalui API, lalu diproses dan dipakai di halaman publik dan dokumentasi.
- **Public uploads:** Folder `public/uploads` dan asset statis seperti favicon, logo, dan gambar brand disimpan di folder publik untuk akses langsung.

## 4. Model Data

Skema database didefinisikan secara relasional di [prisma/schema.prisma](prisma/schema.prisma) dan mencakup entitas utama:

- **User:** data login dan identitas pengguna
- **Profile:** data profil publik pengguna seperti nama lengkap, bio, peran, avatar, Instagram
- **Category:** kategori publikasi
- **Post:** konten artikel/publikasi, status, slug, kategori, alasan penolakan
- **Agenda:** data kegiatan komunitas dengan tanggal, waktu, lokasi, link WhatsApp, status publikasi
- **UserSession:** sesi login dan refresh token
- **DriveCache:** cache untuk data Google Drive agar akses lebih efisien

## 5. Struktur Folder Utama

```text
src/
├── actions/                    # Kumpulan action server yang dipanggil oleh Astro
├── features/                  # Modul domain per fitur
│   ├── admin/
│   ├── agenda/
│   ├── auth/
│   ├── docs/
│   ├── home/
│   └── posts/
├── lib/                       # Utility inti / konfigurasi framework
│   └── prisma.ts
├── pages/                     # File-based routing Astro
│   ├── admin/
│   ├── api/
│   ├── publikasi/
│   ├── user/
│   └── ...
├── services/                  # Integrasi ke layanan eksternal
│   └── whatsapp.service.ts
├── shared/                    # Layout, komponen reusable, utility umum
│   ├── layouts/
│   ├── ui/
│   └── utils/
├── styles/                    # Global CSS
├── test-mocks/                # Mock data untuk testing
├── middleware.ts              # Gatekeeper autentikasi/otorisasi
└── ...

public/
├── assets/
├── fonts/
├── uploads/
├── robots.txt
├── favicon.ico
└── ...

prisma/
└── schema.prisma
```

## 6. Alur Kerja Pengembangan

1. **Development Runtime:** Proyek dapat dijalankan dengan Astro dan script npm (`npm run dev`, `npm run build`, `npm test`).
2. **Reproduction:** Sebelum memperbaiki bug, buat kasus reproduksi atau test yang memvalidasi masalah.
3. **Type Safety:** Gunakan TypeScript secara konsisten agar data dan API tetap aman.
4. **Performance:** Prioritaskan komponen Astro untuk rendering statis; Preact dipakai pada bagian interaktif yang memang perlu client island.
5. **Security-first:** Middleware, JWT, refresh session, dan rate limiting harus selalu diperhatikan saat memodifikasi rute autentikasi atau admin.

## 7. Status Implementasi & Keamanan Saat Ini

- **Database:** Skema Prisma sesuai kebutuhan aplikasi publikasi komunitas dan sistem role user/admin.
- **Media Management:** ImageKit telah diintegrasikan untuk penyimpanan dan delivery gambar.
- **Google Drive Archive:** Dapat dimanfaatkan untuk dokumentasi galeri, dengan endpoint API khusus seperti `drive-latest`, `drive-files`, dan `drive-navigation`.
- **Keamanan:**
  - JWT access token digunakan untuk autentikasi stateless.
  - Refresh token disimpan di DB dan dipakai untuk sesi yang aktif.
  - Middleware memeriksa otorisasi tiap request untuk rute admin dan user.
  - Rate limiter dipasang pada aksi autentikasi untuk menahan brute-force.
  - Cron endpoint dilindungi dengan mekanisme `cron-auth` untuk mencegah akses tidak sah.

## 8. Catatan Konsistensi Dokumentasi

Dokumen ini disusun agar konsisten dengan struktur repositori yang sesungguhnya. Beberapa istilah yang sebelumnya terlalu umum atau merujuk ke struktur lama telah disesuaikan agar mencerminkan implementasi nyata di proyek saat ini.
