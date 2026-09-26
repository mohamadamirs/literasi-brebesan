// src/shared/utils/rate-limiter.ts

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimitOptions {
  windowMs: number; // Durasi jendela waktu dalam ms
  max: number; // Batas maksimum permintaan dalam jendela waktu
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfterSeconds: number;
}

export class MemoryRateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private maxStoreSize = 10000;

  /**
   * Periksa dan catat percobaan akses.
   */
  public check(key: string, options: RateLimitOptions): RateLimitResult {
    const now = Date.now();
    const existing = this.store.get(key);

    // Bersihkan entri lama jika toko terlalu besar
    if (this.store.size > this.maxStoreSize) {
      this.cleanup(now);
    }

    if (!existing || now >= existing.resetTime) {
      const resetTime = now + options.windowMs;
      this.store.set(key, {
        count: 1,
        resetTime,
      });

      return {
        success: true,
        remaining: Math.max(0, options.max - 1),
        resetTime,
        retryAfterSeconds: Math.ceil(options.windowMs / 1000),
      };
    }

    if (existing.count >= options.max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((existing.resetTime - now) / 1000),
      );

      return {
        success: false,
        remaining: 0,
        resetTime: existing.resetTime,
        retryAfterSeconds,
      };
    }

    existing.count += 1;
    const remaining = Math.max(0, options.max - existing.count);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.resetTime - now) / 1000),
    );

    return {
      success: true,
      remaining,
      resetTime: existing.resetTime,
      retryAfterSeconds,
    };
  }

  /**
   * Reset entri untuk kunci tertentu (misal setelah login sukses).
   */
  public reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Hapus seluruh data di store (berguna untuk testing).
   */
  public clear(): void {
    this.store.clear();
  }

  /**
   * Membersihkan entri yang sudah kadaluarsa.
   */
  private cleanup(now: number): void {
    for (const [key, record] of this.store.entries()) {
      if (now >= record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// Global instance
export const rateLimiter = new MemoryRateLimiter();

/**
 * Helper untuk mengambil IP client dari request dan context Astro.
 */
export function getClientIp(
  request?: Request,
  clientAddress?: string,
): string {
  if (request) {
    const cfIp = request.headers.get("cf-connecting-ip");
    if (cfIp) return cfIp.trim();

    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }

    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
  }

  if (clientAddress && clientAddress !== "::1") {
    return clientAddress;
  }

  return "127.0.0.1";
}
