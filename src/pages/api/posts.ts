import type { APIRoute } from "astro";
import { postsService } from "@/features/posts/posts.service";

export const GET: APIRoute = async ({ url }) => {
  // Validasi: NaN / negatif / melebihi batas → 400 (bukan error Prisma 500).
  const rawLimit = Number.parseInt(url.searchParams.get("limit") || "9", 10);
  const rawOffset = Number.parseInt(url.searchParams.get("offset") || "0", 10);

  if (!Number.isFinite(rawLimit) || rawLimit < 1 || rawLimit > 50) {
    return new Response(
      JSON.stringify({ error: "Parameter limit harus berupa angka 1-50." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!Number.isFinite(rawOffset) || rawOffset < 0) {
    return new Response(
      JSON.stringify({ error: "Parameter offset harus berupa angka non-negatif." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const limit = rawLimit;
  const offset = rawOffset;
  const categoryId = url.searchParams.get("category");
  const search = url.searchParams.get("search");

  try {
    const posts = await postsService.getPublishedPosts({
      limit,
      offset,
      categoryId,
      search,
    });

    return new Response(JSON.stringify(posts), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  } catch (e: any) {
    console.error("❌ [API POSTS] Error:", e);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
};
