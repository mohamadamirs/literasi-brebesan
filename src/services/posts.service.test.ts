import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    post: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
  return { mockPrisma };
});

vi.mock("../lib/prisma", () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

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

import prisma from "../lib/prisma";
import { postsService } from "./posts.service";

describe("postsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPublishedPosts", () => {
    it("should return published posts with default limit and offset", async () => {
      const now = new Date();
      const mockPosts = [
        {
          id: "1",
          title: "Post 1",
          content: "Content 1",
          slug: "post-1",
          status: "published",
          updatedAt: now,
          createdAt: now,
          userId: "u1",
          user: { profile: { fullName: "User 1", instagram: null, avatarUrl: null } },
          category: { name: "Tech" },
        },
      ];
      (prisma.post.findMany as any).mockResolvedValueOnce(mockPosts);

      const result = await postsService.getPublishedPosts();

      expect(prisma.post.findMany).toHaveBeenCalled();
      expect(result).toEqual([
        {
          id: "1",
          title: "Post 1",
          content: "Content 1",
          slug: "post-1",
          status: "published",
          updated_at: now,
          created_at: now,
          user_id: "u1",
          author_name: "User 1",
          author_instagram: null,
          author_avatar: null,
          category_name: "Tech",
        },
      ]);
    });

    it("should query with categoryId filter when categoryId is provided", async () => {
      (prisma.post.findMany as any).mockResolvedValueOnce([]);

      const result = await postsService.getPublishedPosts({
        categoryId: "cat-1",
      });

      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "published",
            categoryId: "cat-1",
          }),
        }),
      );
      expect(result).toEqual([]);
    });

    it("should query with search filter when search is provided", async () => {
      (prisma.post.findMany as any).mockResolvedValueOnce([]);

      const result = await postsService.getPublishedPosts({ search: "Astro" });

      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "published",
            OR: [
              { title: { contains: "Astro" } },
              { content: { contains: "Astro" } },
            ],
          }),
        }),
      );
      expect(result).toEqual([]);
    });

    it("should query with both categoryId and search filter", async () => {
      (prisma.post.findMany as any).mockResolvedValueOnce([]);

      const result = await postsService.getPublishedPosts({
        categoryId: "cat-1",
        search: "Brebes",
      });

      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "published",
            categoryId: "cat-1",
            OR: [
              { title: { contains: "Brebes" } },
              { content: { contains: "Brebes" } },
            ],
          }),
        }),
      );
      expect(result).toEqual([]);
    });
  });

  describe("getPostBySlug", () => {
    it("should return a single post when slug matches", async () => {
      const now = new Date();
      const mockPost = {
        id: "1",
        title: "Post Detail",
        content: "<p>Content</p>",
        slug: "post-detail",
        status: "published",
        updatedAt: now,
        createdAt: now,
        userId: "u1",
        user: {
          profile: {
            fullName: "Amir",
            instagram: "amir_ig",
            avatarUrl: null,
          },
        },
        category: {
          name: "General",
        },
      };
      (prisma.post.findFirst as any).mockResolvedValueOnce(mockPost);

      const result = await postsService.getPostBySlug("post-detail");

      expect(prisma.post.findFirst).toHaveBeenCalledWith({
        where: {
          slug: "post-detail",
          status: "published",
        },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
          category: true,
        },
      });
      expect(result).toEqual({
        id: "1",
        title: "Post Detail",
        content: "<p>Content</p>",
        slug: "post-detail",
        status: "published",
        updated_at: now,
        created_at: now,
        user_id: "u1",
        author_name: "Amir",
        author_instagram: "amir_ig",
        author_avatar: null,
        category_name: "General",
      });
    });

    it("should return null when post slug does not exist", async () => {
      (prisma.post.findFirst as any).mockResolvedValueOnce(null);

      const result = await postsService.getPostBySlug("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("createPost", () => {
    it("should create post with pending status if non-admin requests published", async () => {
      (prisma.post.create as any).mockResolvedValueOnce({
        id: "mock-uuid-1234",
        slug: "judul-baru-12345",
        status: "pending",
      });

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

      expect(prisma.post.create).toHaveBeenCalledWith({
        data: {
          id: "mock-uuid-1234",
          title: "Judul Baru",
          content: "<p>Konten</p>",
          status: "pending",
          userId: "user-1",
          slug: "judul-baru-12345",
          categoryId: "cat-1",
          rejectionReason: null,
        },
      });
      expect(result).toEqual({
        id: "mock-uuid-1234",
        slug: "judul-baru-12345",
        status: "pending",
      });
    });

    it("should allow admin to create post with published status", async () => {
      (prisma.post.create as any).mockResolvedValueOnce({
        id: "mock-uuid-1234",
        slug: "judul-admin-12345",
        status: "published",
      });

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
      (prisma.post.create as any).mockResolvedValueOnce({
        id: "mock-uuid-1234",
        slug: "judul-draft-12345",
        status: "draft",
      });

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
      (prisma.post.update as any).mockResolvedValueOnce({});

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

      expect(prisma.post.update).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it("should update post as user and set status to pending if requested published", async () => {
      (prisma.post.updateMany as any).mockResolvedValueOnce({ count: 1 });

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

      expect(prisma.post.updateMany).toHaveBeenCalledWith({
        where: { id: "post-1", userId: "user-1" },
        data: expect.objectContaining({
          status: "pending",
        }),
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("deletePost", () => {
    it("should delete post by id for admin", async () => {
      (prisma.post.delete as any).mockResolvedValueOnce({});

      const result = await postsService.deletePost(
        "post-1",
        "admin-id",
        "admin",
      );

      expect(prisma.post.delete).toHaveBeenCalledWith({
        where: { id: "post-1" },
      });
      expect(result).toEqual({ success: true });
    });

    it("should delete post by id and user_id for regular user", async () => {
      (prisma.post.deleteMany as any).mockResolvedValueOnce({ count: 1 });

      const result = await postsService.deletePost("post-1", "user-1", "user");

      expect(prisma.post.deleteMany).toHaveBeenCalledWith({
        where: { id: "post-1", userId: "user-1" },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("approvePost and rejectPost", () => {
    it("should approve post and set status to published", async () => {
      (prisma.post.update as any).mockResolvedValueOnce({});

      const result = await postsService.approvePost("post-1");

      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: "post-1" },
        data: {
          status: "published",
          rejectionReason: null,
        },
      });
      expect(result).toEqual({ success: true });
    });

    it("should reject post and set status to draft with rejection reason", async () => {
      (prisma.post.update as any).mockResolvedValueOnce({});

      const result = await postsService.rejectPost(
        "post-1",
        "Perlu revisi konten",
      );

      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: "post-1" },
        data: {
          status: "draft",
          rejectionReason: "Perlu revisi konten",
        },
      });
      expect(result).toEqual({ success: true });
    });
  });
});
