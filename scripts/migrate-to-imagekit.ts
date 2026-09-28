import { readdir, readFile, writeFile } from "fs/promises";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { uploadToImageKit } from "../src/shared/utils/imagekit";

// Load .env secara manual jika process.env belum terisi
function loadEnv() {
  const envPath = join(process.cwd(), ".env");
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        let value = trimmed.substring(eqIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

interface MappingResult {
  localPath: string;
  imagekitUrl: string;
  fileId: string;
  uploadedAt: string;
}

async function migrateFolder(
  subfolder: string,
  imagekitFolder: string,
  results: MappingResult[]
) {
  const localDir = join(process.cwd(), "public", "uploads", subfolder);
  try {
    const files = await readdir(localDir);
    console.log(`📂 Memproses ${files.length} file di ${subfolder}...`);

    for (const file of files) {
      if (file.startsWith(".")) continue; // skip hidden files like .gitkeep

      const filePath = join(localDir, file);
      const localPath = `/uploads/${subfolder}/${file}`;
      const buffer = await readFile(filePath);

      console.log(`⬆️ Uploading ${localPath} ke ImageKit (${imagekitFolder})...`);
      try {
        const res = await uploadToImageKit(buffer, file, imagekitFolder);
        results.push({
          localPath,
          imagekitUrl: res.url,
          fileId: res.fileId,
          uploadedAt: new Date().toISOString(),
        });
        console.log(`✅ Berhasil: ${res.url}`);
      } catch (err: any) {
        console.error(`❌ Gagal upload ${localPath}:`, err.message || err);
      }
    }
  } catch (err) {
    console.warn(`⚠️ Folder public/uploads/${subfolder} tidak ditemukan atau kosong.`);
  }
}

async function main() {
  console.log("🚀 Memulai Migrasi Foto Backup ke ImageKit.io...");

  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  if (
    !publicKey ||
    !privateKey ||
    !urlEndpoint ||
    publicKey.includes("your_imagekit_public_key") ||
    privateKey.includes("your_imagekit_private_key") ||
    urlEndpoint.includes("your_imagekit_id")
  ) {
    console.error("\n❌ Error: Kredensial ImageKit di .env masih menggunakan nilai placeholder / belum diisi!");
    console.error("Silakan buka file .env dan ganti nilai berikut dengan Kredensial Asli dari Dashboard ImageKit:");
    console.error(`  IMAGEKIT_PUBLIC_KEY="${publicKey || ''}"`);
    console.error(`  IMAGEKIT_PRIVATE_KEY="${privateKey || ''}"`);
    console.error(`  IMAGEKIT_URL_ENDPOINT="${urlEndpoint || ''}"\n`);
    process.exit(1);
  }

  const results: MappingResult[] = [];

  await migrateFolder("agenda-posters", "/literasibrebesan/agenda-posters", results);
  await migrateFolder("avatars", "/literasibrebesan/avatars", results);
  await migrateFolder("posts", "/literasibrebesan/posts", results);

  const manifestPath = join(process.cwd(), "public", "uploads", "imagekit-manifest.json");
  await writeFile(manifestPath, JSON.stringify(results, null, 2), "utf-8");

  console.log(`\n🎉 Migrasi Selesai! Total file terunggah: ${results.length}`);
  console.log(`📄 Manifest tersimpan di: ${manifestPath}`);
}

main().catch(console.error);
