import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/db", () => {
  const mockSql = vi.fn();
  return {
    sql: mockSql,
    default: mockSql,
  };
});

vi.mock("../lib/utils", () => ({
  generateSlug: vi.fn(
    (title: string) => `${title.toLowerCase().replace(/\s+/g, "-")}-12345`,
  ),
}));

vi.mock("uuid", () => ({
  v4: vi.fn(() => "mock-uuid-1234"),
}));

vi.mock("sanitize-html", () => {
  const sanitize = vi.fn((html: string) => html);
  (sanitize as any).defaults = {
    allowedTags: ["p", "b", "i", "em", "strong", "a"],
    allowedAttributes: {
      a: ["href", "name", "target"],
    },
  };
  return {
    default: sanitize,
  };
});

import { sql } from "../lib/db";
import { postsService } from "./posts.service";

describe("postsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPublishedPosts", () => {
    it("should return published posts with default limit and offset", async () => {
      const mockPosts = [
        {
          id: "1",
          title: "Post 1",
          slug: "post-1",
          status: "published",
          updated_at: new Date(),
          user_id: "u1",
        },
        {
          id: "2",
          title: "Post 2",
          slug: "post-2",
          status: "published",
          updated_at: new Date(),
          user_id: "u2",
        },
      ];
      (sql as any).mockResolvedValueOnce({ rows: mockPosts } as any);

      const result = await postsService.getPublishedPosts();

      expect(sql).toHaveBeenCalled();
      expect(result).toEqual(mockPosts);
    });

    it("should query with categoryId filter when categoryId is provided", async () => {
      const mockPosts = [
        {
          id: "1",
          title: "Post 1",
          slug: "post-1",
          status: "published",
          updated_at: new Date(),
          user_id: "u1",
          category_name: "Tech",
        },
      ];
      (sql as any).mockResolvedValueOnce({ rows: mockPosts } as any);

      const result = await postsService.getPublishedPosts({
        categoryId: "cat-1",
      });

      expect(sql).toHaveBeenCalled();
      expect(result).toEqual(mockPosts);
    });

    it("should query with search filter when search is provided", async () => {
      const mockPosts = [
        {
          id: "1",
          title: "Astro Post",
          slug: "astro-post",
          status: "published",
          updated_at: new Date(),
          user_id: "u1",
        },
      ];
      (sql as any).mockResolvedValueOnce({ rows: mockPosts } as any);

      const result = await postsService.getPublishedPosts({ search: "Astro" });

      expect(sql).toHaveBeenCalled();
      expect(result).toEqual(mockPosts);
    });

    it("should query with both categoryId and search filter", async () => {
      const mockPosts = [
        {
          id: "1",
          title: "Brebes Post",
          slug: "brebes-post",
          status: "published",
          updated_at: new Date(),
          user_id: "u1",
        },
      ];
      (sql as any).mockResolvedValueOnce({ rows: mockPosts } as any);

      const result = await postsService.getPublishedPosts({
        categoryId: "cat-1",
        search: "Brebes",
      });

      expect(sql).toHaveBeenCalled();
      expect(result).toEqual(mockPosts);
    });
  });

  describe("getPostBySlug", () => {
    it("should return a single post when slug matches", async () => {
      const mockPost = {
        id: "1",
        title: "Post Detail",
        content: "<p>Content</p>",
        slug: "post-detail",
        status: "published",
        updated_at: new Date(),
        created_at: new Date(),
        user_id: "u1",
        author_name: "Amir",
        author_instagram: "amir_ig",
        author_avatar: null,
      };
      (sql as any).mockResolvedValueOnce({ rows: [mockPost] } as any);

      const result = await postsService.getPostBySlug("post-detail");

      expect(sql).toHaveBeenCalled();
      expect(result).toEqual(mockPost);
    });

    it("should return null when post slug does not exist", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await postsService.getPostBySlug("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("createPost", () => {
    it("should create post with pending status if non-admin requests published", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await postsService.createPost(
        {
          title: "Judul Baru",
          content: "<p>Konten</p>",
          status: "published",
          category_id: "cat-1",
        },
        "user-1",
        "user",
      );

      expect(sql).toHaveBeenCalled();
      expect(result).toEqual({
        id: "mock-uuid-1234",
        slug: "judul-baru-12345",
        status: "pending",
      });
    });

    it("should allow admin to create post with published status", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await postsService.createPost(
        {
          title: "Judul Admin",
          content: "<p>Konten Admin</p>",
          status: "published",
        },
        "admin-1",
        "admin",
      );

      expect(result).toEqual({
        id: "mock-uuid-1234",
        slug: "judul-admin-12345",
        status: "published",
      });
    });

    it("should create post as draft if status is draft", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await postsService.createPost(
        { title: "Judul Draft", content: "<p>Konten</p>", status: "draft" },
        "user-1",
        "user",
      );

      expect(result.status).toBe("draft");
    });
  });

  describe("updatePost", () => {
    it("should update post as admin", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await postsService.updatePost(
        "post-1",
        {
          title: "Judul Update",
          content: "<p>Updated</p>",
          status: "published",
          rejection_reason: null,
        },
        "admin",
      );

      expect(sql).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it("should update post as user and set status to pending if requested published", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await postsService.updatePost(
        "post-1",
        {
          title: "Judul Update User",
          content: "<p>Updated</p>",
          status: "published",
        },
        "user",
        "user-1",
      );

      expect(sql).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe("deletePost", () => {
    it("should delete post by id for admin", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await postsService.deletePost(
        "post-1",
        "admin-id",
        "admin",
      );

      expect(sql).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it("should delete post by id and user_id for regular user", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await postsService.deletePost("post-1", "user-1", "user");

      expect(sql).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe("approvePost and rejectPost", () => {
    it("should approve post and set status to published", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await postsService.approvePost("post-1");

      expect(sql).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it("should reject post and set status to draft with rejection reason", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await postsService.rejectPost(
        "post-1",
        "Perlu revisi konten",
      );

      expect(sql).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });
});
