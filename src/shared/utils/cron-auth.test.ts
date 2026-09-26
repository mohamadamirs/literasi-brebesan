import { describe, it, expect, vi } from "vitest";
import { verifyCronRequest } from "./cron-auth";

describe("verifyCronRequest", () => {
  it("harus menolak jika secret tidak dikonfigurasi (fail-closed)", async () => {
    const req = new Request("http://localhost/api/cron/cleanup", {
      headers: { Authorization: "Bearer test" },
    });

    const result = verifyCronRequest(req, "");
    expect(result.authorized).toBe(false);
    expect(result.response?.status).toBe(401);

    const body = await result.response?.json();
    expect(body.error).toContain("belum dikonfigurasi");
  });

  it("harus menolak jika header Authorization tidak disertakan", async () => {
    const req = new Request("http://localhost/api/cron/cleanup");
    const result = verifyCronRequest(req, "secret123");

    expect(result.authorized).toBe(false);
    expect(result.response?.status).toBe(401);
  });

  it("harus menolak jika token Bearer salah", async () => {
    const req = new Request("http://localhost/api/cron/cleanup", {
      headers: { Authorization: "Bearer token-salah" },
    });
    const result = verifyCronRequest(req, "secret123");

    expect(result.authorized).toBe(false);
    expect(result.response?.status).toBe(401);
  });

  it("harus meloloskan jika token Bearer valid", () => {
    const req = new Request("http://localhost/api/cron/cleanup", {
      headers: { Authorization: "Bearer secret123" },
    });
    const result = verifyCronRequest(req, "secret123");

    expect(result.authorized).toBe(true);
    expect(result.response).toBeUndefined();
  });
});
