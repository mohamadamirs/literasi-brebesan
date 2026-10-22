# Laporan Investigasi & Perbaikan

Dokumen ini berisi daftar error faktual yang ditemukan pada audit kode Literasi Brebesan
(v5.0.1) beserta status perbaikannya.

- Audit: 2026-10-22
- Branch: `fix/audit-critical-fixes`
- Verifikasi: `vitest run` (15 file / 116 test) + `astro build` (sukses) + probe test per temuan

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
| B10 | LOW | `posts.service.updatePost`/`deletePost` non-admin memakai `updateMany`/`deleteMany` tanpa cek `count` → UI menampilkan "sukses" padahal 0 baris berubah. Cek `count` di service baru berefek setelah action-nya diperbaiki di **R2**. | SELESAI | 961c5ca |
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

## D2. Verifikasi Production (2026-10-22)

Catatan: 401 dari `/api/cron/*` **tidak** membuktikan secret terpasang — `verifyCronRequest` fail-closed mengembalikan 401 yang sama saat secret kosong maupun salah.

Status cron: `CRON_SECRET` **sudah ada** di Vercel project env. Jalur cron tunggal = cron bawaan Vercel lewat `vercel.json` (publish-agenda harian 00:00 UTC, cleanup-sessions 03:00 UTC). Fallback GitHub Actions dihapus (2026-10-22) beserta repository secret `CRON_SECRET` & variable `APP_BASE_URL` — tidak ada lagi nilai secret yang harus disinkronkan antar dua tempat.

Konsekuensi jadwal harian **sudah ditutup** oleh temuan **R4** (`062bf5e`): `GET /api/agendas` ikut memicu `agendaService.promoteDueAgenda()`, jadi agenda `scheduled` tayang pada pembacaan publik pertama setelah `publish_at` lewat (cron harian tinggal menjadi jaring pengaman bila tidak ada trafik). Presisi tayang jadi beberapa detik, bukan ±1 hari.

| Cek (kode yang sekarang live, sebelum PR ini) | Hasil | Catatan |
| :-- | :-- | :-- |
| `GET /` | 200 | Halaman muka normal |
| `GET /publikasi` | 200 | Arsip publikasi normal |
| `GET /api/posts?limit=9` | 200 | JSON artikel tampil |
| `GET /api/posts?limit=abc` | **500** | Bukti langsung temuan **B9** (NaN → Prisma error) — sudah diperbaiki di 11ce7c2 |
| `GET /api/posts?limit=999` | 200 | Tanpa batas maksimum (bagian B9) — sudah diperbaiki di 11ce7c2 |
| `GET /api/cron/publish-agenda` tanpa token | 401 `Unauthorized` | Fail-closed bekerja (bukan bukti secret terpasang) |
| `GET /api/cron/cleanup-sessions` tanpa token | 401 `Unauthorized` | Sama |
| `GET /sitemap.xml` | 200 | Sitemap dinamis normal |
| `GET /api/agendas` | 200 `null` | By design: tidak ada agenda `published` saat ini (`agendas[0] \|\| null`) |

Catatan: perilaku fix di PR ini baru bisa diverifikasi di production setelah merge + deploy.

### Menjalankan cron manual (tanpa GitHub Actions)

```bash
curl -i -H "Authorization: Bearer <CRON_SECRET dari Vercel env>" \
  https://literasibrebesan.my.id/api/cron/publish-agenda   # harus 200, bukan 401
```

---

## E. Keputusan Produk

- **Integrasi WhatsApp Gateway dihapus** (permintaan pemilik): file `src/services/whatsapp.service.ts` dihapus, pemanggilan di `src/features/posts/posts.ts` & `src/features/home/contact.ts` dibuang, export barrel `src/services/index.ts` diperbarui, env `WA_GATEWAY_*`/`WA_ADMIN_PHONE` dihapus dari `.env.example`, dan dokumentasi (`README.md`, `AGENTS.md`, `TECH_DESIGN.md`) diperbarui.
- **Tetap dipertahankan:** link WhatsApp sosial di `CONTACT_INFO.whatsapp` (`wa.me/...`) dan tombol share WhatsApp di halaman artikel — itu tautan kontak, bukan integrasi gateway.
- Temuan **B3/B4/B5** tidak lagi relevan karena kodenya dihapus.
- **`sharp` dipertahankan** (tidak ikut dihapus di B12): dipakai `astro:assets` untuk memproses gambar lokal (`src/assets/logo.webp`); `marked` yang benar-benar mati sudah dihapus dari `package.json` + `bun.lock`.
- **Agenda due dipromosikan saat dibaca** (R4): cron harian tetap menjadi jalur utama, tetapi `/api/agendas` juga memanggil `promoteDueAgenda()` supaya `publish_at` tidak telat sampai sehari karena batas cron plan Hobby. Biaya: satu query tambahan (`findFirst` agenda due) per pembacaan agenda publik; penulisan hanya terjadi saat benar-benar ada agenda due.

---

## F. Temuan Tambahan dari Perbaikan

| ID | Sev | Temuan | Status | Commit |
| :-- | :-- | :-- | :-- | :-- |
| B16 | MEDIUM | GC ImageKit selalu dilewati bila `IMAGEKIT_URL_ENDPOINT` sudah memuat segmen folder (mis. `https://ik.imagekit.io/literasibrebesan`): path whitelist dihitung dari `endpointPath + folderPath` → prefiks ganda (`/literasibrebesan/literasibrebesan/...`) tidak pernah cocok, file tidak pernah terhapus. Perbaikannya sempat menimbulkan regresi **R1**. | SELESAI | e5b21f8 |

