// src/actions/auth.ts
import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { sql } from "../lib/db";
import { v4 as uuidv4 } from "uuid";
import { createSessionToken, generateRefreshToken } from "../lib/jwt";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

export const authActions = {
  signIn: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email("Format email tidak valid."),
      password: z.string().min(1, "Password wajib diisi."),
    }),
    handler: async (input, context) => {
      try {
        const { rows } = await sql`
          SELECT u.id, u.email, u.password_hash, p.role, p.full_name, p.avatar_url
          FROM users u
          LEFT JOIN profiles p ON u.id = p.id
          WHERE u.email = ${input.email}
        `;
        const user = rows[0];
        if (!user) {
          throw new ActionError({
            code: "UNAUTHORIZED",
            message: "Email atau password Anda salah.",
          });
        }

        const isPasswordValid = await bcrypt.compare(
          input.password,
          user.password_hash,
        );
        if (!isPasswordValid) {
          throw new ActionError({
            code: "UNAUTHORIZED",
            message: "Email atau password Anda salah.",
          });
        }

        const accessToken = await createSessionToken({
          userId: user.id,
          role: user.role || "user",
          fullName: user.full_name || "User",
          avatarUrl: user.avatar_url
        });

        const refreshToken = generateRefreshToken();
        const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 hari

        await sql`
          INSERT INTO user_sessions (user_id, refresh_token, expires_at)
          VALUES (${user.id}, ${refreshToken}, ${expiresAt})
        `;

        context.cookies.set("access_token", accessToken, {
          path: "/",
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: "lax",
          maxAge: 60 * 60 * 2, // 2 jam
        });

        context.cookies.set("refresh_token", refreshToken, {
          path: "/",
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 14, // 14 hari
        });

        // Hapus session lama jika ada (opsional, untuk migrasi)
        context.cookies.delete("session", { path: "/" });

        return { success: true };
      } catch (e: any) {
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
      try {
        const { rows: existingUser } =
          await sql`SELECT id FROM users WHERE email = ${input.email}`;
        if (existingUser.length > 0) {
          throw new ActionError({
            code: "CONFLICT",
            message: "Email sudah terdaftar, silakan gunakan email lain.",
          });
        }

        const userId = uuidv4();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(input.password, salt);

        await sql`INSERT INTO users (id, email, password_hash) VALUES (${userId}, ${input.email}, ${hashedPassword})`;
        await sql`INSERT INTO profiles (id, full_name, role) VALUES (${userId}, ${input.fullName}, 'user')`;

        const accessToken = await createSessionToken({
          userId: userId,
          role: "user",
          fullName: input.fullName,
          avatarUrl: null
        });

        const refreshToken = generateRefreshToken();
        const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

        await sql`
          INSERT INTO user_sessions (user_id, refresh_token, expires_at)
          VALUES (${userId}, ${refreshToken}, ${expiresAt})
        `;

        context.cookies.set("access_token", accessToken, {
          path: "/",
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: "lax",
          maxAge: 60 * 60 * 2, // 2 jam
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
      try {
        const { rows } = await sql`SELECT id, reset_expiry FROM users WHERE email = ${input.email}`;
        const user = rows[0];

        // Berpura-pura sukses untuk menghindari user enumeration
        if (!user) return { success: true };

        // LIMITASI (Cooldown): Cek apakah user sudah meminta reset dalam 2 menit terakhir
        if (user.reset_expiry) {
          const expiryDate = new Date(user.reset_expiry);
          // Token berlaku 1 jam (60 menit). 
          // Jika (expiryDate - 58 menit) masih di masa depan, berarti request terakhir kurang dari 2 menit yang lalu.
          const cooldownPeriod = 58 * 60 * 1000;
          const lastRequestPlusCooldown = new Date(expiryDate.getTime() - cooldownPeriod);
          const now = new Date();

          if (lastRequestPlusCooldown > now) {
            const waitTime = Math.ceil((lastRequestPlusCooldown.getTime() - now.getTime()) / 1000);
            throw new ActionError({
              code: "TOO_MANY_REQUESTS",
              message: `Harap tunggu ${waitTime} detik lagi sebelum meminta tautan reset baru.`,
            });
          }
        }

        const token = uuidv4();
        // Kedaluwarsa dalam 1 jam
        const expiry = new Date(Date.now() + 60 * 60 * 1000);

        await sql`
          UPDATE users 
          SET reset_token = ${token}, reset_expiry = ${expiry} 
          WHERE id = ${user.id}
        `;

        const resendApiKey = import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY;
        if (!resendApiKey) {
          console.error("RESEND_API_KEY is not set.");
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Sistem email belum dikonfigurasi.",
          });
        }

        const resend = new Resend(resendApiKey);

        const protocol = context.request.headers.get("x-forwarded-proto") || context.url.protocol.replace(":", "");
        const host = context.request.headers.get("x-forwarded-host") || context.request.headers.get("host") || context.url.host;
        const origin = `${protocol}://${host}`;
        const resetUrl = `${origin}/reset-password?token=${token}`;

        const senderEmail = import.meta.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "Literasi Brebesan <onboarding@resend.dev>";

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
    input: z.object({
      token: z.string(),
      password: z.string().min(6, "Password minimal 6 karakter."),
      confirmPassword: z.string()
    }).refine((data) => data.password === data.confirmPassword, {
      message: "Password dan konfirmasi tidak cocok.",
      path: ["confirmPassword"],
    }),
    handler: async (input) => {
      try {
        const { rows } = await sql`
          SELECT id, email, reset_expiry 
          FROM users 
          WHERE reset_token = ${input.token}
        `;
        const user = rows[0];

        if (!user) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: "Token tidak valid atau sudah kedaluwarsa.",
          });
        }

        const expiry = new Date(user.reset_expiry);
        const now = new Date();

        if (expiry.getTime() < now.getTime()) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: "Token sudah kedaluwarsa.",
          });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(input.password, salt);

        await sql`
          UPDATE users 
          SET password_hash = ${hashedPassword}, reset_token = NULL, reset_expiry = NULL 
          WHERE id = ${user.id}
        `;

        return { success: true };
      } catch (e: any) {
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
        const { rows: existingUser } =
          await sql`SELECT id FROM users WHERE email = ${input.email}`;
        if (existingUser.length > 0) {
          throw new ActionError({
            code: "CONFLICT",
            message: "Email sudah terdaftar.",
          });
        }

        const userId = uuidv4();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(input.password, salt);

        await sql`INSERT INTO users (id, email, password_hash) VALUES (${userId}, ${input.email}, ${hashedPassword})`;
        await sql`INSERT INTO profiles (id, full_name, role) VALUES (${userId}, ${input.fullName}, ${input.role})`;

        return { success: true };
      } catch (e: any) {
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
        throw new ActionError({ code: "UNAUTHORIZED", message: "Akses ditolak." });
      }

      try {
        // Update User (Email)
        await sql`UPDATE users SET email = ${input.email} WHERE id = ${input.id}`;
        
        // Update Profile (Name & Role)
        await sql`UPDATE profiles SET full_name = ${input.fullName}, role = ${input.role} WHERE id = ${input.id}`;

        // Update Password if provided
        if (input.password && input.password.length >= 6) {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(input.password, salt);
          await sql`UPDATE users SET password_hash = ${hashedPassword} WHERE id = ${input.id}`;
        }

        return { success: true };
      } catch (e: any) {
        console.error("Admin Update User error:", e);
        throw new ActionError({ code: "INTERNAL_SERVER_ERROR", message: "Gagal memperbarui user." });
      }
    },
  }),

  deleteUser: defineAction({
    accept: "form",
    input: z.object({ id: z.string().uuid() }),
    handler: async (input, context) => {
      const { user: currentUser } = context.locals;
      if (!currentUser || currentUser.role !== "admin") {
        throw new ActionError({ code: "UNAUTHORIZED", message: "Akses ditolak." });
      }

      // Mencegah admin menghapus dirinya sendiri
      if (currentUser.id === input.id) {
        throw new ActionError({ code: "BAD_REQUEST", message: "Anda tidak dapat menghapus akun Anda sendiri." });
      }

      try {
        // Karena CASCADE, menghapus users akan menghapus profiles & posts secara otomatis
        await sql`DELETE FROM users WHERE id = ${input.id}`;
        return { success: true };
      } catch (e: any) {
        console.error("Admin Delete User error:", e);
        throw new ActionError({ code: "INTERNAL_SERVER_ERROR", message: "Gagal menghapus user." });
      }
    },
  }),
};