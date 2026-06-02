import type { APIRoute } from 'astro';
import { sql } from '../../../lib/db';

/**
 * API ini berfungsi sebagai Cron Job untuk mempublikasikan agenda
 * yang sudah mencapai waktu tayangnya (publish_at).
 * 
 * Keamanan: Idealnya tambahkan pengecekan Header CRON_SECRET 
 * agar tidak sembarang orang bisa memicu endpoint ini.
 */
export const GET: APIRoute = async ({ request }) => {
  const cronSecret = import.meta.env.CRON_SECRET;
  const authHeader = request.headers.get('Authorization');

  // Keamanan: Cek CRON_SECRET jika dikonfigurasi di env
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Unauthorized' 
    }), { status: 401 });
  }

  try {
    // 1. Cari agenda yang statusnya 'scheduled' dan sudah waktunya tayang
    const { rows: readyToPublish } = await sql`
      SELECT id FROM agendas
      WHERE status = 'scheduled'
        AND publish_at <= CURRENT_TIMESTAMP
      ORDER BY publish_at ASC
      LIMIT 1
    `;

    if (readyToPublish.length > 0) {
      const newAgendaId = readyToPublish[0].id;

      // Jalankan transaksi (urutan penting)
      // Turunkan yang sedang 'published' jadi 'draft' (atau status lain sesuai logika bisnis Anda)
      await sql`UPDATE agendas SET status = 'draft' WHERE status = 'published'`;
      
      // Naikkan yang baru jadi 'published'
      await sql`UPDATE agendas SET status = 'published', publish_at = NULL WHERE id = ${newAgendaId}`;

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Agenda ${newAgendaId} berhasil dipublikasikan.` 
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Tidak ada agenda yang perlu dipublikasikan saat ini." 
    }), { status: 200 });

  } catch (error) {
    console.error("Cron Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Gagal memproses publikasi agenda." 
    }), { status: 500 });
  }
};
