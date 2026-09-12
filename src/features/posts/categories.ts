// src/actions/categories.ts
import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export const categoryActions = {
  createCategory: defineAction({
    accept: "form",
    input: z.object({
      name: z.string().min(2, "Nama kategori terlalu pendek"),
      description: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user || user.role !== "admin") {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Hanya admin yang dapat melakukan aksi ini.",
        });
      }

      const id = uuidv4();
      const slug = input.name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

      try {
        await prisma.category.create({
          data: {
            id,
            name: input.name,
            slug,
            description: input.description || null,
          },
        });
        return { success: true };
      } catch (e: any) {
        console.error("Create category error:", e);
        if (e.code === "P2002" || e.message?.includes("slug")) {
          throw new ActionError({
            code: "CONFLICT",
            message: "Slug kategori sudah ada. Gunakan nama lain.",
          });
        }
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal membuat kategori.",
        });
      }
    },
  }),

  updateCategory: defineAction({
    accept: "form",
    input: z.object({
      id: z.string().uuid(),
      name: z.string().min(2),
      description: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user || user.role !== "admin") {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Hanya admin yang dapat melakukan aksi ini.",
        });
      }

      const slug = input.name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

      try {
        await prisma.category.update({
          where: { id: input.id },
          data: {
            name: input.name,
            slug,
            description: input.description || null,
          },
        });
        return { success: true };
      } catch (e: any) {
        console.error("Update category error:", e);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal memperbarui kategori.",
        });
      }
    },
  }),

  deleteCategory: defineAction({
    accept: "form",
    input: z.object({ id: z.string().uuid() }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user || user.role !== "admin") {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Hanya admin yang dapat melakukan aksi ini.",
        });
      }

      try {
        // Cek apakah ada post yang menggunakan kategori ini
        const count = await prisma.post.count({
          where: { categoryId: input.id },
        });

        if (count > 0) {
          throw new ActionError({
            code: "CONFLICT",
            message:
              "Kategori tidak bisa dihapus karena masih digunakan oleh beberapa artikel.",
          });
        }

        await prisma.category.delete({
          where: { id: input.id },
        });
        return { success: true };
      } catch (e: any) {
        if (e instanceof ActionError) throw e;
        console.error("Delete category error:", e);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal menghapus kategori.",
        });
      }
    },
  }),
};
