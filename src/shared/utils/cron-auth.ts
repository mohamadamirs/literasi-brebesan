// src/shared/utils/cron-auth.ts

/**
 * Memvalidasi apakah request cron memiliki token Bearer yang sah sesuai CRON_SECRET.
 * Menerapkan prinsip fail-closed: jika CRON_SECRET tidak terkonfigurasi, request otomatis ditolak.
 */
export function verifyCronRequest(
  request: Request,
  configuredSecret?: string,
): { authorized: boolean; response?: Response } {
  const secret =
    configuredSecret ??
    (import.meta.env.CRON_SECRET || process.env.CRON_SECRET);

  if (!secret) {
    console.error("[CRON_AUTH] CRON_SECRET belum disetel di environment.");
    return {
      authorized: false,
      response: new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized: CRON_SECRET belum dikonfigurasi.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      ),
    };
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return {
      authorized: false,
      response: new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      ),
    };
  }

  return { authorized: true };
}
