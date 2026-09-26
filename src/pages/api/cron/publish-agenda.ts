import type { APIRoute } from 'astro';
import prisma from "@/lib/prisma";
import { whatsappService } from "@/services/whatsapp.service";
import { verifyCronRequest } from "@/shared/utils/cron-auth";

/**
 * API ini berfungsi sebagai Cron Job untuk mempublikasikan agenda.
 * Logika: Hanya 1 agenda yang aktif (published) pada satu waktu.
 * Jika ada agenda baru yang siap terbit, agenda lama akan otomatis diarsipkan.
 */
export const GET: APIRoute = async ({ request }) => {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return auth.response!;
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

      // Jalankan pembaruan status dalam satu rangkaian proses (Optimistic Locking)
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
        // C. Terbitkan agenda yang paling baru secara kondisional
        prisma.agenda.updateMany({
          where: { 
            id: newAgendaId, 
            status: 'scheduled' // Mencegah bentrok jika sudah ditangani cron instance lain
          },
          data: { status: 'published' },
        }),
      ]);

      // Kirim notifikasi WhatsApp saat agenda resmi tayang
      whatsappService
        .notifyAgendaPublished({
          title: readyToPublish.title,
          eventDate: readyToPublish.eventDate,
          eventTime: readyToPublish.eventTime,
          location: readyToPublish.location,
          waLink: readyToPublish.waLink,
          imageUrl: readyToPublish.imageUrl,
        })
        .catch((err) => console.warn("[WA Agenda Notification Failed]", err));

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
