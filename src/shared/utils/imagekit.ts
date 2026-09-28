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
    const endpointPath = endpoint.pathname.replace(/\/+$/, "");
    const folderPath = allowedFolder.replace(/^\/+|\/+$/g, "");
    const applicationPath = `${endpointPath}/${folderPath}/`;
    if (
      urlObj.origin !== endpoint.origin ||
      !urlObj.pathname.startsWith(applicationPath)
    ) {
      return;
    }

    const fileName = decodeURIComponent(urlObj.pathname.split("/").pop() || "");

    if (!fileName || !/^[a-zA-Z0-9._-]+$/.test(fileName)) return;

    const files = await ik.listFiles({
      searchQuery: `name="${fileName}"`,
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
