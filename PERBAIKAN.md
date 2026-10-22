# Laporan Investigasi & Perbaikan

Dokumen ini berisi daftar error faktual yang ditemukan pada audit kode Literasi Brebesan
(v5.0.1) beserta status perbaikannya.

- Audit: 2026-10-22
- Branch: `fix/audit-critical-fixes`
- Verifikasi: `vitest run` (15 file / 108 test) + `astro build` (sukses) + probe test per temuan

Status enum: `SELESAI` = sudah diperbaiki & di-commit · `PROSES` = sedang dikerjakan ·
`TERJADI` = terkonfirmasi ada, belum diperbaiki · `PERLU-VERIFIKASI` = indikasi kuat, perlu
bukti runtime/DB.

---

## A. Publish Agenda

| ID | Sev | Temuan | Status | Commit |
| :-- | :-- | :-- | :-- | :-- |
| A1 | CRITICAL | Edit agenda berstatus `archived` selalu gagal: `AgendaStatusManager` tidak punya opsi `archived` sehingga tidak ada radio `status` yang tercentang → form submit tanpa field `status` → zod error `Invalid option: expected one of "draft"\|"published"\|"scheduled"\|"archived"`. `archived` dibuat otomatis oleh `quickPublishAgenda` & cron publish. | SELESAI | 41f40c0 |
| A2 | CRITICAL | `vercel.json` = `{}` → tidak ada blok `crons` → `GET /api/cron/publish-agenda` tidak pernah dieksekusi otomatis di production. Agenda `scheduled` tidak pernah tayang. | SELESAI | 89f28b9 |
| A3 | HIGH | `publish_at` dari `<input type="datetime-local">` (`2026-10-25T10:00`) tanpa offset → diasumsikan waktu server (Vercel = UTC) → admin WIB menjadwalkan 10:00 tetapi agenda tayang 17:00 WIB (7 jam telat). | SELESAI | baaddd1 |
| A4 | HIGH | Agenda `published` dengan `eventDate` lampau tidak pernah tampil di publik: `getUpcomingAgendas` memfilter `status: "published"` **dan** `eventDate >= today`, `/api/agendas` juga `take: 1`. Publish sukses di DB tapi tidak muncul di beranda. | SELESAI | 2959e59 |
| A5 | MEDIUM | Cron meng-archive agenda due yang lebih lama: `publish-agenda.ts` memilih `orderBy: { publishAt: "desc" }` (agenda due TERAKHIR) lalu meng-archive semua `scheduled` lain dengan `publishAt <= publishAt` terpilih → agenda tertua due hilang tanpa pernah tayang. | SELESAI | 2959e59 |
| A6 | MEDIUM | GC poster lama ditulis sebelum data baru siap: `agenda.ts` hapus poster lama di ImageKit → upload poster baru → update DB. Upload/update DB gagal ⇒ DB menunjuk gambar terhapus (broken image) atau file baru orphan. | SELESAI | 801abe2 |
| A7 | MEDIUM | Halaman admin create agenda punya markup korup: `src/pages/admin/agendas/create.astro:184-190` berakhir dengan `</script>d?.addEventListener('change', handleStatusChange);` + blok `</script>` kedua. Terbawa ke bundle production dan dirender sebagai tekssampah di halaman admin. | SELESAI | 4acdf93 |
| A8 | LOW | Dead code loading state di `create.astro`: script mengambil `submit-btn`, `btn-text`, `loading-spinner` yang tidak ada di markup → tidak ada efek. | SELESAI | 4acdf93 |
| A9 | MEDIUM | Invariant "hanya 1 agenda tayang" tidak ketat: `checkPublishedConflict` hanya menghitung `published` dengan `eventDate >= today` → agenda `published` berdate lampau tidak jadi konflik → DB bisa punya >1 `published`. | SELESAI | 2959e59 |

---

## B. Titik Kritis Lainnya

