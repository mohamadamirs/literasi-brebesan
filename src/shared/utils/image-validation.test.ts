import { describe, expect, it } from "vitest";
import { validateImageFile } from "./image-validation";

describe("validateImageFile", () => {
  it("accepts supported image content with a matching MIME type", async () => {
    const jpeg = new File(
      [Uint8Array.from([0xff, 0xd8, 0xff, 0x00])],
      "photo.jpg",
      { type: "image/jpeg" },
    );

    await expect(validateImageFile(jpeg)).resolves.toBe(true);
  });

  it("rejects a mismatched MIME type and oversized files", async () => {
    const mislabeled = new File(
      [Uint8Array.from([0xff, 0xd8, 0xff, 0x00])],
      "photo.png",
      { type: "image/png" },
    );
    const oversized = new File(
      [Uint8Array.from([0xff, 0xd8, 0xff, 0x00])],
      "photo.jpg",
      { type: "image/jpeg" },
    );

    await expect(validateImageFile(mislabeled)).resolves.toBe(false);
    await expect(validateImageFile(oversized, 3)).resolves.toBe(false);
  });
});
