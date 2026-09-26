import ImageKit from "imagekit";

/**
 * Inisialisasi Singleton ImageKit
 */
let imagekit: ImageKit | null = null;

export function getImageKit(): ImageKit {
  if (!imagekit) {
    const publicKey =
      import.meta.env.IMAGEKIT_PUBLIC_KEY || process.env.IMAGEKIT_PUBLIC_KEY;
    const privateKey =
      import.meta.env.IMAGEKIT_PRIVATE_KEY || process.env.IMAGEKIT_PRIVATE_KEY;
    const urlEndpoint =
      import.meta.env.IMAGEKIT_URL_ENDPOINT || process.env.IMAGEKIT_URL_ENDPOINT;

    if (!publicKey || !privateKey || !urlEndpoint) {
      console.warn(
        "[ImageKit] Kredensial belum lengkap. Upload tidak akan berfungsi di mode produksi.",
      );
    }

    imagekit = new ImageKit({
      publicKey: publicKey || "dummy_public_key",
      privateKey: privateKey || "dummy_private_key",
      urlEndpoint: urlEndpoint || "https://ik.imagekit.io/dummy",
    });
  }
  return imagekit;
}

/**
 * Unggah file ke ImageKit
 * @param file Buffer atau string Base64 / URL
 * @param fileName Nama asli file
 * @param folder Folder tujuan di ImageKit (misal: "/posts")
 * @returns Object berisi URL dan fileId dari ImageKit
 */
export async function uploadToImageKit(
  file: Buffer | string,
  fileName: string,
  folder: string = "/general",
): Promise<{ url: string; fileId: string }> {
  const ik = getImageKit();
  const response = await ik.upload({
    file,
    fileName,
    folder,
    useUniqueFileName: true,
  });

  return {
    url: response.url,
    fileId: response.fileId,
  };
}

/**
 * Hapus file dari ImageKit berdasarkan URL (dengan mencari nama file-nya)
 * @param url URL lengkap dari ImageKit (misal: https://ik.imagekit.io/libes/posts/gambar1.jpg)
 */
export async function deleteFromImageKitByUrl(url: string): Promise<void> {
  if (!url || !url.includes("ik.imagekit.io")) {
    return;
  }

  try {
    const ik = getImageKit();
    // Ekstrak nama file dari URL
    const urlObj = new URL(url);
    const pathnameParts = urlObj.pathname.split("/");
    const fileName = pathnameParts[pathnameParts.length - 1];

    if (!fileName) return;

    // Cari fileId berdasarkan nama file
    const files = await ik.listFiles({
      searchQuery: `name="${fileName}"`,
    });

    if (files && files.length > 0) {
      // Hapus file pertama yang cocok
      await ik.deleteFile(files[0].fileId);
      console.log(`[ImageKit] Berhasil menghapus file: ${fileName}`);
    } else {
      console.warn(`[ImageKit] File tidak ditemukan untuk dihapus: ${fileName}`);
    }
  } catch (error) {
    console.error(`[ImageKit] Gagal menghapus file dari URL ${url}:`, error);
  }
}
