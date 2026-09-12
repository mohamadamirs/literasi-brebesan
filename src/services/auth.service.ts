import { sql } from "../lib/db";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { createSessionToken, generateRefreshToken } from "../lib/jwt";

export interface RegisterUserInput {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthenticateUserInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    role: string;
    fullName: string;
    avatarUrl?: string | null;
  };
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface RefreshSessionResult {
  user: {
    id: string;
    role: string;
    fullName: string;
    avatarUrl?: string | null;
  };
  accessToken: string;
}

export const authService = {
  async registerUser({
    email,
    password,
    fullName,
  }: RegisterUserInput): Promise<AuthResult> {
    const { rows: existingUser } =
      await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existingUser.length > 0) {
      const error: any = new Error(
        "Email sudah terdaftar, silakan gunakan email lain.",
      );
      error.code = "CONFLICT";
      throw error;
    }

    const userId = uuidv4();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await sql`INSERT INTO users (id, email, password_hash) VALUES (${userId}, ${email}, ${hashedPassword})`;
    await sql`INSERT INTO profiles (id, full_name, role) VALUES (${userId}, ${fullName}, 'user')`;

    const user = {
      id: userId,
      email,
      role: "user",
      fullName,
      avatarUrl: null,
    };

    const accessToken = await createSessionToken({
      userId,
      role: "user",
      fullName,
      avatarUrl: null,
    });

    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await sql`
      INSERT INTO user_sessions (user_id, refresh_token, expires_at)
      VALUES (${userId}, ${refreshToken}, ${expiresAt.toISOString()})
    `;

    return {
      user,
      accessToken,
      refreshToken,
      expiresAt,
    };
  },

  async authenticateUser({
    email,
    password,
  }: AuthenticateUserInput): Promise<AuthResult> {
    const { rows } = await sql`
      SELECT u.id, u.email, u.password_hash, p.role, p.full_name, p.avatar_url
      FROM users u
      LEFT JOIN profiles p ON u.id = p.id
      WHERE u.email = ${email}
    `;

    const user = rows[0];
    if (!user) {
      const error: any = new Error("Email atau password Anda salah.");
      error.code = "UNAUTHORIZED";
      throw error;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      const error: any = new Error("Email atau password Anda salah.");
      error.code = "UNAUTHORIZED";
      throw error;
    }

    const role = user.role || "user";
    const fullName = user.full_name || "User";
    const avatarUrl = user.avatar_url || null;

    const accessToken = await createSessionToken({
      userId: user.id,
      role,
      fullName,
      avatarUrl,
    });

    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await sql`
      INSERT INTO user_sessions (user_id, refresh_token, expires_at)
      VALUES (${user.id}, ${refreshToken}, ${expiresAt.toISOString()})
    `;

    return {
      user: {
        id: user.id,
        email: user.email,
        role,
        fullName,
        avatarUrl,
      },
      accessToken,
      refreshToken,
      expiresAt,
    };
  },

  async refreshSession(token: string): Promise<RefreshSessionResult | null> {
    const { rows } = await sql`
      SELECT s.user_id, p.role, p.full_name, p.avatar_url
      FROM user_sessions s
      JOIN profiles p ON s.user_id = p.id
      WHERE s.refresh_token = ${token} AND s.expires_at > NOW()
      LIMIT 1
    `;

    const session = rows[0];
    if (!session) {
      return null;
    }

    const userData = {
      id: session.user_id,
      role: session.role || "user",
      fullName: session.full_name || "User",
      avatarUrl: session.avatar_url || null,
    };

    const accessToken = await createSessionToken({
      userId: userData.id,
      role: userData.role,
      fullName: userData.fullName,
      avatarUrl: userData.avatarUrl,
    });

    return {
      user: userData,
      accessToken,
    };
  },

  async revokeSession(token: string): Promise<{ success: boolean }> {
    await sql`DELETE FROM user_sessions WHERE refresh_token = ${token}`;
    return { success: true };
  },

  async createPasswordResetToken(
    email: string,
  ): Promise<{ token: string; email: string } | null> {
    const { rows } =
      await sql`SELECT id, reset_expiry FROM users WHERE email = ${email}`;
    const user = rows[0];
    if (!user) return null;

    if (user.reset_expiry) {
      const expiryDate = new Date(user.reset_expiry);
      const cooldownPeriod = 58 * 60 * 1000;
      const lastRequestPlusCooldown = new Date(
        expiryDate.getTime() - cooldownPeriod,
      );
      const now = new Date();

      if (lastRequestPlusCooldown > now) {
        const waitTime = Math.ceil(
          (lastRequestPlusCooldown.getTime() - now.getTime()) / 1000,
        );
        const error: any = new Error(
          `Harap tunggu ${waitTime} detik lagi sebelum meminta tautan reset baru.`,
        );
        error.code = "TOO_MANY_REQUESTS";
        throw error;
      }
    }

    const token = uuidv4();
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await sql`
      UPDATE users 
      SET reset_token = ${token}, reset_expiry = ${expiry.toISOString()} 
      WHERE id = ${user.id}
    `;

    return { token, email };
  },

  async resetPassword({
    token,
    password,
  }: {
    token: string;
    password: string;
  }): Promise<{ success: boolean }> {
    const { rows } = await sql`
      SELECT id, email, reset_expiry 
      FROM users 
      WHERE reset_token = ${token}
    `;
    const user = rows[0];

    if (!user) {
      const error: any = new Error("Token tidak valid atau sudah kedaluwarsa.");
      error.code = "BAD_REQUEST";
      throw error;
    }

    const expiry = new Date(user.reset_expiry);
    const now = new Date();

    if (expiry.getTime() < now.getTime()) {
      const error: any = new Error("Token sudah kedaluwarsa.");
      error.code = "BAD_REQUEST";
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await sql`
      UPDATE users 
      SET password_hash = ${hashedPassword}, reset_token = NULL, reset_expiry = NULL 
      WHERE id = ${user.id}
    `;

    return { success: true };
  },

  async createUser({
    fullName,
    email,
    password,
    role = "user",
  }: {
    fullName: string;
    email: string;
    password: string;
    role?: "user" | "admin";
  }): Promise<{ id: string }> {
    const { rows: existingUser } =
      await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existingUser.length > 0) {
      const error: any = new Error("Email sudah terdaftar.");
      error.code = "CONFLICT";
      throw error;
    }

    const userId = uuidv4();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await sql`INSERT INTO users (id, email, password_hash) VALUES (${userId}, ${email}, ${hashedPassword})`;
    await sql`INSERT INTO profiles (id, full_name, role) VALUES (${userId}, ${fullName}, ${role})`;

    return { id: userId };
  },

  async updateUser({
    id,
    fullName,
    email,
    role,
    password,
  }: {
    id: string;
    fullName: string;
    email: string;
    role: "user" | "admin";
    password?: string;
  }): Promise<{ success: boolean }> {
    await sql`UPDATE users SET email = ${email} WHERE id = ${id}`;
    await sql`UPDATE profiles SET full_name = ${fullName}, role = ${role} WHERE id = ${id}`;

    if (password && password.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await sql`UPDATE users SET password_hash = ${hashedPassword} WHERE id = ${id}`;
    }

    return { success: true };
  },

  async getUserRole(userId: string): Promise<string | null> {
    const { rows } =
      await sql`SELECT role FROM profiles WHERE id = ${userId} LIMIT 1`;
    return rows[0]?.role || null;
  },

  async deleteUser(id: string): Promise<{ success: boolean }> {
    await sql`DELETE FROM users WHERE id = ${id}`;
    return { success: true };
  },
};
