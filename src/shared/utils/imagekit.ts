import ImageKit from "imagekit";

/**
 * Inisialisasi Singleton ImageKit
 */
let imagekit: ImageKit | null = null;

export function getImageKit(): ImageKit {
  if (!imagekit) {
    const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : process.env;
    const publicKey = env.IMAGEKIT_PUBLIC_KEY || process.env.IMAGEKIT_PUBLIC_KEY;
    const privateKey = env.IMAGEKIT_PRIVATE_KEY || process.env.IMAGEKIT_PRIVATE_KEY;
    const urlEndpoint = env.IMAGEKIT_URL_ENDPOINT || process.env.IMAGEKIT_URL_ENDPOINT;

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
export async function deleteFromImageKitByUrl(
  url: string,
  allowedFolder: string,
): Promise<void> {
  if (!url) {
    return;
  }

  try {
    const ik = getImageKit();
    const urlObj = new URL(url);
    const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : process.env;
    const urlEndpoint = env.IMAGEKIT_URL_ENDPOINT || process.env.IMAGEKIT_URL_ENDPOINT;
    if (!urlEndpoint) return;

    const endpoint = new URL(urlEndpoint);
    const segments = urlObj.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return;
    const rawFileName = segments[segments.length - 1];
    if (!/^[a-zA-Z0-9._%-]+$/.test(rawFileName)) return;

    // Folder whitelist: file harus berada DI DALAM folder yang diizinkan.
    // Subfolder tetap boleh (upload artikel memakai /<userId>/<YYYY-MM>/),
    // jadi pencocokan per segmen, bukan prefix path URL. Segmen juga aman
    // untuk endpoint yang sudah memuat segmen folder
    // (mis. https://ik.imagekit.io/literasibrebesan).
    const allowedSegments = allowedFolder
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean);
    if (allowedSegments.length === 0) return;
    const parentSegments = segments.slice(0, -1);
    const allowedIndex = parentSegments.findIndex((_, index) =>
      allowedSegments.every((seg, offset) => parentSegments[index + offset] === seg),
    );
    if (urlObj.origin !== endpoint.origin || allowedIndex === -1) {
      return;
    }

    const fileName = decodeURIComponent(rawFileName);
    // Folder tempat file benar-benar berada, dipakai untuk mempersempit
    // pencarian: tanpa ini file dengan nama sama di folder lain bisa memenuhi
    // hasil, dan limit default bisa memotong file yang mau dihapus.
    const parentPath = `/${parentSegments.join("/")}`;

    const files = await ik.listFiles({
      path: parentPath,
      searchQuery: `name="${fileName}"`,
      limit: 1000,
    });
    const matchingFile = files.find((file) => {
      try {
        const fileUrl = new URL(file.url);
        return fileUrl.origin === urlObj.origin && fileUrl.pathname === urlObj.pathname;
      } catch {
        return false;
      }
    });

    if (matchingFile) {
      await ik.deleteFile(matchingFile.fileId);
      console.log(`[ImageKit] Berhasil menghapus file: ${fileName}`);
    } else {
      console.warn(`[ImageKit] File tidak ditemukan untuk dihapus: ${fileName}`);
    }
  } catch (error) {
    console.error(`[ImageKit] Gagal menghapus file dari URL ${url}:`, error);
  }
}
