import type { APIRoute } from "astro";
import { getArchiveNavigation } from "../../lib/googleDrive";

export const GET: APIRoute = async ({ url }) => {
  const yearId = url.searchParams.get("yearId");
  const monthId = url.searchParams.get("monthId");
  const activityId = url.searchParams.get("activityId");

  try {
    const data = await getArchiveNavigation(yearId, monthId, activityId);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=60",
      },
    });
  } catch (e: any) {
    console.error("❌ [API NAVIGATION] Error:", e);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
};
