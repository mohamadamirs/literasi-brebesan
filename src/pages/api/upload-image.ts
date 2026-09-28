import type { APIRoute } from 'astro';
import { uploadToImageKit } from '@/shared/utils/imagekit';
import { imageFileExtension, validateImageFile } from '@/shared/utils/image-validation';

const MAX_SIZE = 3 * 1024 * 1024; // 3MB

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const contentLength = Number(request.headers.get('content-length'));
  if (contentLength > MAX_SIZE + 64 * 1024) {
    return new Response(JSON.stringify({ error: "Ukuran gambar terlalu besar." }), { status: 413 });
  }

  const formData = await request.formData();
  const candidate = formData.get('image');

  if (!(candidate instanceof File)) {
    return new Response(JSON.stringify({ error: "No image file found" }), { status: 400 });
  }

  const file = candidate;
  if (!(await validateImageFile(file, MAX_SIZE))) {
    return new Response(
      JSON.stringify({ error: "Gunakan gambar JPG, PNG, atau WEBP valid maksimal 3MB." }),
      { status: 400 }
    );
  }

  try {
    const extension = imageFileExtension(file.type);
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Selalu upload ke ImageKit (baik dev maupun production)
    const now = new Date();
    const folder = `/literasibrebesan/posts/${user.id}/${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const result = await uploadToImageKit(buffer, filename, folder);

    return new Response(JSON.stringify({ url: result.url }), { status: 200 });
  } catch (error: unknown) {
    console.error("Image upload error details:", error);
    return new Response(JSON.stringify({
      error: "Failed to upload image",
    }), { status: 500 });
  }
};