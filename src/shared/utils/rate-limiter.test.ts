import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRateLimiter, getClientIp } from "./rate-limiter";

describe("MemoryRateLimiter", () => {
  let limiter: MemoryRateLimiter;

  beforeEach(() => {
    limiter = new MemoryRateLimiter();
  });

  it("harus mengizinkan request jika masih dalam batas limit", () => {
    const res1 = limiter.check("test-key", { max: 3, windowMs: 10000 });
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = limiter.check("test-key", { max: 3, windowMs: 10000 });
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = limiter.check("test-key", { max: 3, windowMs: 10000 });
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("harus menolak request jika melebihi batas limit", () => {
    limiter.check("test-key", { max: 2, windowMs: 10000 });
    limiter.check("test-key", { max: 2, windowMs: 10000 });

    const blocked = limiter.check("test-key", { max: 2, windowMs: 10000 });
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("harus mereset limit setelah window waktu terlewati", async () => {
    limiter.check("test-key", { max: 1, windowMs: 50 });
    const blocked = limiter.check("test-key", { max: 1, windowMs: 50 });
    expect(blocked.success).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 60));

    const retry = limiter.check("test-key", { max: 1, windowMs: 50 });
    expect(retry.success).toBe(true);
    expect(retry.remaining).toBe(0);
  });

  it("harus dapat mereset kunci tertentu secara manual", () => {
    limiter.check("test-key", { max: 1, windowMs: 10000 });
    expect(limiter.check("test-key", { max: 1, windowMs: 10000 }).success).toBe(
      false,
    );

    limiter.reset("test-key");
    expect(limiter.check("test-key", { max: 1, windowMs: 10000 }).success).toBe(
      true,
    );
  });
});

describe("getClientIp", () => {
  it("harus mendeteksi IP dari cf-connecting-ip jika ada", () => {
    const req = new Request("http://localhost", {
      headers: { "cf-connecting-ip": "203.0.113.195" },
    });
    expect(getClientIp(req, "127.0.0.1")).toBe("203.0.113.195");
  });

  it("harus mendeteksi IP pertama dari x-forwarded-for jika ada", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "198.51.100.1, 10.0.0.1" },
    });
    expect(getClientIp(req, "127.0.0.1")).toBe("198.51.100.1");
  });

  it("harus mendeteksi IP dari x-real-ip jika ada", () => {
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "198.51.100.25" },
    });
    expect(getClientIp(req, "127.0.0.1")).toBe("198.51.100.25");
  });

  it("harus fallback ke clientAddress atau 127.0.0.1", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req, "192.168.1.10")).toBe("192.168.1.10");
    expect(getClientIp(undefined, undefined)).toBe("127.0.0.1");
  });
});
