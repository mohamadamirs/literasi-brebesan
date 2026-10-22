import { describe, it, expect, vi } from "vitest";

vi.mock("@/features/posts/posts.service", () => ({
  postsService: { getPublishedPosts: vi.fn(async () => []) },
}));

import { GET } from "@/pages/api/posts";

function callGet(query: string) {
  return GET({
    url: new URL(`https://literasibrebesan.my.id/api/posts${query}`),
  } as any);
}

describe("GET /api/posts", () => {
  it("menolak limit non-numerik dengan 400", async () => {
    const res = await callGet("?limit=abc");
    expect(res.status).toBe(400);
  });

  it("menolak limit di luar rentang dengan 400", async () => {
    expect((await callGet("?limit=0")).status).toBe(400);
    expect((await callGet("?limit=999")).status).toBe(400);
  });

  it("menolak offset negatif dengan 400", async () => {
    expect((await callGet("?offset=-1")).status).toBe(400);
  });

  it("meneruskan limit/offset yang valid ke service", async () => {
    const { postsService } = await import("@/features/posts/posts.service");
    const res = await callGet("?limit=5&offset=10");
    expect(res.status).toBe(200);
    expect(postsService.getPublishedPosts).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, offset: 10 }),
    );
  });
});
