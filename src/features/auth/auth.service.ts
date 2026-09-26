import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { createSessionToken, generateRefreshToken } from "@/shared/utils/jwt";

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
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      const error: any = new Error(
        "Email sudah terdaftar, silakan gunakan email lain."
      );
      error.code = "CONFLICT";
      throw error;
    }

    const userId = uuidv4();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          email,
          passwordHash: hashedPassword,
        },
      });

      await tx.profile.create({
        data: {
          id: userId,
          fullName,
          role: "user",
        },
      });

      await tx.userSession.create({
        data: {
          userId,
          refreshToken,
          expiresAt,
        },
      });
    });

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
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
      },
    });

    if (!user) {
      const error: any = new Error("Email atau password Anda salah.");
      error.code = "UNAUTHORIZED";
      throw error;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      const error: any = new Error("Email atau password Anda salah.");
      error.code = "UNAUTHORIZED";
      throw error;
    }

    const role = user.profile?.role || "user";
    const fullName = user.profile?.fullName || "User";
    const avatarUrl = user.profile?.avatarUrl || null;

    const accessToken = await createSessionToken({
      userId: user.id,
      role,
      fullName,
      avatarUrl,
    });

    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
      },
    });

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
    const session = await prisma.userSession.findUnique({
      where: { refreshToken: token },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!session || session.expiresAt <= new Date()) {
      return null;
    }

    const userData = {
      id: session.userId,
      role: session.user?.profile?.role || "user",
      fullName: session.user?.profile?.fullName || "User",
      avatarUrl: session.user?.profile?.avatarUrl || null,
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
    await prisma.userSession.deleteMany({
      where: { refreshToken: token },
    });
    return { success: true };
  },

  async createPasswordResetToken(
    email: string
  ): Promise<{ token: string; email: string } | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) return null;

    if (user.resetExpiry) {
      const cooldownPeriod = 58 * 60 * 1000;
      const lastRequestPlusCooldown = new Date(
        user.resetExpiry.getTime() - cooldownPeriod
      );
      const now = new Date();

      if (lastRequestPlusCooldown > now) {
        const waitTime = Math.ceil(
          (lastRequestPlusCooldown.getTime() - now.getTime()) / 1000
        );
        const error: any = new Error(
          `Harap tunggu ${waitTime} detik lagi sebelum meminta tautan reset baru.`
        );
        error.code = "TOO_MANY_REQUESTS";
        throw error;
      }
    }

    const token = uuidv4();
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetExpiry: expiry,
      },
    });

    return { token, email };
  },

  async changePassword({
    userId,
    currentPassword,
    newPassword,
  }: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error("User tidak ditemukan.");
    }
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      const error: any = new Error("Password saat ini salah.");
      error.code = "BAD_REQUEST";
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    // REVOKE ALL SESSIONS TO FORCE RELOGIN (Security Issue 2)
    await prisma.userSession.deleteMany({
      where: { userId },
    });

    return { success: true };
  },

  async resetPassword({
    token,
    password,
  }: {
    token: string;
    password: string;
  }): Promise<{ success: boolean }> {
    const user = await prisma.user.findFirst({
      where: { resetToken: token },
    });

    if (!user) {
      const error: any = new Error("Token tidak valid atau sudah kedaluwarsa.");
      error.code = "BAD_REQUEST";
      throw error;
    }

    if (!user.resetExpiry || user.resetExpiry.getTime() < Date.now()) {
      const error: any = new Error("Token sudah kedaluwarsa.");
      error.code = "BAD_REQUEST";
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetToken: null,
        resetExpiry: null,
      },
    });

    // REVOKE ALL SESSIONS TO SECURE THE ACCOUNT
    await prisma.userSession.deleteMany({
      where: { userId: user.id },
    });

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
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      const error: any = new Error("Email sudah terdaftar.");
      error.code = "CONFLICT";
      throw error;
    }

    const userId = uuidv4();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          email,
          passwordHash: hashedPassword,
        },
      });
      await tx.profile.create({
        data: {
          id: userId,
          fullName,
          role,
        },
      });
    });

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
    const existingProfile = await prisma.profile.findUnique({
      where: { id },
      select: { role: true }
    });

    const dataToUpdate: any = { email };
    let shouldRevokeSessions = false;

    if (password && password.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      dataToUpdate.passwordHash = await bcrypt.hash(password, salt);
      shouldRevokeSessions = true;
    }

    if (existingProfile?.role !== role) {
      shouldRevokeSessions = true;
    }

    await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    await prisma.profile.update({
      where: { id },
      data: {
        fullName,
        role,
      },
    });

    if (shouldRevokeSessions) {
      await prisma.userSession.deleteMany({
        where: { userId: id },
      });
    }

    return { success: true };
  },

  async getUserRole(userId: string): Promise<string | null> {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return profile?.role || null;
  },

  async deleteUser(id: string): Promise<{ success: boolean }> {
    await prisma.user.delete({
      where: { id },
    });
    return { success: true };
  },
};