---

## G. Temuan dari Review PR (lanjutan audit)

| ID | Sev | Temuan | Status | Commit |
| :-- | :-- | :-- | :-- | :-- |
| R1 | MEDIUM | **Regresi B16.** Whitelist GC memakai `pathname.endsWith("/<folder>/<file>")` → file artikel yang di-upload ke `/literasibrebesan/posts/<userId>/<YYYY-MM>/` tidak pernah cocok dengan folder induk `literasibrebesan/posts/<userId>` → gambar artikel tidak pernah dihapus (storage leak). | SELESAI | b150a6e |
| R2 | LOW | `deletePost` action mengabaikan hasil `postsService.deletePost` → cek `deleted.count > 0` (B10) tidak berefek, non-pemilik tetap melihat "berhasil". `updatePost` juga memetakan "Post not found" ke `INTERNAL_SERVER_ERROR` generik. | SELESAI | dd47a5a |
| R3 | LOW | Input `publish_at` di form edit agenda memakai `value` tanpa `onChange` → Preact menulis ulang `dom.value` setiap re-render, tanggal yang sudah diketik admin hilang begitu radio status diklik. | SELESAI | fc6f683 |
| R4 | MEDIUM | `publish_at` hanya diproses cron harian (plan Hobby: sekali sehari, presisi ±59 menit) → agenda terjadwal 10:00 WIB baru tayang ~07:00 WIB keesokan harinya, padahal A3 baru memperbaiki konversi WIB dan fallback GitHub Actions sudah dihapus. | SELESAI | 062bf5e |

Detail R4: logika promosi dipindah ke `agendaService.promoteDueAgenda()` (dipakai cron **dan** `/api/agendas`), tetap satu agenda per pemanggilan (`publish_at` paling awal, A5) dengan optimistic lock `updateMany`; publikasi manual mengisi `publishAt = sekarang` agar tidak ditimpa agenda due yang lebih lama. Kegagalan promosi di jalur baca tidak menggagalkan respons API.

### G2. Catatan review lanjutan (R5–R7)

| ID | Sev | Catatan | Status | Commit |
| :-- | :-- | :-- | :-- | :-- |
| R5 | LOW | `updateAgenda` mengosongkan `publishAt` saat status diubah ke `draft`/`archived` → jadwal yang sudah diisi harus diketik ulang. Kini `publishAt` hanya ditulis untuk `scheduled`/`published`; draft/archived mempertahankan nilai lama. | SELESAI | d8f615a |
| R6 | MEDIUM | Agenda yang dijadwalkan **sebelum** A3 menyimpan jam WIB sebagai UTC → tampil +7 jam di form edit. Skrip idempoten `scripts/fix-publish-at-wib.ts` (hanya status `scheduled`). **Sudah dijalankan di production 22 Okt 2026 17:44 UTC: 0 baris digeser, penanda ditulis.** | SELESAI | 54aada9 + 05f66b4 |
| R7 | LOW | `sanitize-html` ter-bundle ke browser lewat `RichTextEditor.tsx` → chunk editor ~204 KB. Kini sanitizer dimuat `import()` saat tab Preview diklik: chunk editor 204 KB → 4,4 KB, `sanitize.*.js` (204 KB) on-demand. | SELESAI | 891cf7d |

**R6 — sudah dieksekusi di production (22 Okt 2026 17:44 UTC)**

Env `DATABASE_URL` di Vercel bertipe `sensitive` sehingga tidak bisa dibaca lewat CLI/API (`vercel env pull` hanya menghasilkan `[SENSITIVE]`). Migrasi dijalankan dari dalam runtime Vercel lewat preview deployment sementara + endpoint bertoken, lalu deployment dihapus.

Hasil:

| Item | Nilai |
| :-- | :-- |
| Baris `publish_at` non-null | 3 (1 `draft`, 2 `published`) |
| Baris digeser | **0** — tidak ada agenda berstatus `scheduled` |
| Penanda `migration:publish-at-wib-v1` | ditulis (`{"appliedAt":"2026-10-22T17:44:18.559Z","rows":0}`) |
| Data sesudah migrasi | identik dengan sebelum (diverifikasi lewat endpoint yang sama) |

Ketiga baris **tidak boleh** digeser: detiknya `:58`, `:33`, `:14` (bukan `:00`), tanda nilainya berasal dari `new Date()` saat dipublikasikan, bukan dari input `datetime-local`. Karena itu pula filter skrip dikunci ke `status = 'scheduled'` (05f66b4) — versi pertama yang menggeser semua baris akan merusak 2 agenda `published`.

Untuk deployment berikutnya, skrip tetap tersedia:

```bash
npm run fix:publish-at-wib                 # dry-run: lihat daftar agenda & publish_at
npm run fix:publish-at-wib -- --apply      # geser +7 jam (scheduled) + tulis penanda
```

Penanda di `drive_cache` membuat skrip aman dijalankan ulang (tidak menggeser dua kali). Bila nanti muncul agenda berstatus `scheduled` yang dibuat **sebelum** fix A3 ter-deploy, hapus penanda lalu jalankan `--apply` sekali lagi.

Catatan (bukan defect): A4 sengaja menampilkan agenda `published` meski `eventDate` sudah lewat; `getAuthSecret()` fail-fast membuat seluruh request ber-cookie `access_token` ikut 500 bila `AUTH_SECRET` hilang; `checkOrigin: true` perlu diuji login di production setelah deploy (rekonstruksi origin di belakang proxy).
