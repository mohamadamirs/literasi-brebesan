import type { APIRoute } from "astro";
import { agendaService } from "@/features/agenda/agenda.service";

export const GET: APIRoute = async () => {
  try {
    const agendas = await agendaService.getUpcomingAgendas(1);

    return new Response(JSON.stringify(agendas[0] || null), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30",
      },
    });
  } catch (e: any) {
    console.error("❌ [API AGENDAS] Error:", e);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
};
