import { defineMiddleware } from "astro:middleware";
import { jwtVerify } from "jose";
import { sql } from "./lib/db";
import { SECRET, createSessionToken } from "./lib/jwt";

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, url, redirect, locals } = context;

  // 1. BYPASS SEO & STATIC FILES
  const seoFiles = ['/sitemap.xml', '/robots.txt', '/favicon.ico'];
  if (seoFiles.some(file => url.pathname === file || url.pathname === file + '/')) {
    return next();
  }

  const accessToken = cookies.get("access_token")?.value;
  const refreshToken = cookies.get("refresh_token")?.value;
  let userData = null;

  // JALUR 1: VERIFIKASI ACCESS TOKEN (JWT)
  if (accessToken) {
    try {
      const { payload } = await jwtVerify(accessToken, SECRET);
      userData = {
        id: (payload.userId as string) || "",
        role: (payload.role as string) || "user",
        fullName: (payload.fullName as string) || "User",
        avatarUrl: (payload.avatarUrl as string) || undefined,
      };
    } catch (e: any) {
      // Access token expired atau invalid, lanjut ke Jalur Refresh
      cookies.delete("access_token", { path: "/" });
    }
  }

  // JALUR 2: REFRESH FLOW (JIKA ACCESS TOKEN TIDAK ADA/EXPIRED)
  if (!userData && refreshToken) {
    try {
      // Cek Refresh Token ke Database
      const { rows } = await sql`
        SELECT s.user_id, p.role, p.full_name, p.avatar_url
        FROM user_sessions s
        JOIN profiles p ON s.user_id = p.id
        WHERE s.refresh_token = ${refreshToken} AND s.expires_at > NOW()
        LIMIT 1
      `;

      const session = rows[0];

      if (session) {
        // Refresh token valid, terbitkan access token baru
        userData = {
          id: session.user_id,
          role: session.role,
          fullName: session.full_name,
          avatarUrl: session.avatar_url,
        };

        const newAccessToken = await createSessionToken({
          userId: userData.id,
          role: userData.role,
          fullName: userData.fullName,
          avatarUrl: userData.avatarUrl,
        });

        // Set cookie baru
        cookies.set("access_token", newAccessToken, {
          path: "/",
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: "lax",
          maxAge: 60 * 60 * 2, // 2 jam
        });
      } else {
        // Refresh token invalid atau expired di DB
        cookies.delete("refresh_token", { path: "/" });
      }
    } catch (e) {
      console.error("Refresh Flow Error:", e);
    }
  }

  locals.user = userData;

  // 3. CEK OTORISASI ADMIN (DATABASE RE-VERIFICATION)
  if (userData && url.pathname.startsWith("/admin")) {
    const { rows } = await sql`SELECT role FROM profiles WHERE id = ${userData.id} LIMIT 1`;
    const currentRole = rows[0]?.role;

    if (currentRole !== "admin") {
      cookies.delete("access_token", { path: "/" });
      cookies.delete("refresh_token", { path: "/" });
      return redirect("/login?error=unauthorized");
    }
  }

  // LOGIKA TENDANG STANDAR
  const isAuthPage =
    url.pathname.startsWith("/login") || url.pathname.startsWith("/register");
  const isProtected =
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/user") ||
    url.pathname.startsWith("/dashboard");

  if (!userData && isProtected) {
    return redirect("/login");
  }

  if (userData && isAuthPage) {
    return redirect("/dashboard");
  }

  return next();
});
