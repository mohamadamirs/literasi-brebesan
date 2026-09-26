import type { APIRoute } from 'astro';
import prisma from "@/lib/prisma";
import { verifyCronRequest } from "@/shared/utils/cron-auth";

/**
 * API ini berfungsi sebagai Cron Job untuk membersihkan sesi user
 * yang sudah kadaluarsa (expires_at < NOW()).
 */
export const GET: APIRoute = async ({ request }) => {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const res = await prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Berhasil membersihkan ${res.count} sesi yang kadaluarsa.` 
    }), { status: 200 });

  } catch (error) {
    console.error("Cleanup Sessions Cron Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Gagal membersihkan sesi kadaluarsa." 
    }), { status: 500 });
  }
};
