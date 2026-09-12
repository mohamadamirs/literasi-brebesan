import { sql } from "../lib/db";
import { v4 as uuidv4 } from "uuid";
import { generateSlug } from "../lib/utils";
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
    const searchPattern = search ? `%${search}%` : null;

    if (categoryId && search) {
      const { rows } = await sql`
        SELECT p.title, p.content, p.slug, p.updated_at, p.user_id,
               pr.full_name as author_name, pr.instagram as author_instagram, pr.avatar_url as author_avatar,
               c.name as category_name
        FROM posts p
        LEFT JOIN profiles pr ON p.user_id = pr.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'published' 
          AND p.category_id = ${categoryId}
          AND (p.title ILIKE ${searchPattern} OR p.content ILIKE ${searchPattern})
        ORDER BY p.updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      return rows as PostItem[];
    } else if (categoryId) {
      const { rows } = await sql`
        SELECT p.title, p.content, p.slug, p.updated_at, p.user_id,
               pr.full_name as author_name, pr.instagram as author_instagram, pr.avatar_url as author_avatar,
               c.name as category_name
        FROM posts p
        LEFT JOIN profiles pr ON p.user_id = pr.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'published' AND p.category_id = ${categoryId}
        ORDER BY p.updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      return rows as PostItem[];
    } else if (search) {
      const { rows } = await sql`
        SELECT p.title, p.content, p.slug, p.updated_at, p.user_id,
               pr.full_name as author_name, pr.instagram as author_instagram, pr.avatar_url as author_avatar,
               c.name as category_name
        FROM posts p
        LEFT JOIN profiles pr ON p.user_id = pr.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'published' 
          AND (p.title ILIKE ${searchPattern} OR p.content ILIKE ${searchPattern})
        ORDER BY p.updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      return rows as PostItem[];
    } else {
      const { rows } = await sql`
        SELECT p.title, p.content, p.slug, p.updated_at, p.user_id,
               pr.full_name as author_name, pr.instagram as author_instagram, pr.avatar_url as author_avatar,
               c.name as category_name
        FROM posts p
        LEFT JOIN profiles pr ON p.user_id = pr.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'published'
        ORDER BY p.updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      return rows as PostItem[];
    }
  },

  async getPostBySlug(slug: string): Promise<PostItem | null> {
    const { rows } = await sql`
      SELECT
        p.id,
        p.title,
        p.content,
        p.slug,
        p.status,
        p.updated_at,
        p.created_at,
        p.user_id,
        pr.full_name as author_name,
        pr.instagram as author_instagram,
        pr.avatar_url as author_avatar
      FROM posts p
      LEFT JOIN profiles pr ON p.user_id = pr.id
      WHERE p.slug = ${slug} AND p.status = 'published'
      LIMIT 1
    `;
    return (rows[0] as PostItem) || null;
  },

  async createPost(
    data: CreatePostData,
    authorId: string,
    userRole: string,
  ): Promise<{ id: string; slug: string; status: string }> {
    let finalStatus = data.status || "draft";
    if (userRole !== "admin" && finalStatus === "published") {
      finalStatus = "pending";
    }

    const id = uuidv4();
    const slug = generateSlug(data.title);
    const safeContent = sanitizeHtml(data.content || "", sanitizeOptions);

    await sql`
      INSERT INTO posts (id, title, content, status, user_id, slug, updated_at, category_id, rejection_reason)
      VALUES (${id}, ${data.title}, ${safeContent}, ${finalStatus}, ${authorId}, ${slug}, NOW(), ${data.category_id || null}, NULL)
    `;

    return { id, slug, status: finalStatus };
  },

  async updatePost(
    id: string,
    data: UpdatePostData,
    userRole: string,
    authorId?: string,
  ): Promise<{ success: boolean }> {
    const newSlug = generateSlug(data.title);
    const safeContent = sanitizeHtml(data.content || "", sanitizeOptions);

    if (userRole === "admin") {
      await sql`
        UPDATE posts
        SET title = ${data.title}, content = ${safeContent}, status = ${data.status}, slug = ${newSlug}, category_id = ${data.category_id || null}, updated_at = NOW(), rejection_reason = ${data.rejection_reason || null}
        WHERE id = ${id}
      `;
    } else {
      const finalStatus = data.status === "published" ? "pending" : data.status;
      if (authorId) {
        await sql`
          UPDATE posts
          SET title = ${data.title}, content = ${safeContent}, status = ${finalStatus}, slug = ${newSlug}, category_id = ${data.category_id || null}, updated_at = NOW(), rejection_reason = NULL
          WHERE id = ${id} AND user_id = ${authorId}
        `;
      } else {
        await sql`
          UPDATE posts
          SET title = ${data.title}, content = ${safeContent}, status = ${finalStatus}, slug = ${newSlug}, category_id = ${data.category_id || null}, updated_at = NOW(), rejection_reason = NULL
          WHERE id = ${id}
        `;
      }
    }
    return { success: true };
  },

  async deletePost(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<{ success: boolean }> {
    if (userRole === "admin") {
      await sql`DELETE FROM posts WHERE id = ${id}`;
    } else {
      await sql`DELETE FROM posts WHERE id = ${id} AND user_id = ${userId}`;
    }
    return { success: true };
  },

  async approvePost(id: string): Promise<{ success: boolean }> {
    await sql`
      UPDATE posts 
      SET status = 'published', updated_at = NOW(), rejection_reason = NULL 
      WHERE id = ${id}
    `;
    return { success: true };
  },

  async rejectPost(id: string, reason: string): Promise<{ success: boolean }> {
    await sql`
      UPDATE posts 
      SET status = 'draft', rejection_reason = ${reason}, updated_at = NOW() 
      WHERE id = ${id}
    `;
    return { success: true };
  },
};
