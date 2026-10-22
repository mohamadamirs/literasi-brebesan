import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

// Load .env secara manual jika process.env belum terisi
function loadEnv() {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    let value = trimmed.substring(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.substring(1, value.length - 1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

/**
 * Migrasi sekali jalan untuk bug A3 (commit baaddd1).
 *
 * Sebelum fix, admin mengisi `10:00` (WIB) di <input type="datetime-local">
 * dan nilainya disimpan apa adanya sebagai 10:00 UTC. Setelah fix, nilai itu
 * dibaca sebagai UTC, jadi jam yang tampil di form edit bergeser +7 jam.
 * Skrip ini menambah 7 jam ke `agendas.publish_at` **hanya untuk status
 * `scheduled`** — satu-satunya jalur yang memakai input datetime-local
 * tersebut. Agenda `published` dari tombol publish memakai `new Date()`
 * sehingga nilainya sudah UTC yang benar dan tidak boleh digeser.
 *
 * Idempoten: penanda hasil migrasi disimpan di tabel `drive_cache`.
 *
 * Urutan deploy yang benar:
 *   1. deploy kode fix A3,
 *   2. jalankan `npm run fix:publish-at-wib -- --apply` SEKALI.
 *
 * Pemakaian:
 *   npm run fix:publish-at-wib              # dry-run (hanya menampilkan data)
 *   npm run fix:publish-at-wib -- --apply    # geser +7 jam + tulis penanda
 *
 * Catatan: agenda yang dulu `scheduled` lalu sudah dipublikasikan otomatis oleh
 * cron ikut menyimpan publish_at warisan jadwal (statusnya kini `published`),
 * jadi tidak tersentuh skrip ini. Jumlahnya biasanya nol; koreksi manual bila
 * tanggal tayangnya terlihat bergeser 7 jam.
 */

const MARKER_KEY = "migration:publish-at-wib-v1";
const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes("--apply");

  const marker = await prisma.driveCache.findUnique({
    where: { key: MARKER_KEY },
  });
  if (marker) {
    console.log(
      `⚠️  Migrasi sudah pernah dijalankan (${JSON.stringify(marker.value)}). Tidak ada perubahan.`,
    );
    return;
  }

  // Hanya status `scheduled` yang publish_at-nya berasal dari input
  // <input type="datetime-local"> (jalur yang terkena bug A3). Status lain
  // memakai `new Date()` saat dipublikasikan, jadi nilainya sudah UTC yang
  // benar dan TIDAK boleh digeser.
  //   - `published` via form  → publishAt = waktu klik "publish" (benar)
  //   - `published` via cron  → publishAt = warisan jadwal (ikut tergeser
  //     bila jadwalnya dibuat sebelum fix; baris seperti ini tidak bisa
  //     dibedakan otomatis, koreksi manual bila perlu)
  const rows = await prisma.agenda.findMany({
    where: { publishAt: { not: null } },
    select: { id: true, title: true, status: true, publishAt: true },
    orderBy: { publishAt: "asc" },
  });
  const targets = rows.filter((row) => row.status === "scheduled");

  console.log(`Ditemukan ${rows.length} agenda dengan publish_at:`);
  for (const row of rows) {
    const willShift = row.status === "scheduled";
    console.log(
      `  - [${row.status}] ${row.title} → ${row.publishAt?.toISOString()}` +
        ` (${willShift ? "DIGESER +7 jam" : "dilewati"})`,
    );
  }

  if (targets.length === 0) {
    if (apply) {
      await prisma.driveCache.create({
        data: {
          key: MARKER_KEY,
          value: { appliedAt: new Date().toISOString(), rows: 0 },
          expiresAt: new Date("2099-12-31T00:00:00.000Z"),
        },
      });
      console.log(
        `\n✅ Tidak ada agenda berstatus "scheduled". Penanda "${MARKER_KEY}" tetap ditulis.`,
      );
    } else {
      console.log('\nTidak ada agenda berstatus "scheduled" untuk dimigrasikan.');
    }
    return;
  }

  if (!apply) {
    console.log(
      `\nDRY-RUN: ${targets.length} agenda akan digeser +7 jam. Jalankan dengan --apply.`,
    );
    return;
  }

  // `INTERVAL` didukung MySQL & TiDB. Kolom `publish_at` bertipe DATETIME(3).
  const shifted = await prisma.$executeRaw`
    UPDATE agendas
    SET publish_at = publish_at + INTERVAL 7 HOUR
    WHERE publish_at IS NOT NULL AND status = 'scheduled'
  `;

  await prisma.driveCache.create({
    data: {
      key: MARKER_KEY,
      value: { appliedAt: new Date().toISOString(), rows: Number(shifted) },
      expiresAt: new Date("2099-12-31T00:00:00.000Z"),
    },
  });

  console.log(
    `\n✅ ${shifted} baris publish_at digeser +7 jam. Penanda "${MARKER_KEY}" ditulis.`,
  );
}

main()
  .catch((error) => {
    console.error("❌ Migrasi gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
