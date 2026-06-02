import type { APIRoute } from 'astro';
import { sql } from '../lib/db';

export const GET: APIRoute = async () => {
  const baseUrl = 'https://literasibrebesan.my.id';
  
  // Fungsi pembersihan data untuk mencegah karakter ilegal XML
  const clean = (str: string) => {
    if (!str) return '';
    return str
      .replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','\'':'&apos;','"':'&quot;'}[c as any] || c))
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  };

  try {
    const { rows: posts } = await sql`SELECT slug, updated_at FROM posts WHERE status = 'published' ORDER BY updated_at DESC`;
    const { rows: profiles } = await sql`SELECT id, created_at FROM profiles ORDER BY created_at DESC`;

    let urls = [];
    
    // 1. Halaman Statis (Wajib tanpa trailing slash agar cocok dengan Layout.astro)
    urls.push(`<url><loc>${baseUrl}/</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod></url>`);
    urls.push(`<url><loc>${baseUrl}/publikasi</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod></url>`);
    urls.push(`<url><loc>${baseUrl}/dokumentasi</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod></url>`);
    urls.push(`<url><loc>${baseUrl}/kontak</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod></url>`);

    // 2. Postingan Dinamis
    posts.forEach(p => {
      const d = new Date(p.updated_at).toISOString().split('T')[0];
      urls.push(`<url><loc>${baseUrl}/publikasi/${clean(p.slug)}</loc><lastmod>${d}</lastmod></url>`);
    });

    // 3. Profil Dinamis
    profiles.forEach(p => {
      const d = new Date(p.created_at || new Date()).toISOString().split('T')[0];
      urls.push(`<url><loc>${baseUrl}/p/${p.id}</loc><lastmod>${d}</lastmod></url>`);
    });

    // Final XML: Single line, no whitespace before declaration, no redundant namespaces
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        // BYPASS CACHE TOTAL: Memastikan Googlebot selalu melihat versi terbaru
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (e) {
    console.error('Sitemap critical error:', e);
    // Fallback minimalis jika DB error
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${baseUrl}/</loc></url></urlset>`, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' }
    });
  }
};
