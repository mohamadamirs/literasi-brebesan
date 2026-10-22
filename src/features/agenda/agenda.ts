import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { uploadToImageKit, deleteFromImageKitByUrl } from "@/shared/utils/imagekit";
import { imageFileExtension, validateImageFile } from "@/shared/utils/image-validation";
import { agendaService } from "@/features/agenda/agenda.service";

export const agendaActions = {
  saveAgenda: defineAction({
    accept: "form",
    input: z.object({
      id: z.string().optional(),
      title: z.string().min(3),
      description: z.string().min(10),
      event_date: z.string(),
      event_time: z.string(),
      location: z.string(),
      wa_link: z.string().url(),
      status: z.enum(["draft", "published", "scheduled", "archived"]),
      publish_at: z.string().optional().nullable(),
      poster: z.instanceof(File).optional(),
      override_published: z
        .preprocess((val) => val === "on" || val === "true", z.boolean())
        .optional(),
    }),
    handler: async (input, context) => {
      const { user } = context.locals;
      if (!user || user.role !== "admin") {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Akses ditolak. Hanya administrator yang diperbolehkan.",
        });
      }

      if (input.poster && input.poster.size > 0 && !(await validateImageFile(input.poster))) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Gunakan gambar JPG, PNG, atau WEBP valid maksimal 3MB.",
        });
      }

      // Urutan penting: upload poster baru -> update DB -> baru garbage collect
      // poster lama. Kalau GC dulu, upload/DB yang gagal membuat DB menunjuk
      // gambar yang sudah dihapus (broken image) atau file baru jadi orphan.
      const oldImageUrl = input.id
        ? await agendaService.getAgendaImageUrl(input.id)
        : null;

      let imageUrl: string | null = null;
      if (input.poster && input.poster.size > 0) {
        try {
          const buffer = Buffer.from(await input.poster.arrayBuffer());
          const filename = `${Date.now()}.${imageFileExtension(input.poster.type)}`;
          const blob = await uploadToImageKit(
            buffer,
            filename,
            "/literasibrebesan/agenda-posters"
          );
          imageUrl = blob.url;
        } catch (blobError: any) {
          console.error("Blob upload error:", blobError);
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Gagal mengunggah poster kegiatan.",
          });
        }
      }

      try {
        if (input.id) {
          await agendaService.updateAgenda(input.id, {
            ...input,
            image_url: imageUrl || undefined,
          });
        } else {
          await agendaService.createAgenda({
            ...input,
            image_url: imageUrl,
          });
        }
      } catch (dbError: any) {
        if (dbError.code === "CONFLICT") {
          throw new ActionError({
            code: "CONFLICT",
            message: dbError.message,
          });
        }
        if (dbError.code === "BAD_REQUEST") {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: dbError.message,
          });
        }
        console.error("Save agenda error:", dbError);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal menyimpan data agenda ke database.",
        });
      }

      // Data sudah aman di DB, sekarang boleh buang poster lama.
      if (oldImageUrl && imageUrl) {
        try {
          await deleteFromImageKitByUrl(
            oldImageUrl,
            "literasibrebesan/agenda-posters"
          );
        } catch (delError) {
          console.error("Gagal menghapus gambar agenda lama:", delError);
        }
      }

      return { success: true };
    },
  }),

  deleteAgenda: defineAction({
    accept: "form",
    input: z.object({ id: z.string() }),
    handler: async ({ id }, context) => {
      const { user } = context.locals;
      if (!user || user.role !== "admin")
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Maaf, akses ditolak.",
        });

      try {
        const oldImageUrl = await agendaService.getAgendaImageUrl(id);
        if (oldImageUrl) {
          try {
            await deleteFromImageKitByUrl(oldImageUrl, "literasibrebesan/agenda-posters");
          } catch (delError) {
            console.error("Gagal menghapus gambar saat delete agenda:", delError);
          }
        }

        await agendaService.deleteAgenda(id);
        return { success: true };
      } catch (error) {
        console.error("Delete agenda error:", error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal menghapus agenda.",
        });
      }
    },
  }),

  quickPublishAgenda: defineAction({
    accept: "form",
    input: z.object({ id: z.string() }),
    handler: async ({ id }, context) => {
      const { user } = context.locals;
      if (!user || user.role !== "admin")
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Akses ditolak.",
        });

      try {
        await agendaService.quickPublishAgenda(id);
        return { success: true };
      } catch (error) {
        console.error("Quick publish error:", error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal menerbitkan agenda secara instan.",
        });
      }
    },
  }),
};
