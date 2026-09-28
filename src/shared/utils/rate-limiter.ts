// src/shared/utils/rate-limiter.ts
import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";

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

export class DatabaseRateLimiter {
  private getStorageKey(key: string): string {
    const digest = createHash("sha256").update(key).digest("hex");
    return `rl:${digest}`;
  }

  public async check(
    key: string,
    options: RateLimitOptions,
  ): Promise<RateLimitResult> {
    const storageKey = this.getStorageKey(key);
    const windowMicroseconds = Math.ceil(options.windowMs * 1000);

    await prisma.$executeRaw`
      INSERT IGNORE INTO drive_cache (\`key\`, value, expires_at)
      VALUES (${storageKey}, JSON_OBJECT('count', 0), CURRENT_TIMESTAMP(3))
    `;

    const updatedRows = await prisma.$executeRaw`
      UPDATE drive_cache
      SET value = CASE
            WHEN expires_at <= CURRENT_TIMESTAMP(3)
              THEN JSON_OBJECT('count', 1)
            ELSE JSON_SET(
              value,
              '$.count',
              CAST(JSON_UNQUOTE(JSON_EXTRACT(value, '$.count')) AS UNSIGNED) + 1
            )
          END,
          expires_at = CASE
            WHEN expires_at <= CURRENT_TIMESTAMP(3)
              THEN TIMESTAMPADD(MICROSECOND, ${windowMicroseconds}, CURRENT_TIMESTAMP(3))
            ELSE expires_at
          END
      WHERE \`key\` = ${storageKey}
        AND (
          expires_at <= CURRENT_TIMESTAMP(3)
          OR CAST(JSON_UNQUOTE(JSON_EXTRACT(value, '$.count')) AS UNSIGNED) < ${options.max}
        )
    `;

    const rows = await prisma.$queryRaw<
      Array<{ count: bigint | number; resetTime: Date }>
    >`
      SELECT
        CAST(JSON_UNQUOTE(JSON_EXTRACT(value, '$.count')) AS UNSIGNED) AS count,
        expires_at AS resetTime
      FROM drive_cache
      WHERE \`key\` = ${storageKey}
    `;

    if (Math.random() < 0.01) {
      await prisma.$executeRaw`
        DELETE FROM drive_cache
        WHERE \`key\` LIKE 'rl:%'
          AND expires_at < CURRENT_TIMESTAMP(3)
        LIMIT 500
      `;
    }

    const record = rows[0];
    const count = Number(record?.count ?? options.max);
    const resetTime = record?.resetTime
      ? new Date(record.resetTime).getTime()
      : Date.now() + options.windowMs;
    const success = Number(updatedRows) > 0;

    return {
      success,
      remaining: success ? Math.max(0, options.max - count) : 0,
      resetTime,
      retryAfterSeconds: Math.max(1, Math.ceil((resetTime - Date.now()) / 1000)),
    };
  }

  public async reset(key: string): Promise<void> {
    const storageKey = this.getStorageKey(key);
    await prisma.$executeRaw`
      DELETE FROM drive_cache WHERE \`key\` = ${storageKey}
    `;
  }
}

export const rateLimiter = new DatabaseRateLimiter();

/**
 * Helper untuk mengambil IP client dari request dan context Astro.
 */
export function getClientIp(
  request?: Request,
  clientAddress?: string,
): string {
  if (clientAddress && clientAddress !== "::1") {
    return clientAddress;
  }

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

  return "127.0.0.1";
}
