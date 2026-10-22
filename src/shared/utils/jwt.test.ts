import { describe, it, expect, vi, afterEach } from "vitest";
import { getAuthSecret } from "./jwt";

describe("getAuthSecret", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("melempar error jelas ketika AUTH_SECRET kosong", () => {
    vi.stubEnv("AUTH_SECRET", "");
    expect(() => getAuthSecret()).toThrow(/AUTH_SECRET/);
  });

  it("mengembalikan key berupa byte dari AUTH_SECRET", () => {
    vi.stubEnv("AUTH_SECRET", "rahasia-uji-123");
    const secret = getAuthSecret();
    expect(secret.length).toBeGreaterThan(0);
    expect(new TextDecoder().decode(secret)).toBe("rahasia-uji-123");
  });
});
