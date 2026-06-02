// src/pages/api/drive-files.ts
import type { APIRoute } from "astro";
import { getMediaFiles } from "../../lib/googleDrive";

export const GET: APIRoute = async ({ url }) => {
  const folderId = url.searchParams.get("folderId");
  const pageToken = url.searchParams.get("pageToken");

  // Tangkap parameter limit dari URL, jika tidak ada, gunakan 4 sebagai default
  const limitStr = url.searchParams.get("limit");
  const limit = limitStr ? parseInt(limitStr, 10) : 4;

  if (!folderId) {
    return new Response(JSON.stringify({ error: "Folder ID is required" }), {
      status: 400,
    });
  }

  try {
    // Teruskan limit ke library
    const data = await getMediaFiles(folderId, pageToken, limit);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=60",
      },
    });
  } catch (e: any) {
    console.error("❌ [API DRIVE] Error:", e);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
};
