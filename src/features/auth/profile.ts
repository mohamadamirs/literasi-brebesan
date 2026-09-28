import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import prisma from "@/lib/prisma";
import { uploadToImageKit, deleteFromImageKitByUrl } from "@/shared/utils/imagekit";
import { imageFileExtension, validateImageFile } from "@/shared/utils/image-validation";
import { authService } from "@/features/auth/auth.service";
import bcrypt from "bcryptjs";

export const profileActions = {
  updateProfile: defineAction({
    accept: "form",
    input: z.object({
      fullName: z.string().min(3, "Nama minimal 3 karakter."),
      bio: z.string().max(200, "Bio maksimal 200 karakter.").optional().nullable(),
      instagram: z.string().optional().nullable(),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Anda harus login untuk memperbarui profil.",
        });
      }

      try {
        await prisma.profile.update({
          where: { id: user.id },
          data: {
            fullName: input.fullName,
            bio: input.bio || null,
            instagram: input.instagram || null,
          },
        });
        return { success: true };
      } catch (e: any) {
        console.error("Update profile error:", e);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal memperbarui profil.",
        });
      }
    },
  }),

  updateAvatar: defineAction({
    accept: "form",
    input: z.object({
      avatar: z.instanceof(File),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) throw new ActionError({ code: "UNAUTHORIZED", message: "Silakan login." });
      if (!(await validateImageFile(input.avatar))) {
        throw new ActionError({ code: "BAD_REQUEST", message: "Gunakan gambar JPG, PNG, atau WEBP valid maksimal 3MB." });
      }

      try {
        // Ambil data profil untuk hapus foto lama jika ada
        const profile = await prisma.profile.findUnique({
          where: { id: user.id },
          select: { avatarUrl: true },
        });
        const oldAvatar = profile?.avatarUrl;

        const buffer = Buffer.from(await input.avatar.arrayBuffer());
        const filename = `${user.id}-${Date.now()}.${imageFileExtension(input.avatar.type)}`;
        const blob = await uploadToImageKit(buffer, filename, `/literasibrebesan/avatars/${user.id}`);

        await prisma.profile.update({
          where: { id: user.id },
          data: { avatarUrl: blob.url },
        });

        if (oldAvatar) {
          await deleteFromImageKitByUrl(oldAvatar, `literasibrebesan/avatars/${user.id}`);
        }

        return { success: true, url: blob.url };
      } catch (e: any) {
        console.error("Update avatar error:", e);
        throw new ActionError({ code: "INTERNAL_SERVER_ERROR", message: "Gagal mengunggah foto profil." });
      }
    },
  }),

  changePassword: defineAction({
    accept: "form",
    input: z.object({
      currentPassword: z.string().min(1, "Password saat ini wajib diisi."),
      newPassword: z.string().min(6, "Password baru minimal 6 karakter."),
      confirmPassword: z.string(),
    }).refine(data => data.newPassword === data.confirmPassword, {
      message: "Konfirmasi password baru tidak cocok.",
      path: ["confirmPassword"],
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) throw new ActionError({ code: "UNAUTHORIZED", message: "Silakan login." });

      try {
        const userData = await prisma.user.findUnique({
          where: { id: user.id },
          select: { passwordHash: true },
        });

        if (!userData) {
          throw new ActionError({ code: "UNAUTHORIZED", message: "User tidak ditemukan." });
        }

        await authService.changePassword({
          userId: user.id,
          currentPassword: input.currentPassword,
          newPassword: input.newPassword,
        });

        return { success: true };
      } catch (e: any) {
        if (e.code === "BAD_REQUEST") {
          throw new ActionError({ code: "BAD_REQUEST", message: e.message });
        }
        if (e instanceof ActionError) throw e;
        console.error("Change password error:", e);
        throw new ActionError({ code: "INTERNAL_SERVER_ERROR", message: "Gagal mengganti password." });
      }
    },
  }),
};
