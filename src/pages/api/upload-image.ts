import type { APIRoute } from 'astro';
import { put } from '@vercel/blob';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

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

  // Validasi tipe MIME di sisi server
  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Response(
      JSON.stringify({ error: "Format file tidak didukung. Gunakan JPG, PNG, atau WEBP." }),
      { status: 400 }
    );
  }

  // Validasi ukuran file di sisi server (maks 3MB)
  if (file.size > MAX_SIZE) {
    return new Response(
      JSON.stringify({ error: "Ukuran gambar terlalu besar. Maksimal 3MB." }),
      { status: 400 }
    );
  }

  try {
    // Persingkat nama file untuk menghindari URL yang terlalu panjang
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${extension}`;

    // Mode lokal (development): simpan ke public/uploads/posts/
    if (import.meta.env.DEV) {
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'posts');
      await mkdir(uploadDir, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(join(uploadDir, filename), buffer);
      return new Response(JSON.stringify({ url: `/uploads/posts/${filename}` }), { status: 200 });
    }

    // Mode produksi: upload ke Vercel Blob
    const token = process.env.BLOB_READ_WRITE_TOKEN || import.meta.env.BLOB_READ_WRITE_TOKEN;

    const blob = await put(`posts/${filename}`, file, {
      access: 'public',
      token: token,
      contentType: file.type, // PENTING: Beritahu Vercel tipe konten aslinya
    });

    return new Response(JSON.stringify({ url: blob.url }), { status: 200 });
  } catch (error: any) {
    console.error("Blob upload error details:", error.message);
    return new Response(JSON.stringify({
      error: "Failed to upload image",
      details: error.message
    }), { status: 500 });
  }
};