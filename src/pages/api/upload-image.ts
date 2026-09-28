import type { APIRoute } from 'astro';
import { uploadToImageKit } from '@/shared/utils/imagekit';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 3 * 1024 * 1024; // 3MB

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('image') as File;

  if (!file) {
    return new Response(JSON.stringify({ error: "No image file found" }), { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Response(
      JSON.stringify({ error: "Format file tidak didukung. Gunakan JPG, PNG, atau WEBP." }),
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return new Response(
      JSON.stringify({ error: "Ukuran gambar terlalu besar. Maksimal 3MB." }),
      { status: 400 }
    );
  }

  try {
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Selalu upload ke ImageKit (baik dev maupun production)
    const now = new Date();
    const folder = `/literasibrebesan/posts/${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const result = await uploadToImageKit(buffer, filename, folder);

    return new Response(JSON.stringify({ url: result.url }), { status: 200 });
  } catch (error: any) {
    console.error("Image upload error details:", error);
    return new Response(JSON.stringify({
      error: "Failed to upload image",
      details: error.message || String(error)
    }), { status: 500 });
  }
};