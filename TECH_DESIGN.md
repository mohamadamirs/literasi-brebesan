# Technical Design Document - Literasi Brebesan (libes-main)

Dokumen ini merinci arsitektur teknis, tumpukan teknologi, dan desain sistem untuk proyek **Literasi Brebesan**.

## 1. Tumpukan Teknologi (Tech Stack)

| Komponen | Teknologi |
| :--- | :--- |
| **Runtime & Package Manager** | [Bun](https://bun.sh/) |
| **Framework Utama** | [Astro](https://astro.build/) (v6.x) |
| **UI Library (Islands)** | [Preact](https://preactjs.com/) |
| **Bahasa Pemrograman** | [TypeScript](https://www.typescriptlang.org/) |
| **Database** | [TiDB Cloud](https://en.pingcap.com/tidb/) (Distributed SQL / MySQL Protocol) |
| **ORM / Data Access** | [Prisma ORM](https://www.prisma.io/) (v6.x) |
| **Otentikasi & Keamanan** | JWT (`jose`), Refresh Token DB, In-Memory Rate Limiting |
| **Penyimpanan Media/Gambar** | [ImageKit.io](https://imagekit.io/) (Image CDN & Optimization) |
| **Penyimpanan Arsip Docs** | Google Drive API terintegrasi |
| **Styling** | Tailwind CSS v4 via `@tailwindcss/vite` |
| **Test Runner** | Vitest |

## 2. Arsitektur Sistem

Proyek ini menggunakan pola arsitektur **Islands Architecture** khas Astro dengan pemisahan tanggung jawab yang ketat:

### A. Middleware (`src/middleware.ts`)
Bertanggung jawab atas:
- Verifikasi keamanan pada setiap permintaan (request).
- Validasi JWT secara *stateless* (umur token 10 menit).
- Proteksi rute berdasarkan peran (Role-based Access Control):
    - `/admin/*`: Hanya untuk admin.
    - `/dashboard`, `/profile`: Hanya untuk pengguna terotentikasi.
- Redireksi otomatis jika pengguna tidak memiliki akses.

### B. Astro Actions (`src/actions/`)
Logika bisnis sisi server yang dipisahkan berdasarkan domain:
- `auth.ts`: Registrasi, login, logout, reset password (dilengkapi Rate Limiter).
- `posts.ts`: CRUD untuk artikel dan publikasi (termasuk auto-delete media ImageKit).
- `agenda.ts`: Pengelolaan jadwal kegiatan (termasuk Optimistic Locking pada Cron).
- `profile.ts`: Pembaruan informasi pengguna.

### C. Library & Utilitas (`src/lib/` & `src/shared/utils/`)
- `db.ts` / `prisma.ts`: Inisialisasi koneksi database Prisma.
- `googleDrive.ts`: Abstraksi API Google Drive.
- `imagekit.ts`: Singleton dan fungsi pembantu (upload/delete) untuk ImageKit API.
- `rate-limiter.ts`: Sliding-window limiter untuk proteksi *Brute-Force*.
- `cron-auth.ts`: Fail-closed security checker untuk endpoint Cron.

## 3. Infrastruktur Media & Storage

- **ImageKit.io (Media Aktif):** Menggantikan penyimpanan lokal dan Vercel Blob untuk performa *delivery* gambar yang optimal (CDN) dan manajemen *storage leak* yang kuat. Gambar yang tidak terpakai dari artikel, profil, atau agenda dihapus secara otomatis.
- **Google Drive (Arsip):** Digunakan untuk dokumentasi pasif (galeri foto kegiatan) tanpa membebani server utama, dilindungi oleh cache lokal dan proxy internal (`/api/drive-image/[id]`).

## 4. Model Data

Skema database didefinisikan secara relasional untuk mendukung fitur komunitas:

- **Users & Profiles:** Memisahkan data kredensial (email, password) dengan data publik (nama, bio, foto).
- **Posts:** Mendukung sistem kategori, slug unik untuk SEO, dan status publikasi (Draft/Published).
- **Agendas:** Menyimpan data kegiatan dengan detail waktu dan lokasi.

## 5. Struktur Folder Utama

```text
src/
├── actions/      # Logika server-side (Astro Actions)
├── components/   # UI Components (Astro & Preact)
│   ├── main/     # Komponen landing page
│   └── docs/     # Komponen galeri/arsip Drive
├── layouts/      # Template halaman utama
├── lib/          # Utilitas inti dan konfigurasi DB
└── pages/        # Definisi rute (file-based routing)
    ├── admin/    # Panel admin
    ├── api/      # Endpoint API internal
    └── publikasi/# Halaman konten publik
```

## 6. Alur Kerja Pengembangan

1. **Runtime:** Menggunakan [Bun](https://bun.sh/) sebagai JavaScript runtime dan package manager (`bun dev`, `bun run build`, `bun test`).
2. **Reproduction:** Selalu buat test case atau script reproduksi sebelum memperbaiki bug.
3. **Type Safety:** Pastikan semua data memiliki interface/type yang jelas.
4. **Performance:** Gunakan komponen Astro (static) sebanyak mungkin, dan gunakan Preact (client islands) hanya saat interaktivitas diperlukan.

## 7. Status Migrasi & Keamanan (Update Terbaru)

- **Database (TiDB):** Skema dan arsitektur telah sepenuhnya kompatibel dan berjalan di atas TiDB/Prisma MySQL Protocol.
- **Penyimpanan Media:** Migrasi penuh dari Vercel Blob ke **ImageKit.io** telah diselesaikan untuk manajemen media (*upload*, *auto-delete*, dan pengiriman via CDN).
- **Hardened Security:**
  - Token JWT dikonfigurasi secara *short-lived* (10 menit) dipadukan dengan *Force Session Revocation* saat perubahan role / reset password, menjamin pemutusan akses seketika.
  - Rate Limiter terpasang pada aksi autentikasi (Login, Register, Forgot Password) guna menahan *Brute-Force / DDoS*.
  - *Cron Jobs* diproteksi *Fail-Closed* dengan `CRON_SECRET` dan mengimplementasikan *Optimistic Locking* untuk mencegah *Race Condition* pada *serverless execution*.