| ID | Sev | Temuan | Status | Commit |
| :-- | :-- | :-- | :-- | :-- |
| B1 | CRITICAL | `RESEND_API_KEY` kosong → **seluruh aplikasi gagal boot**. `new Resend(undefined)` di module scope `src/features/home/contact.ts:7` throw `Error: Missing API key...`, dan `src/actions/index.ts` meng-import modul itu → semua route 500. | SELESAI | 895da46 |
| B2 | HIGH | `AUTH_SECRET` kosong → login/middleware mati tanpa pesan jelas. `jwt.ts:5-8` `new TextEncoder().encode(undefined)` = 0 byte → jose `DOMException: Zero-length key is not supported`. Tidak ada guard fail-fast. | SELESAI | f9d0bd6 |
| B3 | HIGH | Notifikasi WhatsApp "artikel terbit" mengirim slug salah: `posts.ts` `slug: input.id` → link `literasibrebesan.my.id/publikasi/<postId>` → 404. | TIDAK BERLAKU — integrasi WA dihapus | ffe82a8 |
| B4 | MEDIUM | `notifyArticleSubmitted` nama penulis selalu `"Penulis"`: memakai `(user as any).name \|\| (user as any).email`, padahal `locals.user` = `{id, role, fullName, avatarUrl}`. | TIDAK BERLAKU — integrasi WA dihapus | ffe82a8 |
| B5 | MEDIUM | `notifyAgendaPublished` tidak pernah dipanggil (dead code) → notifikasi agenda terbit tidak dikirim. | TIDAK BERLAKU — integrasi WA dihapus | ffe82a8 |
| B6 | MEDIUM | Preview editor render HTML mentah (`dangerouslySetInnerHTML` tanpa sanitasi client-side) → self-XSS di browser penulis. | SELESAI | 92b6174 |
| B7 | MEDIUM | `set:html={post.content}` tanpa sanitasi ulang saat render (`publikasi/[slug].astro`, `admin/posts/[id].astro`). Aman selama write-path sanitize, tapi `scripts/sync-db-imagekit.ts:128` menulis `content` tanpa sanitize. | SELESAI | cef225c |
| B8 | MEDIUM | `security.checkOrigin: false` di `astro.config.mjs` → proteksi CSRF Astro dimatikan; hanya tertahan SameSite=Lax cookie. | SELESAI | f409ca0 |
| B9 | LOW | `api/posts.ts` tidak validasi `limit`/`offset` → `parseInt("abc")` = NaN → Prisma error 500; `limit` tanpa batas maksimum. | SELESAI | 11ce7c2 |
| B10 | LOW | `posts.service.updatePost`/`deletePost` non-admin memakai `updateMany`/`deleteMany` tanpa cek `count` → UI menampilkan "sukses" padahal 0 baris berubah. | SELESAI | 961c5ca |
| B11 | LOW | `auth.service.updateUser` tidak cek email duplikat → Prisma P2002 → 500 generik. | SELESAI | ec8e8a7 |
| B12 | LOW | Dependency `marked` dan `sharp` tidak pernah di-import (dead dependency). | SELESAI | ff8cea7 |
| B13 | MEDIUM | `drive_cache` dipakai dua fungsi (cache Drive + rate limiter prefix `rl:`); cleanup `DELETE ... LIMIT 500` — kompatibilitas TiDB belum diverifikasi. | SELESAI | 0abfa62 |
| B14 | LOW | `.env.example` masih mendokumentasikan PostgreSQL/`POSTGRES_URL`, padahal schema memakai MySQL + `DATABASE_URL`. | SELESAI | ff8cea7 |
| B15 | LOW | GC ImageKit memakai `listFiles({ searchQuery: name="..." })` tanpa `limit` → default 10 hasil; file tak ketemu = storage leak. | SELESAI | e5b21f8 |

---

## C. Terverifikasi Benar (tidak diubah)

- Ownership artikel di `user/posts/edit/[id].astro` (filter `userId`) dan `updateMany` scoped `userId` → tidak ada IDOR.
- `profile.astro` guard login; `logout.ts` revoke session + hapus cookie; `user/index.astro` scoped `user.id`.
- Rotasi refresh token + revoke-all-session saat ganti password/role.
- ImageKit path-whitelist saat hapus media.
- Validasi magic byte + ukuran pada seluruh upload.

---

## D. Catatan Verifikasi

- `npm install` gagal di repo ini: `devDependencies` pin `@esbuild/linux-x64` / `@rollup/rollup-linux-x64-gnu` / `@tailwindcss/oxide-linux-x64-gnu` → `EBADPLATFORM` di mesin arm64.
- `/root/Documents` adalah mount f2fs (Android shared storage) tanpa izin exec → binary `node_modules` gagal dijalankan (`EACCES`).
- Sandbox verifikasi: `/tmp/opencode/lb` (salinan repo + `npm install --force`).
- Tidak ada `DATABASE_URL`/MySQL lokal → perilaku query DB diuji lewat mock Prisma, bukan DB nyata.

---

## E. Keputusan Produk

- **Integrasi WhatsApp Gateway dihapus** (permintaan pemilik): file `src/services/whatsapp.service.ts` dihapus, pemanggilan di `src/features/posts/posts.ts` & `src/features/home/contact.ts` dibuang, export barrel `src/services/index.ts` diperbarui, env `WA_GATEWAY_*`/`WA_ADMIN_PHONE` dihapus dari `.env.example`, dan dokumentasi (`README.md`, `AGENTS.md`, `TECH_DESIGN.md`) diperbarui.
- **Tetap dipertahankan:** link WhatsApp sosial di `CONTACT_INFO.whatsapp` (`wa.me/...`) dan tombol share WhatsApp di halaman artikel — itu tautan kontak, bukan integrasi gateway.
- Temuan **B3/B4/B5** tidak lagi relevan karena kodenya dihapus.
- **`sharp` dipertahankan** (tidak ikut dihapus di B12): dipakai `astro:assets` untuk memproses gambar lokal (`src/assets/logo.webp`); `marked` yang benar-benar mati sudah dihapus dari `package.json` + `bun.lock`.

---

## F. Temuan Tambahan dari Perbaikan

| ID | Sev | Temuan | Status | Commit |
| :-- | :-- | :-- | :-- | :-- |
| B16 | MEDIUM | GC ImageKit selalu dilewati bila `IMAGEKIT_URL_ENDPOINT` sudah memuat segmen folder (mis. `https://ik.imagekit.io/literasibrebesan`): path whitelist dihitung dari `endpointPath + folderPath` → prefiks ganda (`/literasibrebesan/literasibrebesan/...`) tidak pernah cocok, file tidak pernah terhapus. | SELESAI | e5b21f8 |
