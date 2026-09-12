import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const agendas = await prisma.agenda.findMany({
      where: {
        eventDate: {
          gte: today,
        },
        status: "published",
      },
      orderBy: {
        eventDate: "asc",
      },
      take: limit,
    });

    return agendas.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      event_date: a.eventDate,
      event_time: a.eventTime,
      location: a.location,
      wa_link: a.waLink,
      image_url: a.imageUrl,
      status: a.status as any,
      publish_at: a.publishAt,
      created_at: a.createdAt,
    }));
  },

  async getAgendaById(id: string): Promise<AgendaItem | null> {
    const a = await prisma.agenda.findUnique({
      where: { id },
    });

    if (!a) return null;

    return {
      id: a.id,
      title: a.title,
      description: a.description,
      event_date: a.eventDate,
      event_time: a.eventTime,
      location: a.location,
      wa_link: a.waLink,
      image_url: a.imageUrl,
      status: a.status as any,
      publish_at: a.publishAt,
      created_at: a.createdAt,
    };
  },

  async checkPublishedConflict(excludeId?: string): Promise<AgendaItem | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const conflict = await prisma.agenda.findFirst({
      where: {
        status: "published",
        eventDate: {
          gte: today,
        },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    if (!conflict) return null;

    return {
      id: conflict.id,
      title: conflict.title,
      description: conflict.description,
      event_date: conflict.eventDate,
      event_time: conflict.eventTime,
      location: conflict.location,
      wa_link: conflict.waLink,
      image_url: conflict.imageUrl,
      status: conflict.status as any,
      publish_at: conflict.publishAt,
      created_at: conflict.createdAt,
    };
  },

  async archivePublishedAgendas(): Promise<{ success: boolean }> {
    await prisma.agenda.updateMany({
      where: { status: "published" },
      data: { status: "archived" },
    });
    return { success: true };
  },

  async getAgendaImageUrl(id: string): Promise<string | null> {
    const agenda = await prisma.agenda.findUnique({
      where: { id },
      select: { imageUrl: true },
    });
    return agenda?.imageUrl || null;
  },

  async createAgenda(data: CreateAgendaData): Promise<{ success: boolean }> {
    if (data.status === "published") {
      const conflict = await this.checkPublishedConflict();
      if (conflict) {
        if (data.override_published) {
          await prisma.agenda.update({
            where: { id: conflict.id },
            data: { status: "archived" },
          });
        } else {
          const error: any = new Error(
            `Agenda "${conflict.title}" sedang ditayangkan. Silakan centang opsi "Timpa Agenda" jika ingin melanjutkan.`
          );
          error.code = "CONFLICT";
          throw error;
        }
      }
    }

    let publishTime: Date | null = null;
    if (data.status === "scheduled") {
      if (!data.publish_at) {
        const error: any = new Error("Mohon isi tanggal rilis otomatis.");
        error.code = "BAD_REQUEST";
        throw error;
      }
      publishTime = new Date(data.publish_at);
    } else if (data.status === "published") {
      publishTime = new Date();
    }

    await prisma.agenda.create({
      data: {
        id: uuidv4(),
        title: data.title,
        description: data.description,
        eventDate: new Date(data.event_date),
        eventTime: data.event_time,
        location: data.location,
        waLink: data.wa_link,
        status: data.status,
        publishAt: publishTime,
        imageUrl: data.image_url || null,
      },
    });

    return { success: true };
  },

  async updateAgenda(
    id: string,
    data: CreateAgendaData
  ): Promise<{ success: boolean }> {
    if (data.status === "published") {
      const conflict = await this.checkPublishedConflict(id);
      if (conflict) {
        if (data.override_published) {
          await prisma.agenda.update({
            where: { id: conflict.id },
            data: { status: "archived" },
          });
        } else {
          const error: any = new Error(
            `Agenda "${conflict.title}" sedang ditayangkan. Silakan centang opsi "Timpa Agenda" jika ingin melanjutkan.`
          );
          error.code = "CONFLICT";
          throw error;
        }
      }
    }

    let publishTime: Date | null = null;
    if (data.status === "scheduled") {
      if (!data.publish_at) {
        const error: any = new Error("Mohon isi tanggal rilis otomatis.");
        error.code = "BAD_REQUEST";
        throw error;
      }
      publishTime = new Date(data.publish_at);
    } else if (data.status === "published") {
      publishTime = new Date();
    }

    const updateData: any = {
      title: data.title,
      description: data.description,
      eventDate: new Date(data.event_date),
      eventTime: data.event_time,
      location: data.location,
      waLink: data.wa_link,
      status: data.status,
      publishAt: publishTime,
    };

    if (data.image_url !== undefined) {
      updateData.imageUrl = data.image_url;
    }

    await prisma.agenda.update({
      where: { id },
      data: updateData,
    });

    return { success: true };
  },

  async deleteAgenda(id: string): Promise<{ success: boolean }> {
    await prisma.agenda.delete({ where: { id } });
    return { success: true };
  },

  async quickPublishAgenda(id: string): Promise<{ success: boolean }> {
    await prisma.agenda.updateMany({
      where: { status: "published" },
      data: { status: "archived" },
    });
    await prisma.agenda.update({
      where: { id },
      data: { status: "published", publishAt: null },
    });
    return { success: true };
  },
};
