import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/prisma", () => {
  const mockPrisma = {
    agenda: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  return {
    default: mockPrisma,
    prisma: mockPrisma,
  };
});

import prisma from "../lib/prisma";
import { agendaService } from "./agenda.service";

describe("agendaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUpcomingAgendas", () => {
    it("should query upcoming published agendas", async () => {
      const mockAgendas = [
        {
          id: "agenda-1",
          title: "Diskusi Buku",
          description: "Diskusi buku mingguan",
          eventDate: new Date("2026-10-01"),
          eventTime: "19:00 WIB",
          location: "Brebes",
          waLink: "https://wa.me/12345",
          imageUrl: null,
          status: "published",
          publishAt: null,
          createdAt: new Date(),
        },
      ];
      (prisma.agenda.findMany as any).mockResolvedValueOnce(mockAgendas);

      const result = await agendaService.getUpcomingAgendas(1);

      expect(prisma.agenda.findMany).toHaveBeenCalled();
      expect(result).toEqual([
        {
          id: "agenda-1",
          title: "Diskusi Buku",
          description: "Diskusi buku mingguan",
          event_date: mockAgendas[0].eventDate,
          event_time: "19:00 WIB",
          location: "Brebes",
          wa_link: "https://wa.me/12345",
          image_url: null,
          status: "published",
          publish_at: null,
          created_at: mockAgendas[0].createdAt,
        },
      ]);
    });
  });

  describe("checkPublishedConflict", () => {
    it("should return conflict if an active published agenda exists", async () => {
      const mockConflict = {
        id: "a1",
        title: "Existing Published",
        description: "Desc",
        eventDate: new Date("2026-10-01"),
        eventTime: "10:00",
        location: "Brebes",
        waLink: "https://wa.me/123",
        imageUrl: null,
        status: "published",
        publishAt: null,
        createdAt: new Date(),
      };
      (prisma.agenda.findFirst as any).mockResolvedValueOnce(mockConflict);

      const result = await agendaService.checkPublishedConflict();

      expect(result).toEqual({
        id: "a1",
        title: "Existing Published",
        description: "Desc",
        event_date: mockConflict.eventDate,
        event_time: "10:00",
        location: "Brebes",
        wa_link: "https://wa.me/123",
        image_url: null,
        status: "published",
        publish_at: null,
        created_at: mockConflict.createdAt,
      });
    });

    it("should return null if no conflict exists", async () => {
      (prisma.agenda.findFirst as any).mockResolvedValueOnce(null);

      const result = await agendaService.checkPublishedConflict();

      expect(result).toBeNull();
    });
  });

  describe("createAgenda", () => {
    it("should create agenda successfully when no conflict", async () => {
      // 1. check conflict -> none
      (prisma.agenda.findFirst as any).mockResolvedValueOnce(null);
      // 2. insert
      (prisma.agenda.create as any).mockResolvedValueOnce({ id: "new-id" });

      const result = await agendaService.createAgenda({
        title: "New Agenda",
        description: "Description 10 chars",
        event_date: "2026-10-01",
        event_time: "10:00",
        location: "Brebes",
        wa_link: "https://wa.me/12345",
        status: "published",
      });

      expect(prisma.agenda.create).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it("should throw conflict error if published agenda exists and override is false", async () => {
      // 1. check conflict -> exists
      (prisma.agenda.findFirst as any).mockResolvedValueOnce({
        id: "a1",
        title: "Active Agenda",
        description: "Desc",
        eventDate: new Date("2026-10-01"),
        eventTime: "10:00",
        location: "Brebes",
        waLink: "https://wa.me/123",
        status: "published",
      });

      await expect(
        agendaService.createAgenda({
          title: "New Agenda",
          description: "Description 10 chars",
          event_date: "2026-10-01",
          event_time: "10:00",
          location: "Brebes",
          wa_link: "https://wa.me/12345",
          status: "published",
          override_published: false,
        }),
      ).rejects.toThrow("sedang ditayangkan");
    });

    it("should archive conflicting agenda if override_published is true", async () => {
      // 1. check conflict -> exists
      (prisma.agenda.findFirst as any).mockResolvedValueOnce({
        id: "a1",
        title: "Active Agenda",
        description: "Desc",
        eventDate: new Date("2026-10-01"),
        eventTime: "10:00",
        location: "Brebes",
        waLink: "https://wa.me/123",
        status: "published",
      });
      // 2. archive existing
      (prisma.agenda.update as any).mockResolvedValueOnce({});
      // 3. insert new
      (prisma.agenda.create as any).mockResolvedValueOnce({ id: "new-id" });

      const result = await agendaService.createAgenda({
        title: "New Agenda",
        description: "Description 10 chars",
        event_date: "2026-10-01",
        event_time: "10:00",
        location: "Brebes",
        wa_link: "https://wa.me/12345",
        status: "published",
        override_published: true,
      });

      expect(prisma.agenda.update).toHaveBeenCalledWith({
        where: { id: "a1" },
        data: { status: "archived" },
      });
      expect(prisma.agenda.create).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe("updateAgenda", () => {
    it("should update agenda successfully", async () => {
      (prisma.agenda.update as any).mockResolvedValueOnce({});

      const result = await agendaService.updateAgenda("a1", {
        title: "Updated Agenda",
        description: "Updated description",
        event_date: "2026-10-02",
        event_time: "10:00",
        location: "Brebes",
        wa_link: "https://wa.me/12345",
        status: "draft",
      });

      expect(prisma.agenda.update).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe("deleteAgenda and quickPublishAgenda", () => {
    it("should delete agenda by id", async () => {
      (prisma.agenda.delete as any).mockResolvedValueOnce({});

      const result = await agendaService.deleteAgenda("a1");

      expect(prisma.agenda.delete).toHaveBeenCalledWith({
        where: { id: "a1" },
      });
      expect(result).toEqual({ success: true });
    });

    it("should quick publish agenda by archiving others and publishing target", async () => {
      (prisma.agenda.updateMany as any).mockResolvedValueOnce({ count: 1 });
      (prisma.agenda.update as any).mockResolvedValueOnce({});

      const result = await agendaService.quickPublishAgenda("a1");

      expect(prisma.agenda.updateMany).toHaveBeenCalledWith({
        where: { status: "published" },
        data: { status: "archived" },
      });
      expect(prisma.agenda.update).toHaveBeenCalledWith({
        where: { id: "a1" },
        data: { status: "published", publishAt: null },
      });
      expect(result).toEqual({ success: true });
    });
  });
});
