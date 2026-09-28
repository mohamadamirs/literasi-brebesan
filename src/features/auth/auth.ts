// src/actions/auth.ts
import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { authService } from "@/features/auth/auth.service";
import { Resend } from "resend";
import { rateLimiter, getClientIp } from "@/shared/utils/rate-limiter";

const publicSiteUrl =
  import.meta.env.PUBLIC_SITE_URL ||
  process.env.PUBLIC_SITE_URL ||
  "https://literasibrebesan.my.id";
const publicSiteOrigin = new URL(publicSiteUrl).origin;

export const authActions = {
  signIn: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email("Format email tidak valid."),
      password: z.string().min(1, "Password wajib diisi."),
    }),
    handler: async (input, context) => {
      const ip = getClientIp(context.request, context.clientAddress);
      const rl = await rateLimiter.check(`signin:${ip}`, {
        max: 10,
        windowMs: 15 * 60 * 1000,
      });

      if (!rl.success) {
        throw new ActionError({
          code: "TOO_MANY_REQUESTS",
          message: `Terlalu banyak percobaan masuk. Coba lagi dalam ${Math.ceil(rl.retryAfterSeconds / 60)} menit.`,
        });
      }

      try {
        const { accessToken, refreshToken } =
          await authService.authenticateUser(input);

        // Reset rate limiter setelah login berhasil
        await rateLimiter.reset(`signin:${ip}`);

        context.cookies.set("access_token", accessToken, {
          path: "/",
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: "lax",
          maxAge: 60 * 10, // 10 menit
        });

        context.cookies.set("refresh_token", refreshToken, {
          path: "/",
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 14, // 14 hari
        });

        context.cookies.delete("session", { path: "/" });

        return { success: true };
      } catch (e: any) {
        if (e.code === "UNAUTHORIZED") {
          throw new ActionError({
            code: "UNAUTHORIZED",
            message: e.message || "Email atau password Anda salah.",
          });
        }
        if (e instanceof ActionError) throw e;
        console.error("Login error:", e);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Terjadi kesalahan sistem saat login.",
        });
      }
    },
  }),

  register: defineAction({
    accept: "form",
    input: z.object({
      fullName: z.string().min(3, "Nama minimal 3 karakter."),
      email: z.string().email("Format email tidak valid."),
      password: z.string().min(6, "Password minimal 6 karakter."),
    }),
    handler: async (input, context) => {
      const ip = getClientIp(context.request, context.clientAddress);
      const rl = await rateLimiter.check(`register:${ip}`, {
        max: 5,
        windowMs: 60 * 60 * 1000, // 1 jam
      });

      if (!rl.success) {
        throw new ActionError({
          code: "TOO_MANY_REQUESTS",
          message:
            "Terlalu banyak pendaftaran dari perangkat ini. Coba lagi dalam 1 jam.",
        });
      }

      try {
        const { accessToken, refreshToken } =
          await authService.registerUser(input);

        context.cookies.set("access_token", accessToken, {
          path: "/",
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: "lax",
          maxAge: 60 * 10, // 10 menit
        });

        context.cookies.set("refresh_token", refreshToken, {
          path: "/",
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 14, // 14 hari
        });

        context.cookies.delete("session", { path: "/" });

        return { success: true };
      } catch (e: any) {
        if (e.code === "CONFLICT") {
          throw new ActionError({
            code: "CONFLICT",
            message:
              e.message || "Email sudah terdaftar, silakan gunakan email lain.",
          });
        }
        if (e instanceof ActionError) throw e;
        console.error("Register error:", e);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal mendaftarkan akun.",
        });
      }
    },
  }),

  forgotPassword: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email("Format email tidak valid."),
    }),
    handler: async (input, context) => {
      const ip = getClientIp(context.request, context.clientAddress);
      const ipRl = await rateLimiter.check(`forgot-ip:${ip}`, {
        max: 5,
        windowMs: 30 * 60 * 1000,
      });
      const emailRl = await rateLimiter.check(
        `forgot-email:${input.email.toLowerCase()}`,
        {
          max: 3,
          windowMs: 30 * 60 * 1000,
        },
      );

      if (!ipRl.success || !emailRl.success) {
        throw new ActionError({
          code: "TOO_MANY_REQUESTS",
          message:
            "Terlalu banyak permintaan reset kata sandi. Coba lagi dalam 30 menit.",
        });
      }

      try {
        const resetInfo = await authService.createPasswordResetToken(
          input.email,
        );
        if (!resetInfo) return { success: true };

        const { token } = resetInfo;
        const resendApiKey =
          import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY;
        if (!resendApiKey) {
          console.error("RESEND_API_KEY is not set.");
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Sistem email belum dikonfigurasi.",
          });
        }

        const resend = new Resend(resendApiKey);
        const resetUrl = `${publicSiteOrigin}/reset-password?token=${token}`;
        const senderEmail =
          import.meta.env.RESEND_FROM_EMAIL ||
          process.env.RESEND_FROM_EMAIL ||
          "Literasi Brebesan <onboarding@resend.dev>";

        await resend.emails.send({
          from: senderEmail,
          to: input.email,
          subject: "Reset Password - Literasi Brebesan",
          html: `
            <div style="font-family: sans-serif; line-height: 1.5; color: #333; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #111; text-align: center;">Reset Password Anda</h2>
              <p>Halo,</p>
              <p>Kami menerima permintaan untuk mereset password akun <strong>Literasi Brebesan</strong> Anda. Klik tombol di bawah ini untuk melanjutkan:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" target="_self" style="background-color: #111; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password Sekarang</a>
              </div>
              <p style="font-size: 14px; color: #666;">Jika tombol di atas tidak berfungsi, Anda juga dapat menyalin dan menempel tautan berikut ke browser Anda:</p>
              <p style="font-size: 12px; color: #0066cc; word-break: break-all;">${resetUrl}</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #999; text-align: center;">Jika Anda tidak merasa melakukan permintaan ini, silakan abaikan email ini.</p>
            </div>
          `,
        });

        return { success: true };
      } catch (e: any) {
        if (e.code === "TOO_MANY_REQUESTS") {
          throw new ActionError({
            code: "TOO_MANY_REQUESTS",
            message: e.message,
          });
        }
        if (e instanceof ActionError) throw e;
        console.error("Forgot password error:", e);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal memproses permintaan reset password.",
        });
      }
    },
  }),

  resetPassword: defineAction({
    accept: "form",
    input: z
      .object({
        token: z.string(),
        password: z.string().min(6, "Password minimal 6 karakter."),
        confirmPassword: z.string(),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: "Password dan konfirmasi tidak cocok.",
        path: ["confirmPassword"],
      }),
    handler: async (input, context) => {
      const ip = getClientIp(context?.request, context?.clientAddress);
      const rl = await rateLimiter.check(`reset-pwd:${ip}`, {
        max: 10,
        windowMs: 15 * 60 * 1000,
      });

      if (!rl.success) {
        throw new ActionError({
          code: "TOO_MANY_REQUESTS",
          message:
            "Terlalu banyak percobaan reset kata sandi. Coba lagi dalam beberapa saat.",
        });
      }

      try {
        await authService.resetPassword({
          token: input.token,
          password: input.password,
        });
        return { success: true };
      } catch (e: any) {
        if (e.code === "BAD_REQUEST") {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: e.message,
          });
        }
        if (e instanceof ActionError) throw e;
        console.error("Reset password error:", e);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal mereset password.",
        });
      }
    },
  }),

  createUser: defineAction({
    accept: "form",
    input: z.object({
      fullName: z.string().min(3, "Nama minimal 3 karakter."),
      email: z.string().email("Format email tidak valid."),
      password: z.string().min(6, "Password minimal 6 karakter."),
      role: z.enum(["user", "admin"]).default("user"),
    }),
    handler: async (input, context) => {
      const { user: currentUser } = context.locals;
      if (!currentUser || currentUser.role !== "admin") {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Hanya administrator yang dapat membuat user baru.",
        });
      }

      try {
        await authService.createUser(input);
        return { success: true };
      } catch (e: any) {
        if (e.code === "CONFLICT") {
          throw new ActionError({
            code: "CONFLICT",
            message: e.message || "Email sudah terdaftar.",
          });
        }
        if (e instanceof ActionError) throw e;
        console.error("Admin Create User error:", e);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal membuat user baru.",
        });
      }
    },
  }),

  updateUser: defineAction({
    accept: "form",
    input: z.object({
      id: z.string().uuid(),
      fullName: z.string().min(3, "Nama minimal 3 karakter."),
      email: z.string().email("Format email tidak valid."),
      role: z.enum(["user", "admin"]),
      password: z.string().min(6).optional().or(z.literal("")),
    }),
    handler: async (input, context) => {
      const { user: currentUser } = context.locals;
      if (!currentUser || currentUser.role !== "admin") {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Akses ditolak.",
        });
      }

      try {
        await authService.updateUser(input);
        return { success: true };
      } catch (e: any) {
        console.error("Admin Update User error:", e);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal memperbarui user.",
        });
      }
    },
  }),

  deleteUser: defineAction({
    accept: "form",
    input: z.object({ id: z.string().uuid() }),
    handler: async (input, context) => {
      const { user: currentUser } = context.locals;
      if (!currentUser || currentUser.role !== "admin") {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Akses ditolak.",
        });
      }

      // Mencegah admin menghapus dirinya sendiri
      if (currentUser.id === input.id) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Anda tidak dapat menghapus akun Anda sendiri.",
        });
      }

      try {
        await authService.deleteUser(input.id);
        return { success: true };
      } catch (e: any) {
        console.error("Admin Delete User error:", e);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal menghapus user.",
        });
      }
    },
  }),
};
