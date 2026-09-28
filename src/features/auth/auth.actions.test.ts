import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRateLimiter } = vi.hoisted(() => {
  const store = new Map<string, { count: number; resetTime: number }>();
  return {
    mockRateLimiter: {
      check: vi.fn((key: string, options: { max: number; windowMs: number }) => {
        const now = Date.now();
        let record = store.get(key);
        if (!record || now >= record.resetTime) {
          record = { count: 0, resetTime: now + options.windowMs };
          store.set(key, record);
        }
        if (record.count >= options.max) {
          return {
            success: false,
            remaining: 0,
            resetTime: record.resetTime,
            retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000),
          };
        }
        record.count += 1;
        return {
          success: true,
          remaining: options.max - record.count,
          resetTime: record.resetTime,
          retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000),
        };
      }),
      reset: vi.fn((key: string) => store.delete(key)),
      clear: vi.fn(() => store.clear()),
    },
  };
});

vi.mock("@/shared/utils/rate-limiter", () => ({
  rateLimiter: mockRateLimiter,
  getClientIp: (_request: Request, clientAddress?: string) =>
    clientAddress || "127.0.0.1",
}));

vi.mock("@/features/auth/auth.service", () => ({
  authService: {
    authenticateUser: vi.fn().mockRejectedValue({
      code: "UNAUTHORIZED",
      message: "Email atau password salah",
    }),
    registerUser: vi.fn().mockResolvedValue({
      accessToken: "mock-access",
      refreshToken: "mock-refresh",
    }),
    createPasswordResetToken: vi.fn(),
  },
}));

import { authActions } from "./auth";
import { ActionError } from "astro:actions";

describe("authActions rate limiting", () => {
  beforeEach(() => {
    mockRateLimiter.clear();
    vi.clearAllMocks();
  });

  const createMockContext = (ip: string) => ({
    request: new Request("http://localhost", {
      headers: { "x-forwarded-for": ip },
    }),
    clientAddress: ip,
    cookies: {
      set: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
    } as any,
    locals: {} as any,
    url: new URL("http://localhost"),
    isPrerendered: false,
    params: {},
    site: undefined,
    generator: "test",
  });

  it("harus melempar TOO_MANY_REQUESTS setelah 10 kali percobaan signIn gagal dari IP yang sama", async () => {
    const mockContext = createMockContext("192.168.1.50");
    const input = { email: "test@example.com", password: "wrong-password" };

    // 10 percobaan pertama gagal otentikasi (UNAUTHORIZED)
    for (let i = 0; i < 10; i++) {
      try {
        await (authActions.signIn as any).handler(input, mockContext);
      } catch (err: any) {
        expect(err.code).toBe("UNAUTHORIZED");
      }
    }

    // Percobaan ke-11 harus diblokir oleh rate limiter (TOO_MANY_REQUESTS)
    try {
      await (authActions.signIn as any).handler(input, mockContext);
      expect.unreachable("Harusnya melempar TOO_MANY_REQUESTS");
    } catch (err: any) {
      expect(err).toBeInstanceOf(ActionError);
      expect(err.code).toBe("TOO_MANY_REQUESTS");
      expect(err.message).toContain("Terlalu banyak percobaan");
    }
  });

  it("harus membatasi pendaftaran register jika melebihi batas limit per IP", async () => {
    const mockContext = createMockContext("192.168.1.60");
    const input = {
      fullName: "Test User",
      email: "newuser@example.com",
      password: "password123",
    };

    // 5 pendaftaran diizinkan
    for (let i = 0; i < 5; i++) {
      const res = await (authActions.register as any).handler(
        input,
        mockContext,
      );
      expect(res.success).toBe(true);
    }

    // Pendaftaran ke-6 harus diblokir
    try {
      await (authActions.register as any).handler(input, mockContext);
      expect.unreachable("Harusnya melempar TOO_MANY_REQUESTS");
    } catch (err: any) {
      expect(err).toBeInstanceOf(ActionError);
      expect(err.code).toBe("TOO_MANY_REQUESTS");
      expect(err.message).toContain("Terlalu banyak pendaftaran");
    }
  });

  it("harus membatasi forgotPassword jika melebihi batas limit", async () => {
    const mockContext = createMockContext("192.168.1.70");
    const input = { email: "forgot@example.com" };

    for (let i = 0; i < 3; i++) {
      const res = await (authActions.forgotPassword as any).handler(
        input,
        mockContext,
      );
      expect(res.success).toBe(true);
    }

    // Permintaan ke-4 harus diblokir
    try {
      await (authActions.forgotPassword as any).handler(input, mockContext);
      expect.unreachable("Harusnya melempar TOO_MANY_REQUESTS");
    } catch (err: any) {
      expect(err).toBeInstanceOf(ActionError);
      expect(err.code).toBe("TOO_MANY_REQUESTS");
      expect(err.message).toContain("Terlalu banyak permintaan reset kata sandi");
    }
  });
});
