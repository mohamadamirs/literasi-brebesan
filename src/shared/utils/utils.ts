// src/lib/utils.ts

export function generateSlug(title: string) {
  const baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Hapus simbol aneh (seperti !@#%)
    .replace(/[\s_-]+/g, "-") // Ganti spasi jadi strip (-)
    .replace(/^-+|-+$/g, ""); // Hapus strip di awal/akhir

  // Kita tambahkan string acak sedikit di belakangnya agar UNIK.
  // Misal ada 2 user membuat judul "Halo Dunia", agar tidak tabrakan di database.
  const uniqueId = Math.random().toString(36).substring(2, 7);

  return `${baseSlug}-${uniqueId}`;
}

export const stripHtml = (html: string) => {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
};

export const truncateText = (text: string | null, length = 100) => {
  if (!text) return "";
  const clean = stripHtml(text);
  if (clean.length <= length) return clean;
  return clean.substring(0, length).trim() + "...";
};

export const truncateTitle = (text: string | null, length = 50) => {
  if (!text) return "";
  if (text.length <= length) return text;
  return text.substring(0, length).trim() + "...";
};

export const formatDate = (date: any) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric", month: "short", day: "numeric",
  });
};

// Helper untuk ambil gambar pertama dari konten (Vercel Blob / Editor Images)
export const extractFirstImage = (html: string) => {
  if (!html) return null;
  const match = html.match(/<img\s+[^>]*src="([^">]+)"/i);
  return match ? match[1] : null;
};

