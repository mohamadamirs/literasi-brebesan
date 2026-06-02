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
    if (latestAgenda.length > 0) {
      const agendaDate = new Date(latestAgenda[0].created_at).toISOString().split('T')[0];
      if (agendaDate > homeLastMod) homeLastMod = agendaDate;
    }

    const escapeXml = (unsafe: string) => {
      return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });
    };

    const urls: string[] = [];
    urls.push(`<url><loc>${baseUrl}/</loc><lastmod>${homeLastMod}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`);
    urls.push(`<url><loc>${baseUrl}/publikasi</loc><lastmod>${homeLastMod}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`);
    urls.push(`<url><loc>${baseUrl}/dokumentasi</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`);
    urls.push(`<url><loc>${baseUrl}/kontak</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`);

    posts.forEach(post => {
      const date = new Date(post.updated_at).toISOString().split('T')[0];
      urls.push(`<url><loc>${baseUrl}/publikasi/${escapeXml(post.slug)}</loc><lastmod>${date}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
    });

    profiles.forEach(profile => {
      const date = new Date(profile.created_at || today).toISOString().split('T')[0];
      urls.push(`<url><loc>${baseUrl}/p/${profile.id}</loc><lastmod>${date}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`);
    });

    // ULTRA-COMPATIBILITY: No spaces, no extra namespaces, single line.
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    console.error('Sitemap Error:', error);
    const emergencyXml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${baseUrl}/</loc><lastmod>${today}</lastmod></url></urlset>`;
    return new Response(emergencyXml, { 
      status: 200, 
      headers: { 'Content-Type': 'application/xml; charset=utf-8' } 
    });
  }
};
