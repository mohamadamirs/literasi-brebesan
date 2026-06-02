import type { APIRoute } from 'astro';
import { sql } from '../lib/db';

export const GET: APIRoute = async () => {
  const baseUrl = 'https://literasibrebesan.my.id';
  try {
    const { rows: posts } = await sql`SELECT slug, updated_at FROM posts WHERE status = 'published' ORDER BY updated_at DESC`;
    const { rows: profiles } = await sql`SELECT id, created_at FROM profiles ORDER BY created_at DESC`;
    
    const clean = (str: string) => str.replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','\'':'&apos;','"':'&quot;'}[c as any] || c)).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    
    const add = (path: string, date: any) => {
      const d = new Date(date).toISOString().split('T')[0];
      xml += `<url><loc>${baseUrl}${path}</loc><lastmod>${d}</lastmod></url>`;
    };

    add('/', new Date());
    add('/publikasi', new Date());
    add('/dokumentasi', new Date());
    add('/kontak', new Date());

    posts.forEach(p => add(`/publikasi/${clean(p.slug)}`, p.updated_at));
    profiles.forEach(p => add(`/p/${p.id}`, p.created_at || new Date()));

    xml += '</urlset>';

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600'
      }
    });
  } catch (e) {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://literasibrebesan.my.id/</loc></url></urlset>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' }
    });
  }
};
