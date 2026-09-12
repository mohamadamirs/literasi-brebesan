import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTx, mockPrisma } = vi.hoisted(() => {
  const mockTx = {
    user: {
      create: vi.fn(),
    },
    profile: {
      create: vi.fn(),
    },
    userSession: {
      create: vi.fn(),
    },
  };

  const mockPrisma = {
    $transaction: vi.fn(async (cb: any) => cb(mockTx)),
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userSession: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  return { mockTx, mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

vi.mock("uuid", () => ({
  v4: vi.fn(() => "mock-uuid-5678"),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    genSalt: vi.fn(async () => "salt"),
    hash: vi.fn(async () => "hashed_password"),
  },
  compare: vi.fn(),
  genSalt: vi.fn(async () => "salt"),
  hash: vi.fn(async () => "hashed_password"),
}));

vi.mock("@/shared/utils/jwt", () => ({
  createSessionToken: vi.fn(async () => "mock-jwt-token"),
  generateRefreshToken: vi.fn(() => "mock-refresh-token"),
  SECRET: new Uint8Array([1, 2, 3]),
}));

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authService } from "@/features/auth/auth.service";

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registerUser", () => {
    it("should register a new user successfully and return tokens", async () => {
      // 1. Existing user check: not found
      (prisma.user.findUnique as any).mockResolvedValueOnce(null);
      mockTx.user.create.mockResolvedValueOnce({});
      mockTx.profile.create.mockResolvedValueOnce({});
      mockTx.userSession.create.mockResolvedValueOnce({});

      const result = await authService.registerUser({
        fullName: "Test User",
        email: "test@example.com",
        password: "password123",
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(mockTx.user.create).toHaveBeenCalled();
      expect(mockTx.profile.create).toHaveBeenCalled();
      expect(mockTx.userSession.create).toHaveBeenCalled();
      expect(result.user.email).toBe("test@example.com");
      expect(result.user.fullName).toBe("Test User");
      expect(result.user.role).toBe("user");
      expect(result.accessToken).toBe("mock-jwt-token");
      expect(result.refreshToken).toBe("mock-refresh-token");
    });

    it("should throw conflict error if email is already registered", async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: "existing-id",
      });

      await expect(
        authService.registerUser({
          fullName: "Test User",
          email: "exists@example.com",
          password: "password123",
        }),
      ).rejects.toThrow("Email sudah terdaftar");
    });
  });

  describe("authenticateUser", () => {
    it("should authenticate user with valid credentials and return tokens", async () => {
      const mockUser = {
        id: "u1",
        email: "user@example.com",
        passwordHash: "hashed_password",
        profile: {
          role: "user",
          fullName: "User One",
          avatarUrl: "https://example.com/avatar.jpg",
        },
      };

      (prisma.user.findUnique as any).mockResolvedValueOnce(mockUser);
      (bcrypt.compare as any).mockResolvedValueOnce(true as never);
      (prisma.userSession.create as any).mockResolvedValueOnce({});

      const result = await authService.authenticateUser({
        email: "user@example.com",
        password: "password123",
      });

      expect(result.user.email).toBe("user@example.com");
      expect(result.user.fullName).toBe("User One");
      expect(result.accessToken).toBe("mock-jwt-token");
      expect(result.refreshToken).toBe("mock-refresh-token");
    });

    it("should throw error when user is not found", async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce(null);

      await expect(
        authService.authenticateUser({
          email: "notfound@example.com",
          password: "password123",
        }),
      ).rejects.toThrow("Email atau password Anda salah.");
    });

    it("should throw error when password does not match", async () => {
      const mockUser = {
        id: "u1",
        email: "user@example.com",
        passwordHash: "hashed_password",
        profile: {
          role: "user",
          fullName: "User One",
        },
      };

      (prisma.user.findUnique as any).mockResolvedValueOnce(mockUser);
      (bcrypt.compare as any).mockResolvedValueOnce(false as never);

      await expect(
        authService.authenticateUser({
          email: "user@example.com",
          password: "wrongpassword",
        }),
      ).rejects.toThrow("Email atau password Anda salah.");
    });
  });

  describe("refreshSession", () => {
    it("should return new session when refresh token is valid and active", async () => {
      const mockSession = {
        userId: "u1",
        expiresAt: new Date(Date.now() + 60000),
        user: {
          profile: {
            role: "user",
            fullName: "User One",
            avatarUrl: null,
          },
        },
      };

      (prisma.userSession.findUnique as any).mockResolvedValueOnce(mockSession);

      const result = await authService.refreshSession("valid-token");

      expect(result).not.toBeNull();
      expect(result?.user.id).toBe("u1");
      expect(result?.accessToken).toBe("mock-jwt-token");
    });

    it("should return null when refresh token is invalid or expired", async () => {
      (prisma.userSession.findUnique as any).mockResolvedValueOnce(null);

      const result = await authService.refreshSession("invalid-token");

      expect(result).toBeNull();
    });
  });

  describe("revokeSession", () => {
    it("should delete session by refresh token", async () => {
      (prisma.userSession.deleteMany as any).mockResolvedValueOnce({ count: 1 });

      const result = await authService.revokeSession("token-to-revoke");

      expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: { refreshToken: "token-to-revoke" },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("getUserRole", () => {
    it("should return user role if user exists", async () => {
      (prisma.profile.findUnique as any).mockResolvedValueOnce({
        role: "admin",
      });

      const role = await authService.getUserRole("user-id");

      expect(role).toBe("admin");
    });

    it("should return null if user does not exist", async () => {
      (prisma.profile.findUnique as any).mockResolvedValueOnce(null);

      const role = await authService.getUserRole("unknown-id");

      expect(role).toBeNull();
    });
  });

  describe("createPasswordResetToken", () => {
    it("should generate token and update user when user exists", async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: "u1",
        resetExpiry: null,
      });
      (prisma.user.update as any).mockResolvedValueOnce({});

      const result =
        await authService.createPasswordResetToken("test@example.com");

      expect(result).toEqual({
        token: "mock-uuid-5678",
        email: "test@example.com",
      });
    });

    it("should return null if user email does not exist", async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce(null);

      const result = await authService.createPasswordResetToken(
        "nonexistent@example.com",
      );

      expect(result).toBeNull();
    });
  });

  describe("resetPassword", () => {
    it("should successfully reset password for valid token", async () => {
      const futureExpiry = new Date(Date.now() + 30 * 60 * 1000);
      (prisma.user.findFirst as any).mockResolvedValueOnce({
        id: "u1",
        resetExpiry: futureExpiry,
      });
      (prisma.user.update as any).mockResolvedValueOnce({});

      const result = await authService.resetPassword({
        token: "valid-reset-token",
        password: "newpassword123",
      });

      expect(result).toEqual({ success: true });
    });

    it("should reject if token is expired", async () => {
      const pastExpiry = new Date(Date.now() - 1000);
      (prisma.user.findFirst as any).mockResolvedValueOnce({
        id: "u1",
        resetExpiry: pastExpiry,
      });

      await expect(
        authService.resetPassword({
          token: "expired-token",
          password: "newpassword123",
        }),
      ).rejects.toThrow("Token sudah kedaluwarsa");
    });
  });

  describe("admin user management", () => {
    it("should create user", async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce(null); // email check
      mockTx.user.create.mockResolvedValueOnce({});
      mockTx.profile.create.mockResolvedValueOnce({});

      const result = await authService.createUser({
        fullName: "New Admin",
        email: "newadmin@example.com",
        password: "password123",
        role: "admin",
      });

      expect(result.id).toBe("mock-uuid-5678");
    });

    it("should update user", async () => {
      (prisma.user.update as any).mockResolvedValueOnce({});
      (prisma.profile.update as any).mockResolvedValueOnce({});

      const result = await authService.updateUser({
        id: "u1",
        fullName: "Updated Name",
        email: "updated@example.com",
        role: "admin",
      });

      expect(result).toEqual({ success: true });
    });

    it("should delete user", async () => {
      (prisma.user.delete as any).mockResolvedValueOnce({});

      const result = await authService.deleteUser("u1");

      expect(result).toEqual({ success: true });
    });
  });
});
