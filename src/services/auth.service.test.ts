import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/db", () => {
  const mockSql = vi.fn();
  return {
    sql: mockSql,
    default: mockSql,
  };
});

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

vi.mock("../lib/jwt", () => ({
  createSessionToken: vi.fn(async () => "mock-jwt-token"),
  generateRefreshToken: vi.fn(() => "mock-refresh-token"),
  SECRET: new Uint8Array([1, 2, 3]),
}));

import { sql } from "../lib/db";
import bcrypt from "bcryptjs";
import { authService } from "./auth.service";

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registerUser", () => {
    it("should register a new user successfully and return tokens", async () => {
      // 1. Existing user check: not found
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);
      // 2. Insert into users
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);
      // 3. Insert into profiles
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);
      // 4. Insert into user_sessions
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await authService.registerUser({
        fullName: "Test User",
        email: "test@example.com",
        password: "password123",
      });

      expect(result.user.email).toBe("test@example.com");
      expect(result.user.fullName).toBe("Test User");
      expect(result.user.role).toBe("user");
      expect(result.accessToken).toBe("mock-jwt-token");
      expect(result.refreshToken).toBe("mock-refresh-token");
    });

    it("should throw conflict error if email is already registered", async () => {
      (sql as any).mockResolvedValueOnce({
        rows: [{ id: "existing-id" }],
      } as any);

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
        password_hash: "hashed_password",
        role: "user",
        full_name: "User One",
        avatar_url: "https://example.com/avatar.jpg",
      };

      (sql as any).mockResolvedValueOnce({ rows: [mockUser] } as any);
      (bcrypt.compare as any).mockResolvedValueOnce(true as never);
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

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
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

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
        password_hash: "hashed_password",
        role: "user",
        full_name: "User One",
      };

      (sql as any).mockResolvedValueOnce({ rows: [mockUser] } as any);
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
        user_id: "u1",
        role: "user",
        full_name: "User One",
        avatar_url: null,
      };

      (sql as any).mockResolvedValueOnce({ rows: [mockSession] } as any);

      const result = await authService.refreshSession("valid-token");

      expect(result).not.toBeNull();
      expect(result?.user.id).toBe("u1");
      expect(result?.accessToken).toBe("mock-jwt-token");
    });

    it("should return null when refresh token is invalid or expired", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await authService.refreshSession("invalid-token");

      expect(result).toBeNull();
    });
  });

  describe("revokeSession", () => {
    it("should delete session by refresh token", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await authService.revokeSession("token-to-revoke");

      expect(sql).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe("getUserRole", () => {
    it("should return user role if user exists", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [{ role: "admin" }] } as any);

      const role = await authService.getUserRole("user-id");

      expect(role).toBe("admin");
    });

    it("should return null if user does not exist", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const role = await authService.getUserRole("unknown-id");

      expect(role).toBeNull();
    });
  });

  describe("createPasswordResetToken", () => {
    it("should generate token and update user when user exists", async () => {
      (sql as any).mockResolvedValueOnce({
        rows: [{ id: "u1", reset_expiry: null }],
      } as any);
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result =
        await authService.createPasswordResetToken("test@example.com");

      expect(result).toEqual({
        token: "mock-uuid-5678",
        email: "test@example.com",
      });
    });

    it("should return null if user email does not exist", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await authService.createPasswordResetToken(
        "nonexistent@example.com",
      );

      expect(result).toBeNull();
    });
  });

  describe("resetPassword", () => {
    it("should successfully reset password for valid token", async () => {
      const futureExpiry = new Date(Date.now() + 30 * 60 * 1000);
      (sql as any).mockResolvedValueOnce({
        rows: [{ id: "u1", reset_expiry: futureExpiry }],
      } as any);
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await authService.resetPassword({
        token: "valid-reset-token",
        password: "newpassword123",
      });

      expect(result).toEqual({ success: true });
    });

    it("should reject if token is expired", async () => {
      const pastExpiry = new Date(Date.now() - 1000);
      (sql as any).mockResolvedValueOnce({
        rows: [{ id: "u1", reset_expiry: pastExpiry }],
      } as any);

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
      (sql as any).mockResolvedValueOnce({ rows: [] } as any); // email check
      (sql as any).mockResolvedValueOnce({ rows: [] } as any); // insert user
      (sql as any).mockResolvedValueOnce({ rows: [] } as any); // insert profile

      const result = await authService.createUser({
        fullName: "New Admin",
        email: "newadmin@example.com",
        password: "password123",
        role: "admin",
      });

      expect(result.id).toBe("mock-uuid-5678");
    });

    it("should update user", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any); // update user
      (sql as any).mockResolvedValueOnce({ rows: [] } as any); // update profile

      const result = await authService.updateUser({
        id: "u1",
        fullName: "Updated Name",
        email: "updated@example.com",
        role: "admin",
      });

      expect(result).toEqual({ success: true });
    });

    it("should delete user", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await authService.deleteUser("u1");

      expect(result).toEqual({ success: true });
    });
  });
});
