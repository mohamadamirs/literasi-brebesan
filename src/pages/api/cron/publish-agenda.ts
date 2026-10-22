import type { APIRoute } from 'astro';
import { agendaService } from "@/features/agenda/agenda.service";
import { verifyCronRequest } from "@/shared/utils/cron-auth";

/**
 * Cron job publikasi agenda.
 *
 * Logika pemilihan agenda due + pengklaiman (optimistic lock) ada di
 * `agendaService.promoteDueAgenda()` supaya jalur cron dan jalur baca publik
 * memakai aturan yang sama.
 */
export const GET: APIRoute = async ({ request }) => {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const result = await agendaService.promoteDueAgenda();

    if (result === "published") {
      return new Response(JSON.stringify({
        success: true,
        message: "Agenda berhasil dipublikasikan dan agenda lama diarsipkan.",
      }), { status: 200 });
    }

    if (result === "claimed") {
      return new Response(JSON.stringify({
        success: true,
        message: "Agenda sudah diproses oleh eksekusi cron lain.",
      }), { status: 200 });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Tidak ada agenda baru yang perlu dipublikasikan saat ini.",
    }), { status: 200 });
  } catch (error) {
    console.error("Cron Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Gagal memproses publikasi agenda."
    }), { status: 500 });
  }
};
