import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params, url }) => {
  const { id } = params;
  const sz = url.searchParams.get("sz") || "600";

  if (!id) return new Response(null, { status: 400 });

  // Gunakan URL thumbnail resmi Google Drive
  const googleUrl = `https://drive.google.com/thumbnail?id=${id}&sz=w${sz}`;
  
  try {
    const response = await fetch(googleUrl);
    
    if (!response.ok) {
      return new Response(null, { status: response.status });
    }

    // Menggunakan response.body (Streaming) untuk efisiensi memori
    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
        // Cache gambar di Edge Network dan Browser selama 1 tahun (31536000 detik)
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      }
    });
  } catch (e) {
    console.error("❌ [PROXY ERROR]:", e);
    return new Response(null, { status: 500 });
  }
};
