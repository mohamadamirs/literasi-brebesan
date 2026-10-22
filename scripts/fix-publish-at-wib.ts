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
 * Skrip ini menambah 7 jam ke SEMUA `agendas.publish_at` yang sudah ada,
 * supaya jadwal hasil input lama tetap tayang pada jam yang dimaksud admin.
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

  const rows = await prisma.agenda.findMany({
    where: { publishAt: { not: null } },
    select: { id: true, title: true, status: true, publishAt: true },
    orderBy: { publishAt: "asc" },
  });

  console.log(`Ditemukan ${rows.length} agenda dengan publish_at:`);
  for (const row of rows) {
    console.log(
      `  - [${row.status}] ${row.title} → ${row.publishAt?.toISOString()}`,
    );
  }

  if (rows.length === 0) {
    if (apply) {
      await prisma.driveCache.create({
        data: {
          key: MARKER_KEY,
          value: { appliedAt: new Date().toISOString(), rows: 0 },
          expiresAt: new Date("2099-12-31T00:00:00.000Z"),
        },
      });
      console.log(`\n✅ Tidak ada data. Penanda "${MARKER_KEY}" tetap ditulis.`);
    } else {
      console.log("\nTidak ada data untuk dimigrasikan.");
    }
    return;
  }

  if (!apply) {
    console.log(
      "\nDRY-RUN: belum ada perubahan. Jalankan dengan --apply untuk menggeser +7 jam.",
    );
    return;
  }

  // `INTERVAL` didukung MySQL & TiDB. Kolom `publish_at` bertipe DATETIME(3).
  const shifted = await prisma.$executeRaw`
    UPDATE agendas
    SET publish_at = publish_at + INTERVAL 7 HOUR
    WHERE publish_at IS NOT NULL
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
