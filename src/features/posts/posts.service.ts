import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { generateSlug } from "@/shared/utils/utils";
import sanitizeHtml from "sanitize-html";

export const sanitizeOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img",
    "h1",
    "h2",
    "blockquote",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ["src", "alt", "class", "width", "height"],
  },
  allowedSchemes: ["http", "https", "data"],
};

export interface GetPublishedPostsParams {
  limit?: number;
  offset?: number;
  categoryId?: string | null;
  search?: string | null;
}

export interface CreatePostData {
  title: string;
  content?: string | null;
  status?: "draft" | "pending" | "published";
  category_id?: string | null;
}

export interface UpdatePostData {
  title: string;
  content?: string | null;
  status: "draft" | "pending" | "published";
  category_id?: string | null;
  rejection_reason?: string | null;
}

export interface PostItem {
  id?: string;
  title: string;
  content?: string | null;
  slug: string;
  status?: string;
  updated_at: Date | string;
  created_at?: Date | string;
  user_id: string;
  author_name?: string | null;
  author_instagram?: string | null;
  author_avatar?: string | null;
  category_name?: string | null;
}

export const postsService = {
  async getPublishedPosts({
    limit = 9,
    offset = 0,
    categoryId,
    search,
  }: GetPublishedPostsParams = {}): Promise<PostItem[]> {
    const where: any = {
      status: "published",
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const posts = await prisma.post.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        slug: true,
        status: true,
        updatedAt: true,
        createdAt: true,
        userId: true,
        user: {
          select: {
            profile: {
              select: {
                fullName: true,
                instagram: true,
                avatarUrl: true,
              },
            },
          },
        },
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    return posts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      slug: p.slug || "",
      status: p.status,
      updated_at: p.updatedAt,
      created_at: p.createdAt,
      user_id: p.userId,
      author_name: p.user?.profile?.fullName || null,
      author_instagram: p.user?.profile?.instagram || null,
      author_avatar: p.user?.profile?.avatarUrl || null,
      category_name: p.category?.name || null,
    }));
  },

  async getPostBySlug(slug: string): Promise<PostItem | null> {
    const post = await prisma.post.findFirst({
      where: {
        slug,
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

    if (!post) return null;

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      slug: post.slug || "",
      status: post.status,
      updated_at: post.updatedAt,
      created_at: post.createdAt,
      user_id: post.userId,
      author_name: post.user?.profile?.fullName || null,
      author_instagram: post.user?.profile?.instagram || null,
      author_avatar: post.user?.profile?.avatarUrl || null,
      category_name: post.category?.name || null,
    };
  },

  async createPost(
    data: CreatePostData,
    authorId: string,
    userRole: string
  ): Promise<{ id: string; slug: string; status: string }> {
    let finalStatus = data.status || "draft";
    if (userRole !== "admin" && finalStatus === "published") {
      finalStatus = "pending";
    }

    const id = uuidv4();
    const slug = generateSlug(data.title);
    const safeContent = sanitizeHtml(data.content || "", sanitizeOptions);

    const created = await prisma.post.create({
      data: {
        id,
        title: data.title,
        content: safeContent,
        status: finalStatus,
        userId: authorId,
        slug,
        categoryId: data.category_id || null,
        rejectionReason: null,
      },
    });

    return { id: created.id, slug: created.slug || slug, status: created.status };
  },

  async updatePost(
    id: string,
    data: UpdatePostData,
    userRole: string,
    authorId?: string
  ): Promise<{ success: boolean }> {
    const newSlug = generateSlug(data.title);
    const safeContent = sanitizeHtml(data.content || "", sanitizeOptions);

    if (userRole === "admin") {
      await prisma.post.update({
        where: { id },
        data: {
          title: data.title,
          content: safeContent,
          status: data.status,
          slug: newSlug,
          categoryId: data.category_id || null,
          rejectionReason: data.rejection_reason || null,
        },
      });
    } else {
      const finalStatus =
        data.status === "published" ? "pending" : data.status;
      const where: any = { id };
      if (authorId) {
        where.userId = authorId;
      }
      await prisma.post.updateMany({
        where,
        data: {
          title: data.title,
          content: safeContent,
          status: finalStatus,
          slug: newSlug,
          categoryId: data.category_id || null,
          rejectionReason: null,
        },
      });
    }
    return { success: true };
  },

  async deletePost(
    id: string,
    userId: string,
    userRole: string
  ): Promise<{ success: boolean }> {
    if (userRole === "admin") {
      await prisma.post.delete({ where: { id } });
    } else {
      await prisma.post.deleteMany({
        where: { id, userId },
      });
    }
    return { success: true };
  },

  async approvePost(id: string): Promise<{ success: boolean }> {
    await prisma.post.update({
      where: { id },
      data: {
        status: "published",
        rejectionReason: null,
      },
    });
    return { success: true };
  },

  async rejectPost(id: string, reason: string): Promise<{ success: boolean }> {
    await prisma.post.update({
      where: { id },
      data: {
        status: "draft",
        rejectionReason: reason,
      },
    });
    return { success: true };
  },
};
