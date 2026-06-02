import type { APIRoute } from 'astro';
import { sql } from '../../../lib/db';

/**
 * API ini berfungsi sebagai Cron Job untuk mempublikasikan agenda.
 * Logika: Hanya 1 agenda yang aktif (published) pada satu waktu.
 * Jika ada agenda baru yang siap terbit, agenda lama akan otomatis diarsipkan.
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
    // 1. Cari agenda yang statusnya 'scheduled' dan sudah waktunya tayang.
    // Kita ambil yang paling baru (publish_at paling besar) untuk diterbitkan.
    const { rows: readyToPublish } = await sql`
      SELECT id, publish_at FROM agendas
      WHERE status = 'scheduled'
        AND publish_at <= CURRENT_TIMESTAMP
      ORDER BY publish_at DESC
      LIMIT 1
    `;

    if (readyToPublish.length > 0) {
      const newAgendaId = readyToPublish[0].id;
      const publishAt = readyToPublish[0].publish_at;

      // Jalankan pembaruan status dalam satu rangkaian proses
      
      // A. Ubah semua agenda yang sedang 'published' menjadi 'archived'
      await sql`UPDATE agendas SET status = 'archived' WHERE status = 'published'`;
      
      // B. Ubah agenda 'scheduled' lain yang waktunya sudah lewat (superseded) menjadi 'archived'
      await sql`
        UPDATE agendas 
        SET status = 'archived' 
        WHERE status = 'scheduled' 
          AND publish_at <= ${publishAt} 
          AND id != ${newAgendaId}
      `;
      
      // C. Terbitkan agenda yang paling baru
      await sql`UPDATE agendas SET status = 'published' WHERE id = ${newAgendaId}`;

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Agenda baru berhasil dipublikasikan, agenda lama diarsipkan.` 
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Tidak ada agenda baru yang perlu dipublikasikan saat ini." 
    }), { status: 200 });

  } catch (error) {
    console.error("Cron Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Gagal memproses publikasi agenda." 
    }), { status: 500 });
  }
};
