import type { APIRoute } from 'astro';
import { sql } from '../../../lib/db';

/**
 * API ini berfungsi sebagai Cron Job untuk membersihkan sesi user
 * yang sudah kadaluarsa (expires_at < NOW()).
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
    const { rowCount } = await sql`
      DELETE FROM user_sessions
      WHERE expires_at < NOW()
    `;

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Berhasil membersihkan ${rowCount} sesi yang kadaluarsa.` 
    }), { status: 200 });

  } catch (error) {
    console.error("Cleanup Sessions Cron Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Gagal membersihkan sesi kadaluarsa." 
    }), { status: 500 });
  }
};
