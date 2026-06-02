import type { APIRoute } from 'astro';
import { sql } from '../lib/db';

export const GET: APIRoute = async () => {
  const baseUrl = 'https://literasibrebesan.my.id';
  const today = new Date().toISOString().split('T')[0];

  try {
    const { rows: posts } = await sql`SELECT slug, updated_at FROM posts WHERE status = 'published' ORDER BY updated_at DESC`;
    const { rows: profiles } = await sql`SELECT id, created_at FROM profiles ORDER BY created_at DESC`;
    const { rows: latestAgenda } = await sql`SELECT created_at FROM agendas WHERE status = 'published' ORDER BY created_at DESC LIMIT 1`;

    let homeLastMod = today;
    if (posts.length > 0) {
      const latestPostDate = new Date(posts[0].updated_at).toISOString().split('T')[0];
      if (latestPostDate > homeLastMod) homeLastMod = latestPostDate;
    }

    // Fungsi sanitasi XML yang sangat kuat
    const cleanForXml = (unsafe: string) => {
      if (!unsafe) return '';
      // 1. Escape karakter khusus XML
      let sanitized = unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });
      // 2. Buang karakter kontrol yang ilegal di XML 1.0 (Penyebab umum bot gagal baca)
      return sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
    };

    const urls: string[] = [];
    
    // Halaman Statis
    urls.push(`<url><loc>${baseUrl}/</loc><lastmod>${homeLastMod}</lastmod></url>`);
    urls.push(`<url><loc>${baseUrl}/publikasi</loc><lastmod>${homeLastMod}</lastmod></url>`);
    urls.push(`<url><loc>${baseUrl}/dokumentasi</loc><lastmod>${today}</lastmod></url>`);
    urls.push(`<url><loc>${baseUrl}/kontak</loc><lastmod>${today}</lastmod></url>`);

    // Postingan Dinamis (Dengan Sanitasi)
    posts.forEach(post => {
      const date = new Date(post.updated_at).toISOString().split('T')[0];
      urls.push(`<url><loc>${baseUrl}/publikasi/${cleanForXml(post.slug)}</loc><lastmod>${date}</lastmod></url>`);
    });

    // Profil Dinamis
    profiles.forEach(profile => {
      const date = new Date(profile.created_at || today).toISOString().split('T')[0];
      urls.push(`<url><loc>${baseUrl}/p/${profile.id}</loc><lastmod>${date}</lastmod></url>`);
    });

    // Output final sebagai string tunggal tanpa spasi antar elemen yang tidak perlu
    // Header Content-Type diset sebagai 'application/xml' (standar Vercel/Google)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`.trim();

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    console.error('Sitemap Error:', error);
    const emergencyXml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${baseUrl}/</loc><lastmod>${today}</lastmod></url></urlset>`;
    return new Response(emergencyXml, { 
      status: 200, 
      headers: { 'Content-Type': 'application/xml' } 
    });
  }
};
