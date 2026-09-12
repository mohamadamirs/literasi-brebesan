import { sql } from "../lib/db";

export interface AgendaItem {
  id: string;
  title: string;
  description: string;
  event_date: string | Date;
  event_time: string;
  location: string;
  wa_link: string;
  image_url?: string | null;
  status: "draft" | "published" | "scheduled" | "archived";
  publish_at?: string | Date | null;
  created_at?: string | Date;
}

export interface CreateAgendaData {
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  wa_link: string;
  status: "draft" | "published" | "scheduled" | "archived";
  publish_at?: string | null;
  image_url?: string | null;
  override_published?: boolean;
}

export interface UpdateAgendaData extends CreateAgendaData {
  id: string;
}

export const agendaService = {
  async getUpcomingAgendas(limit: number = 1): Promise<AgendaItem[]> {
    const { rows } = await sql`
      SELECT * FROM agendas
      WHERE event_date >= CURRENT_DATE
        AND status = 'published'
      ORDER BY event_date ASC
      LIMIT ${limit}
    `;
    return rows as AgendaItem[];
  },

  async getAgendaById(id: string): Promise<AgendaItem | null> {
    const { rows } = await sql`SELECT * FROM agendas WHERE id = ${id}`;
    return (rows[0] as AgendaItem) || null;
  },

  async checkPublishedConflict(excludeId?: string): Promise<AgendaItem | null> {
    let rows;
    if (excludeId) {
      const res = await sql`
        SELECT id, title FROM agendas 
        WHERE status = 'published' AND event_date >= CURRENT_DATE AND id != ${excludeId} 
        LIMIT 1
      `;
      rows = res.rows;
    } else {
      const res = await sql`
        SELECT id, title FROM agendas 
        WHERE status = 'published' AND event_date >= CURRENT_DATE 
        LIMIT 1
      `;
      rows = res.rows;
    }
    return (rows[0] as AgendaItem) || null;
  },

  async archivePublishedAgendas(): Promise<{ success: boolean }> {
    await sql`UPDATE agendas SET status = 'archived' WHERE status = 'published'`;
    return { success: true };
  },

  async getAgendaImageUrl(id: string): Promise<string | null> {
    const { rows } = await sql`SELECT image_url FROM agendas WHERE id = ${id}`;
    return rows[0]?.image_url || null;
  },

  async createAgenda(data: CreateAgendaData): Promise<{ success: boolean }> {
    if (data.status === "published") {
      const conflict = await this.checkPublishedConflict();
      if (conflict) {
        if (data.override_published) {
          await sql`UPDATE agendas SET status = 'archived' WHERE id = ${conflict.id}`;
        } else {
          const error: any = new Error(
            `Agenda "${conflict.title}" sedang ditayangkan. Silakan centang opsi "Timpa Agenda" jika ingin melanjutkan.`,
          );
          error.code = "CONFLICT";
          throw error;
        }
      }
    }

    let publishTime: string | null = null;
    if (data.status === "scheduled") {
      if (!data.publish_at) {
        const error: any = new Error("Mohon isi tanggal rilis otomatis.");
        error.code = "BAD_REQUEST";
        throw error;
      }
      publishTime = data.publish_at;
    } else if (data.status === "published") {
      publishTime = new Date().toISOString();
    }

    await sql`
      INSERT INTO agendas (title, description, event_date, event_time, location, wa_link, status, publish_at, image_url)
      VALUES (${data.title}, ${data.description}, ${data.event_date}, ${data.event_time}, ${data.location}, ${data.wa_link}, ${data.status}, ${publishTime}, ${data.image_url || null})
    `;

    return { success: true };
  },

  async updateAgenda(
    id: string,
    data: CreateAgendaData,
  ): Promise<{ success: boolean }> {
    if (data.status === "published") {
      const conflict = await this.checkPublishedConflict(id);
      if (conflict) {
        if (data.override_published) {
          await sql`UPDATE agendas SET status = 'archived' WHERE id = ${conflict.id}`;
        } else {
          const error: any = new Error(
            `Agenda "${conflict.title}" sedang ditayangkan. Silakan centang opsi "Timpa Agenda" jika ingin melanjutkan.`,
          );
          error.code = "CONFLICT";
          throw error;
        }
      }
    }

    let publishTime: string | null = null;
    if (data.status === "scheduled") {
      if (!data.publish_at) {
        const error: any = new Error("Mohon isi tanggal rilis otomatis.");
        error.code = "BAD_REQUEST";
        throw error;
      }
      publishTime = data.publish_at;
    } else if (data.status === "published") {
      publishTime = new Date().toISOString();
    }

    if (data.image_url !== undefined) {
      await sql`
        UPDATE agendas 
        SET title=${data.title}, description=${data.description}, event_date=${data.event_date}, event_time=${data.event_time}, location=${data.location}, wa_link=${data.wa_link}, status=${data.status}, publish_at=${publishTime}, image_url=${data.image_url} 
        WHERE id=${id}
      `;
    } else {
      await sql`
        UPDATE agendas 
        SET title=${data.title}, description=${data.description}, event_date=${data.event_date}, event_time=${data.event_time}, location=${data.location}, wa_link=${data.wa_link}, status=${data.status}, publish_at=${publishTime} 
        WHERE id=${id}
      `;
    }

    return { success: true };
  },

  async deleteAgenda(id: string): Promise<{ success: boolean }> {
    await sql`DELETE FROM agendas WHERE id = ${id}`;
    return { success: true };
  },

  async quickPublishAgenda(id: string): Promise<{ success: boolean }> {
    await sql`UPDATE agendas SET status = 'archived' WHERE status = 'published'`;
    await sql`UPDATE agendas SET status = 'published', publish_at = NULL WHERE id = ${id}`;
    return { success: true };
  },
};
