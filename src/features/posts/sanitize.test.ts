import { describe, it, expect } from "vitest";
import { sanitizeContent } from "@/features/posts/sanitize";

describe("sanitizeContent", () => {
  it("membuang tag script beserta isinya", () => {
    const out = sanitizeContent('<p>ok</p><script>alert(1)</script>');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
    expect(out).toContain("<p>ok</p>");
  });

  it("membuang event handler inline", () => {
    const out = sanitizeContent('<img src="https://cdn.test/a.png" onerror="alert(1)" />');
    expect(out).not.toContain("onerror");
  });

  it("membuang skema javascript pada atribut href", () => {
    const out = sanitizeContent('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain("javascript:");
  });

  it("mempertahankan tag yang diizinkan (img, h1, h2, blockquote)", () => {
    const out = sanitizeContent(
      '<h1>Judul</h1><h2>Sub</h2><blockquote>kutip</blockquote><img src="https://cdn.test/a.png" alt="a" />'
    );
    expect(out).toContain("<h1>Judul</h1>");
    expect(out).toContain("<h2>Sub</h2>");
    expect(out).toContain("<blockquote>kutip</blockquote>");
    expect(out).toContain('src="https://cdn.test/a.png"');
  });

  it("menangani input null/undefined tanpa error", () => {
    expect(sanitizeContent(null)).toBe("");
    expect(sanitizeContent(undefined)).toBe("");
  });
});
