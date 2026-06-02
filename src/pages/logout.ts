import type { APIRoute } from "astro";
import { sql } from "../lib/db";

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const refreshToken = cookies.get("refresh_token")?.value;

  // 1. Hapus session dari Database jika ada
  if (refreshToken) {
    try {
      await sql`DELETE FROM user_sessions WHERE refresh_token = ${refreshToken}`;
    } catch (e) {
      console.error("Logout DB Error:", e);
    }
  }

  // 2. Hapus semua cookie auth
  cookies.delete("access_token", { path: "/" });
  cookies.delete("refresh_token", { path: "/" });
  cookies.delete("session", { path: "/" }); // Migrasi dari session lama

  // 3. Redirect ke login
  return redirect("/login?message=Anda telah berhasil keluar dari sistem.");
};

export const GET: APIRoute = ({ redirect }) => {
  return redirect("/dashboard");
};
