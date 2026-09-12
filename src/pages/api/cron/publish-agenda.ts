import type { APIRoute } from 'astro';
import prisma from "@/lib/prisma";

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
    const readyToPublish = await prisma.agenda.findFirst({
      where: {
        status: 'scheduled',
        publishAt: {
          lte: new Date(),
        },
      },
      orderBy: {
        publishAt: 'desc',
      },
    });

    if (readyToPublish) {
      const newAgendaId = readyToPublish.id;
      const publishAt = readyToPublish.publishAt;

      // Jalankan pembaruan status dalam satu rangkaian proses
      await prisma.$transaction([
        // A. Ubah semua agenda yang sedang 'published' menjadi 'archived'
        prisma.agenda.updateMany({
          where: { status: 'published' },
          data: { status: 'archived' },
        }),
        // B. Ubah agenda 'scheduled' lain yang waktunya sudah lewat (superseded) menjadi 'archived'
        prisma.agenda.updateMany({
          where: {
            status: 'scheduled',
            ...(publishAt ? { publishAt: { lte: publishAt } } : {}),
            id: { not: newAgendaId },
          },
          data: { status: 'archived' },
        }),
        // C. Terbitkan agenda yang paling baru
        prisma.agenda.update({
          where: { id: newAgendaId },
          data: { status: 'published' },
        }),
      ]);

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
