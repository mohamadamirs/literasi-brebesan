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

// WIB (Asia/Jakarta) = UTC+7, tanpa DST.
const WIB_OFFSET_MINUTES = 7 * 60;

/**
 * Input admin memakai <input type="datetime-local"> => "2026-10-25T10:00" (waktu WIB).
 * Server (Vercel) berjalan di UTC, jadi nilai tanpa offset harus ditafsirkan
 * eksplisit sebagai WIB lalu dikonversi ke UTC sebelum disimpan.
 */
export const parseWibDateTime = (value: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value.trim(),
  );
  if (!match) return new Date(value);
  const [, y, mo, d, h, mi, s] = match;
  const utcMs =
    Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s ?? 0)) -
    WIB_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs);
};

/**
 * Kebalikan: Date (UTC) -> "YYYY-MM-DDTHH:mm" dalam WIB untuk nilai input datetime-local.
 */
export const formatWibDateTime = (value: string | Date | null): string => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const wib = new Date(date.getTime() + WIB_OFFSET_MINUTES * 60 * 1000);
  return wib.toISOString().slice(0, 16);
};

// Helper untuk ambil gambar pertama dari konten (Vercel Blob / Editor Images)
export const extractFirstImage = (html: string) => {
  if (!html) return null;
  const match = html.match(/<img\s+[^>]*src="([^">]+)"/i);
  return match ? match[1] : null;
};

