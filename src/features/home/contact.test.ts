import { describe, it, expect, vi, beforeEach } from "vitest";
import { contactActions } from "./contact";
import { ActionError } from "astro:actions";

describe("sendContact", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "");
  });

  const input = {
    name: "Budi",
    email: "budi@example.com",
    subject: "Halo Literasi",
    message: "Ini pesan uji coba yang cukup panjang.",
  };

  it("tidak melempar error saat modul diimpor tanpa RESEND_API_KEY", async () => {
    const mod = await import("./contact");
    expect(mod.contactActions).toBeDefined();
  });

  it("menolak dengan pesan jelas ketika RESEND_API_KEY kosong", async () => {
    await expect(
      (contactActions.sendContact as any).handler(input, {}),
    ).rejects.toBeInstanceOf(ActionError);
  });
});
