import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { postsService } from "@/features/posts/posts.service";

export const postActions = {
  createPost: defineAction({
    accept: "form",
    input: z.object({
      title: z.string().min(5, "Judul terlalu pendek"),
      content: z.string().optional(),
      status: z.enum(["draft", "pending", "published"]).default("draft"),
      category_id: z
        .string()
        .uuid("Kategori tidak valid")
        .optional()
        .nullable(),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Silakan login terlebih dahulu.",
        });
      }

      try {
        await postsService.createPost(input, user.id, user.role);
        return { success: true };
      } catch (e: any) {
        console.error("Create post error:", e);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal menyimpan tulisan ke database.",
        });
      }
    },
  }),

  updatePost: defineAction({
    accept: "form",
    input: z.object({
      id: z.string().uuid(),
      title: z.string().min(5),
      content: z.string().optional(),
      status: z.enum(["draft", "pending", "published"]),
      category_id: z
        .string()
        .uuid("Kategori tidak valid")
        .optional()
        .nullable(),
      rejection_reason: z.string().optional().nullable(),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Akses ditolak. Silakan login.",
        });
      }

      try {
        await postsService.updatePost(input.id, input, user.role, user.id);
        return { success: true };
      } catch (e: any) {
        console.error("Update post error:", e);
        if (e.code === "NOT_FOUND") {
          throw new ActionError({
            code: "NOT_FOUND",
            message: e.message,
          });
        }
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal memperbarui tulisan.",
        });
      }
    },
  }),

  deletePost: defineAction({
    accept: "form",
    input: z.object({ id: z.string().uuid() }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Akses ditolak.",
        });
      }

      let result: { success: boolean };
      try {
        result = await postsService.deletePost(input.id, user.id, user.role);
      } catch (e: any) {
        console.error("Delete post error:", e);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal menghapus tulisan.",
        });
      }

      // deleteMany 0 baris = bukan pemilik / sudah dihapus: jangan lapor sukses.
      if (!result.success) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Tulisan tidak ditemukan atau bukan milik Anda.",
        });
      }

      return { success: true };
    },
  }),

  approvePost: defineAction({
    accept: "form",
    input: z.object({ id: z.string().uuid() }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user || user.role !== "admin") {
        throw new ActionError({
          code: "FORBIDDEN",
          message:
            "Maaf, akses ditolak. Fitur ini hanya tersedia untuk administrator.",
        });
      }

      try {
        await postsService.approvePost(input.id);
        return { success: true };
      } catch (e: any) {
        console.error("Approve post error:", e);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal menyetujui tulisan.",
        });
      }
    },
  }),

  rejectPost: defineAction({
    accept: "form",
    input: z.object({
      id: z.string().uuid(),
      reason: z.string().min(5, "Berikan alasan minimal 5 karakter"),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user || user.role !== "admin") {
        throw new ActionError({
          code: "FORBIDDEN",
          message: "Akses ditolak.",
        });
      }

      try {
        await postsService.rejectPost(input.id, input.reason);
        return { success: true };
      } catch (e: any) {
        console.error("Reject post error:", e);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal menolak tulisan.",
        });
      }
    },
  }),
};
