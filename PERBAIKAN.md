# Laporan Investigasi & Perbaikan

Dokumen ini berisi daftar error faktual yang ditemukan pada audit kode Literasi Brebesan
(v5.0.1) beserta status perbaikannya.

- Audit: 2026-10-22
- Branch: `fix/audit-critical-fixes`
- Verifikasi: `vitest run` (9 file / 74 test) + `astro build` (sukses) + probe test per temuan

Status enum: `SELESAI` = sudah diperbaiki & di-commit · `PROSES` = sedang dikerjakan ·
`TERJADI` = terkonfirmasi ada, belum diperbaiki · `PERLU-VERIFIKASI` = indikasi kuat, perlu
bukti runtime/DB.

---

## A. Publish Agenda

| ID | Sev | Temuan | Status | Commit |
| :-- | :-- | :-- | :-- | :-- |
| A1 | CRITICAL | Edit agenda berstatus `archived` selalu gagal: `AgendaStatusManager` tidak punya opsi `archived` sehingga tidak ada radio `status` yang tercentang → form submit tanpa field `status` → zod error `Invalid option: expected one of "draft"\|"published"\|"scheduled"\|"archived"`. `archived` dibuat otomatis oleh `quickPublishAgenda` & cron publish. | TERJADI | - |
| A2 | CRITICAL | `vercel.json` = `{}` → tidak ada blok `crons` → `GET /api/cron/publish-agenda` tidak pernah dieksekusi otomatis di production. Agenda `scheduled` tidak pernah tayang. | TERJADI | - |
| A3 | HIGH | `publish_at` dari `<input type="datetime-local">` (`2026-10-25T10:00`) tanpa offset → diasumsikan waktu server (Vercel = UTC) → admin WIB menjadwalkan 10:00 tetapi agenda tayang 17:00 WIB (7 jam telat). | TERJADI | - |
| A4 | HIGH | Agenda `published` dengan `eventDate` lampau tidak pernah tampil di publik: `getUpcomingAgendas` memfilter `status: "published"` **dan** `eventDate >= today`, `/api/agendas` juga `take: 1`. Publish sukses di DB tapi tidak muncul di beranda. | TERJADI | - |
| A5 | MEDIUM | Cron meng-archive agenda due yang lebih lama: `publish-agenda.ts` memilih `orderBy: { publishAt: "desc" }` (agenda due TERAKHIR) lalu meng-archive semua `scheduled` lain dengan `publishAt <= publishAt` terpilih → agenda tertua due hilang tanpa pernah tayang. | TERJADI | - |
| A6 | MEDIUM | GC poster lama ditulis sebelum data baru siap: `agenda.ts` hapus poster lama di ImageKit → upload poster baru → update DB. Upload/update DB gagal ⇒ DB menunjuk gambar terhapus (broken image) atau file baru orphan. | TERJADI | - |
| A7 | MEDIUM | Halaman admin create agenda punya markup korup: `src/pages/admin/agendas/create.astro:184-190` berakhir dengan `</script>d?.addEventListener('change', handleStatusChange);` + blok `</script>` kedua. Terbawa ke bundle production dan dirender sebagai tekssampah di halaman admin. | TERJADI | - |
| A8 | LOW | Dead code loading state di `create.astro`: script mengambil `submit-btn`, `btn-text`, `loading-spinner` yang tidak ada di markup → tidak ada efek. | TERJADI | - |
| A9 | MEDIUM | Invariant "hanya 1 agenda tayang" tidak ketat: `checkPublishedConflict` hanya menghitung `published` dengan `eventDate >= today` → agenda `published` berdate lampau tidak jadi konflik → DB bisa punya >1 `published`. | TERJADI | - |

---

## B. Titik Kritis Lainnya

| ID | Sev | Temuan | Status | Commit |
| :-- | :-- | :-- | :-- | :-- |
| B1 | CRITICAL | `RESEND_API_KEY` kosong → **seluruh aplikasi gagal boot**. `new Resend(undefined)` di module scope `src/features/home/contact.ts:7` throw `Error: Missing API key...`, dan `src/actions/index.ts` meng-import modul itu → semua route 500. | TERJADI | - |
| B2 | HIGH | `AUTH_SECRET` kosong → login/middleware mati tanpa pesan jelas. `jwt.ts:5-8` `new TextEncoder().encode(undefined)` = 0 byte → jose `DOMException: Zero-length key is not supported`. Tidak ada guard fail-fast. | TERJADI | - |
| B3 | HIGH | Notifikasi WhatsApp "artikel terbit" mengirim slug salah: `posts.ts` `slug: input.id` → link `literasibrebesan.my.id/publikasi/<postId>` → 404. | TERJADI | - |
| B4 | MEDIUM | `notifyArticleSubmitted` nama penulis selalu `"Penulis"`: memakai `(user as any).name \|\| (user as any).email`, padahal `locals.user` = `{id, role, fullName, avatarUrl}`. | TERJADI | - |
| B5 | MEDIUM | `notifyAgendaPublished` tidak pernah dipanggil (dead code) → notifikasi agenda terbit tidak dikirim. | TERJADI | - |
| B6 | MEDIUM | Preview editor render HTML mentah (`dangerouslySetInnerHTML` tanpa sanitasi client-side) → self-XSS di browser penulis. | TERJADI | - |
| B7 | MEDIUM | `set:html={post.content}` tanpa sanitasi ulang saat render (`publikasi/[slug].astro`, `admin/posts/[id].astro`). Aman selama write-path sanitize, tapi `scripts/sync-db-imagekit.ts:128` menulis `content` tanpa sanitize. | TERJADI | - |
| B8 | MEDIUM | `security.checkOrigin: false` di `astro.config.mjs` → proteksi CSRF Astro dimatikan; hanya tertahan SameSite=Lax cookie. | TERJADI | - |
| B9 | LOW | `api/posts.ts` tidak validasi `limit`/`offset` → `parseInt("abc")` = NaN → Prisma error 500; `limit` tanpa batas maksimum. | TERJADI | - |
| B10 | LOW | `posts.service.updatePost`/`deletePost` non-admin memakai `updateMany`/`deleteMany` tanpa cek `count` → UI menampilkan "sukses" padahal 0 baris berubah. | TERJADI | - |
| B11 | LOW | `auth.service.updateUser` tidak cek email duplikat → Prisma P2002 → 500 generik. | TERJADI | - |
| B12 | LOW | Dependency `marked` dan `sharp` tidak pernah di-import (dead dependency). | TERJADI | - |
| B13 | MEDIUM | `drive_cache` dipakai dua fungsi (cache Drive + rate limiter prefix `rl:`); cleanup `DELETE ... LIMIT 500` — kompatibilitas TiDB belum diverifikasi. | PERLU-VERIFIKASI | - |
| B14 | LOW | `.env.example` masih mendokumentasikan PostgreSQL/`POSTGRES_URL`, padahal schema memakai MySQL + `DATABASE_URL`. | TERJADI | - |
| B15 | LOW | GC ImageKit memakai `listFiles({ searchQuery: name="..." })` tanpa `limit` → default 10 hasil; file tak ketemu = storage leak. | TERJADI | - |

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
