// src/lib/jwt.ts
import { SignJWT } from "jose";
import { v4 as uuidv4 } from "uuid";

/**
 * Mengambil key JWT dari environment.
 * Fail-fast: tanpa AUTH_SECRET, `new TextEncoder().encode(undefined)` = 0 byte
 * dan jose melempar "Zero-length key is not supported" tanpa petunjuk konfigurasi.
 */
export function getAuthSecret(): Uint8Array {
  const secret = import.meta.env.AUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET belum dikonfigurasi. Set AUTH_SECRET (minimal 32 karakter) di environment.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: {
  userId: string;
  role: string;
  fullName: string;
  avatarUrl?: string | null;
}) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(getAuthSecret());
}

export function generateRefreshToken() {
  return uuidv4();
}
