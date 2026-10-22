import sanitizeHtml from "sanitize-html";

/**
 * Opsi sanitasi konten artikel.
 * Dipisah dari `posts.service.ts` supaya bisa di-import tanpa menarik Prisma
 * (dipakai juga di sisi client untuk preview editor).
 */
export const sanitizeOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img",
    "h1",
    "h2",
    "blockquote",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ["src", "alt", "class", "width", "height"],
  },
  allowedSchemes: ["http", "https", "data"],
};

export function sanitizeContent(html: string | null | undefined): string {
  return sanitizeHtml(html || "", sanitizeOptions);
}
