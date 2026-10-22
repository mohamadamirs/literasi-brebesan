import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { parseWibDateTime } from "@/shared/utils/utils";

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

export type PromoteDueAgendaResult =
  /** Agenda due berhasil ditayangkan. */
  | "published"
  /** Tidak ada agenda `scheduled` yang sudah jatuh tempo. */
  | "none"
  /** Ada publikasi yang lebih baru (mis. admin publish manual) → tidak ditimpa. */
  | "superseded"
  /** Agenda sudah diklaim pemanggil lain (cron/request paralel). */
  | "claimed";

export const agendaService = {
  /**
   * Promosikan agenda `scheduled` yang sudah jatuh tempo menjadi `published`.
   *
   * Dipakai dua jalur supaya `publish_at` benar-benar tayang pada waktunya:
   * - cron harian `/api/cron/publish-agenda` (jalur utama, tanpa butuh trafik);
   * - pembacaan agenda publik `/api/agendas` (pemicu tepat waktu), karena cron
   *   Vercel plan Hobby hanya boleh berjalan sekali sehari sehingga agenda
   *   terjadwal bisa telat sampai ~1 hari.
   *
   * Satu agenda per pemanggilan (yang publish_at-nya paling awal) supaya
   * agenda tertua tidak dilewati. Publikasi yang lebih baru tidak ditimpa.
   */
  async promoteDueAgenda(): Promise<PromoteDueAgendaResult> {
    const now = new Date();
    const due = await prisma.agenda.findFirst({
      where: { status: "scheduled", publishAt: { lte: now } },
      orderBy: { publishAt: "asc" },
    });
    if (!due) return "none";

    const live = await prisma.agenda.findFirst({
      where: { status: "published" },
      select: { publishAt: true },
    });
    if (live?.publishAt && due.publishAt && live.publishAt >= due.publishAt) {
      return "superseded";
    }

    const published = await prisma.$transaction(async (tx) => {
      // Claim dulu (optimistic lock): dua pemanggil paralel tidak boleh
      // mempublikasikan agenda yang sama.
      const claim = await tx.agenda.updateMany({
        where: { id: due.id, status: "scheduled", publishAt: { lte: now } },
        data: { status: "published" },
      });
      if (claim.count === 0) return false;

      // Invariant: hanya satu agenda yang published. Sisanya diarsipkan.
      await tx.agenda.updateMany({
        where: { status: "published", id: { not: due.id } },
        data: { status: "archived" },
      });
      return true;
    });

    return published ? "published" : "claimed";
  },

  async getUpcomingAgendas(limit: number = 1): Promise<AgendaItem[]> {
    // Hanya agenda berstatus "published" yang tayang di publik. Filter
    // eventDate >= today pernah membuat agenda yang sudah tayang (tanggal
    // lewat) hilang dari beranda padahal statusnya published.
    const agendas = await prisma.agenda.findMany({
      where: {
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
    // Invariant: hanya satu agenda berstatus "published" pada satu waktu.
    // Filter eventDate >= today dulu membuat agenda bertanggal lampau
    // tidak dianggap konflik sehingga DB bisa punya lebih dari satu published.
    const conflict = await prisma.agenda.findFirst({
      where: {
        status: "published",
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
      publishTime = parseWibDateTime(data.publish_at);
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
      publishTime = parseWibDateTime(data.publish_at);
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
    };

    // draft/archived: publishAt dibiarkan apa adanya. Jadwal yang sudah diisi
    // tidak boleh hilang hanya karena agenda sementara diturunkan dari tayang.
    if (publishTime !== null) {
      updateData.publishAt = publishTime;
    }

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
      data: { status: "published", publishAt: new Date() },
    });
    return { success: true };
  },
};
