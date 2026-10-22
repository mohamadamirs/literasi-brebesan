import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockListFiles, mockDeleteFile } = vi.hoisted(() => ({
  mockListFiles: vi.fn(),
  mockDeleteFile: vi.fn(),
}));

vi.mock("imagekit", () => ({
  default: class {
    listFiles = mockListFiles;
    deleteFile = mockDeleteFile;
  },
}));

import { deleteFromImageKitByUrl } from "@/shared/utils/imagekit";

describe("deleteFromImageKitByUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("IMAGEKIT_URL_ENDPOINT", "https://ik.imagekit.io/literasibrebesan");
  });

  it("mencari file dengan path folder + limit eksplisit", async () => {
    mockListFiles.mockResolvedValueOnce([
      {
        fileId: "fid-1",
        url: "https://ik.imagekit.io/literasibrebesan/posts/u1/a.png",
      },
    ]);

    await deleteFromImageKitByUrl(
      "https://ik.imagekit.io/literasibrebesan/posts/u1/a.png",
      "literasibrebesan/posts/u1",
    );

    expect(mockListFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/literasibrebesan/posts/u1",
        searchQuery: 'name="a.png"',
        limit: 1000,
      }),
    );
    expect(mockDeleteFile).toHaveBeenCalledWith("fid-1");
  });

  it("tetap cocok ketika URL endpoint sudah memuat segmen folder", async () => {
    vi.stubEnv(
      "IMAGEKIT_URL_ENDPOINT",
      "https://ik.imagekit.io/literasibrebesan",
    );
    mockListFiles.mockResolvedValueOnce([
      {
        fileId: "fid-2",
        url: "https://ik.imagekit.io/literasibrebesan/posts/u1/b.png",
      },
    ]);

    await deleteFromImageKitByUrl(
      "https://ik.imagekit.io/literasibrebesan/posts/u1/b.png",
      "literasibrebesan/posts/u1",
    );

    expect(mockDeleteFile).toHaveBeenCalledWith("fid-2");
  });

  it("tidak menghapus file di luar folder yang diizinkan", async () => {
    await deleteFromImageKitByUrl(
      "https://ik.imagekit.io/literasibrebesan/other/a.png",
      "literasibrebesan/posts/u1",
    );

    expect(mockListFiles).not.toHaveBeenCalled();
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });

  it("mencari file di subfolder (upload artikel memakai /<userId>/<YYYY-MM>/)", async () => {
    mockListFiles.mockResolvedValueOnce([
      {
        fileId: "fid-3",
        url: "https://ik.imagekit.io/literasibrebesan/posts/u1/2026-10/a.png",
      },
    ]);

    await deleteFromImageKitByUrl(
      "https://ik.imagekit.io/literasibrebesan/posts/u1/2026-10/a.png",
      "literasibrebesan/posts/u1",
    );

    expect(mockListFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/literasibrebesan/posts/u1/2026-10",
        searchQuery: 'name="a.png"',
      }),
    );
    expect(mockDeleteFile).toHaveBeenCalledWith("fid-3");
  });

  it("tidak menghapus file milik user lain walau di folder yang sama", async () => {
    await deleteFromImageKitByUrl(
      "https://ik.imagekit.io/literasibrebesan/posts/u2/a.png",
      "literasibrebesan/posts/u1",
    );

    expect(mockListFiles).not.toHaveBeenCalled();
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });

  it("tidak menghapus file yang tidak ada di hasil pencarian", async () => {
    mockListFiles.mockResolvedValueOnce([]);

    await deleteFromImageKitByUrl(
      "https://ik.imagekit.io/literasibrebesan/posts/u1/a.png",
      "literasibrebesan/posts/u1",
    );

    expect(mockDeleteFile).not.toHaveBeenCalled();
  });
});
