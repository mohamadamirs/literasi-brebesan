import type { APIRoute } from "astro";
import { postsService } from "@/features/posts/posts.service";

export const GET: APIRoute = async ({ url }) => {
  const limit = parseInt(url.searchParams.get("limit") || "9", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
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
