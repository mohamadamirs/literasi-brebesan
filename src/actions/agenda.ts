import { sql } from '../lib/db';
import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { put, del } from '@vercel/blob';

export const agendaActions = {
  saveAgenda: defineAction({
    accept: 'form',
    input: z.object({
      id: z.string().optional(),
      title: z.string().min(3),
      description: z.string().min(10),
      event_date: z.string(),
      event_time: z.string(),
      location: z.string(),
      wa_link: z.string().url(),
      status: z.enum(['draft', 'published', 'scheduled', 'archived']),
      publish_at: z.string().optional().nullable(),
      poster: z.instanceof(File).optional(),
      // TAMBAHAN: Menangkap nilai checkbox
      override_published: z.preprocess((val) => val === 'on' || val === 'true', z.boolean()).optional(),
    }),
    handler: async (input, context) => {
      const { user } = context.locals;
      if (!user || user.role !== 'admin') {
        throw new ActionError({ code: 'UNAUTHORIZED', message: 'Akses ditolak. Hanya administrator yang diperbolehkan.' });
      }

      // --- LOGIKA BARU: TIMPA AGENDA PUBLISHED ---
      if (input.status === 'published') {
        let existing = [];
        try {
          if (input.id) {
            const res = await sql`SELECT id, title FROM agendas WHERE status = 'published' AND event_date >= CURRENT_DATE AND id != ${input.id} LIMIT 1`;
            existing = res.rows;
          } else {
            const res = await sql`SELECT id, title FROM agendas WHERE status = 'published' AND event_date >= CURRENT_DATE LIMIT 1`;
            existing = res.rows;
          }
        } catch (dbError) {
          throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan saat mengakses database.' });
        }

        if (existing.length > 0) {
          // Kalau admin centang override, jadikan agenda lama draft!
          if (input.override_published) {
            try {
              await sql`UPDATE agendas SET status = 'archived' WHERE id = ${existing[0].id}`;
            } catch (e) {
              throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Gagal mengubah status agenda lama menjadi arsip.' });
            }
          } else {
            // Kalau tidak dicentang tapi tetap ingin mempublikasi, tolak.
            throw new ActionError({
              code: 'CONFLICT',
              message: `Agenda "${existing[0].title}" sedang ditayangkan. Silakan centang opsi "Timpa Agenda" jika ingin melanjutkan.`
            });
          }
        }
      }

      let publishTime = null;
      if (input.status === 'scheduled') {
        if (!input.publish_at) throw new ActionError({ code: 'BAD_REQUEST', message: 'Mohon isi tanggal rilis otomatis.' });
        publishTime = input.publish_at;
      } else if (input.status === 'published') {
        publishTime = new Date().toISOString();
      }

      let imageUrl = null;
      if (input.poster && input.poster.size > 0) {
        try {
          // Jika update, hapus gambar lama dulu jika ada
          if (input.id) {
            const { rows } = await sql`SELECT image_url FROM agendas WHERE id = ${input.id}`;
            if (rows[0]?.image_url) {
              try {
                await del(rows[0].image_url, {
                  token: import.meta.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN,
                });
              } catch (delError) {
                console.error("Gagal menghapus blob lama:", delError);
                // Lanjut saja, jangan hentikan proses simpan
              }
            }
          }

          const blob = await put(`agenda-posters/${Date.now()}-${input.poster.name}`, input.poster, {
            access: 'public',
            token: import.meta.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN,
          });
          imageUrl = blob.url;
        } catch (blobError: any) {
          console.error("Blob upload error:", blobError);
          throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Gagal mengunggah poster kegiatan.' });
        }
      }

      try {
        if (input.id) {
          if (imageUrl) {
            await sql`UPDATE agendas SET title=${input.title}, description=${input.description}, event_date=${input.event_date}, event_time=${input.event_time}, location=${input.location}, wa_link=${input.wa_link}, status=${input.status}, publish_at=${publishTime}, image_url=${imageUrl} WHERE id=${input.id}`;
          } else {
            await sql`UPDATE agendas SET title=${input.title}, description=${input.description}, event_date=${input.event_date}, event_time=${input.event_time}, location=${input.location}, wa_link=${input.wa_link}, status=${input.status}, publish_at=${publishTime} WHERE id=${input.id}`;
          }
          return { success: true };
        } else {
          await sql`INSERT INTO agendas (title, description, event_date, event_time, location, wa_link, status, publish_at, image_url) VALUES (${input.title}, ${input.description}, ${input.event_date}, ${input.event_time}, ${input.location}, ${input.wa_link}, ${input.status}, ${publishTime}, ${imageUrl})`;
          return { success: true };
        }
      } catch (dbError) {
        console.error("Save agenda DB error:", dbError);
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Gagal menyimpan data agenda ke database.' });
      }
    },
  }),

  deleteAgenda: defineAction({
    accept: 'form',
    input: z.object({ id: z.string() }),
    handler: async ({ id }, context) => {
      const { user } = context.locals;
      if (!user || user.role !== 'admin') throw new ActionError({ code: 'UNAUTHORIZED', message: 'Maaf, akses ditolak.' });
      
      try {
        // Hapus gambar dari blob storage dulu
        const { rows } = await sql`SELECT image_url FROM agendas WHERE id = ${id}`;
        if (rows[0]?.image_url) {
          try {
            await del(rows[0].image_url, {
              token: import.meta.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN,
            });
          } catch (delError) {
            console.error("Gagal menghapus blob saat delete agenda:", delError);
          }
        }

        await sql`DELETE FROM agendas WHERE id = ${id}`;
        return { success: true };
      } catch (error) {
        console.error("Delete agenda error:", error);
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Gagal menghapus agenda.' });
      }
    }
  }),

  quickPublishAgenda: defineAction({
    accept: 'form',
    input: z.object({ id: z.string() }),
    handler: async ({ id }, context) => {
      const { user } = context.locals;
      if (!user || user.role !== 'admin') throw new ActionError({ code: 'UNAUTHORIZED', message: 'Akses ditolak.' });

      try {
        // 1. Ubah SEMUA yang statusnya published menjadi draft (reset)
        await sql`UPDATE agendas SET status = 'archived' WHERE status = 'published'`;
        
        // 2. Terbitkan agenda yang dipilih
        await sql`UPDATE agendas SET status = 'published', publish_at = NULL WHERE id = ${id}`;
        
        return { success: true };
      } catch (error) {
        console.error("Quick publish error:", error);
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Gagal menerbitkan agenda secara instan.' });
      }
    }
  })
};
