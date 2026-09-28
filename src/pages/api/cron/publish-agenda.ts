import type { APIRoute } from 'astro';
import prisma from "@/lib/prisma";
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
    const now = new Date();
    const readyToPublish = await prisma.agenda.findFirst({
      where: {
        status: 'scheduled',
        publishAt: {
          lte: now,
        },
      },
      orderBy: {
        publishAt: 'desc',
      },
    });

    if (!readyToPublish) {
      return new Response(JSON.stringify({
        success: true,
        message: "Tidak ada agenda baru yang perlu dipublikasikan saat ini.",
      }), { status: 200 });
    }

    const published = await prisma.$transaction(async (tx) => {
      const claim = await tx.agenda.updateMany({
        where: {
          id: readyToPublish.id,
          status: "scheduled",
          publishAt: { lte: now },
        },
        data: { status: "published" },
      });

      if (claim.count === 0) return false;

      await tx.agenda.updateMany({
        where: {
          status: "published",
          id: { not: readyToPublish.id },
        },
        data: { status: "archived" },
      });

      if (readyToPublish.publishAt) {
        await tx.agenda.updateMany({
          where: {
            status: "scheduled",
            publishAt: { lte: readyToPublish.publishAt },
            id: { not: readyToPublish.id },
          },
          data: { status: "archived" },
        });
      }

      return true;
    });

    if (!published) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Agenda sudah diproses oleh eksekusi cron lain.",
      }), { status: 200 });
    }

    return new Response(JSON.stringify({
      success: true, 
      message: "Agenda berhasil dipublikasikan dan agenda lama diarsipkan.",
    }), { status: 200 });
  } catch (error) {
    console.error("Cron Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Gagal memproses publikasi agenda." 
    }), { status: 500 });
  }
};
