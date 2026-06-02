import type { APIRoute } from "astro";
import { getLatestMedia } from "../../lib/googleDrive";

export const GET: APIRoute = async ({ url }) => {
  const limitStr = url.searchParams.get("limit");
  const limit = limitStr ? parseInt(limitStr, 10) : 4;

  try {
    const files = await getLatestMedia(limit);

    return new Response(JSON.stringify(files), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=60",
      },
    });
  } catch (e: any) {
    console.error("❌ [API DRIVE LATEST] Error:", e);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
};
