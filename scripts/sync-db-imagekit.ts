import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

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

interface MappingEntry {
  localPath: string;
  imagekitUrl: string;
  fileId: string;
  uploadedAt: string;
}

async function main() {
  console.log("🔄 Memulai Sinkronisasi Database dengan URL ImageKit...");

  const manifestPath = join(process.cwd(), "public", "uploads", "imagekit-manifest.json");
  if (!existsSync(manifestPath)) {
    console.error("❌ File imagekit-manifest.json tidak ditemukan!");
    process.exit(1);
  }

  const manifest: MappingEntry[] = JSON.parse(readFileSync(manifestPath, "utf-8"));
  console.log(`📋 Membaca ${manifest.length} pemetaan URL dari manifest.`);

  // Buat mapping dictionary
  const pathMap = new Map<string, string>();
  for (const item of manifest) {
    pathMap.set(item.localPath, item.imagekitUrl);
    // Juga dukung pencocokan berbasis nama file saja
    const filename = item.localPath.split("/").pop();
    if (filename) {
      pathMap.set(filename, item.imagekitUrl);
    }
  }

  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });

  try {
    // 1. Update Profile avatars
    console.log("\n👤 Memeriksa tabel Profile...");
    const profiles = await prisma.profile.findMany({
      where: { avatarUrl: { not: null } },
    });
    let updatedProfiles = 0;
    for (const profile of profiles) {
      if (!profile.avatarUrl) continue;
      for (const [key, imagekitUrl] of pathMap.entries()) {
        if (profile.avatarUrl === key || profile.avatarUrl.endsWith(key)) {
          await prisma.profile.update({
            where: { id: profile.id },
            data: { avatarUrl: imagekitUrl },
          });
          console.log(`  ✅ Profile ID ${profile.id}: ${profile.avatarUrl} -> ${imagekitUrl}`);
          updatedProfiles++;
          break;
        }
      }
    }
    console.log(`✨ Total Profile diperbarui: ${updatedProfiles}`);

    // 2. Update Agenda posters
    console.log("\n📅 Memeriksa tabel Agenda...");
    const agendas = await prisma.agenda.findMany({
      where: { imageUrl: { not: null } },
    });
    let updatedAgendas = 0;
    for (const agenda of agendas) {
      if (!agenda.imageUrl) continue;
      for (const [key, imagekitUrl] of pathMap.entries()) {
        if (agenda.imageUrl === key || agenda.imageUrl.endsWith(key)) {
          await prisma.agenda.update({
            where: { id: agenda.id },
            data: { imageUrl: imagekitUrl },
          });
          console.log(`  ✅ Agenda "${agenda.title}": ${agenda.imageUrl} -> ${imagekitUrl}`);
          updatedAgendas++;
          break;
        }
      }
    }
    console.log(`✨ Total Agenda diperbarui: ${updatedAgendas}`);

    // 3. Update Post content
    console.log("\n📝 Memeriksa konten tabel Post...");
    const posts = await prisma.post.findMany({
      where: { content: { contains: "/uploads/" } },
    });
    let updatedPosts = 0;
    for (const post of posts) {
      if (!post.content) continue;
      let newContent = post.content;
      let postModified = false;

      for (const [localPath, imagekitUrl] of pathMap.entries()) {
        if (localPath.startsWith("/uploads/") && newContent.includes(localPath)) {
          newContent = newContent.split(localPath).join(imagekitUrl);
          postModified = true;
        }
      }

      if (postModified) {
        await prisma.post.update({
          where: { id: post.id },
          data: { content: newContent },
        });
        console.log(`  ✅ Post "${post.title}" (ID: ${post.id}) diperbarui.`);
        updatedPosts++;
      }
    }
    console.log(`✨ Total Post diperbarui: ${updatedPosts}`);

    console.log("\n🎉 SELURUH SINKRONISASI DATABASE KE IMAGEKIT BERHASIL!");
  } catch (err: any) {
    console.error("❌ Terjadi kesalahan saat sinkronisasi DB:", err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
