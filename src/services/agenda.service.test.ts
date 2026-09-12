import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/db", () => {
  const mockSql = vi.fn();
  return {
    sql: mockSql,
    default: mockSql,
  };
});

import { sql } from "../lib/db";
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
          event_date: "2026-10-01",
          event_time: "19:00 WIB",
          location: "Brebes",
          wa_link: "https://wa.me/12345",
          status: "published",
        },
      ];
      (sql as any).mockResolvedValueOnce({ rows: mockAgendas } as any);

      const result = await agendaService.getUpcomingAgendas(1);

      expect(sql).toHaveBeenCalled();
      expect(result).toEqual(mockAgendas);
    });
  });

  describe("checkPublishedConflict", () => {
    it("should return conflict if an active published agenda exists", async () => {
      const mockConflict = { id: "a1", title: "Existing Published" };
      (sql as any).mockResolvedValueOnce({ rows: [mockConflict] } as any);

      const result = await agendaService.checkPublishedConflict();

      expect(result).toEqual(mockConflict);
    });

    it("should return null if no conflict exists", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await agendaService.checkPublishedConflict();

      expect(result).toBeNull();
    });
  });

  describe("createAgenda", () => {
    it("should create agenda successfully when no conflict", async () => {
      // 1. check conflict -> none
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);
      // 2. insert
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await agendaService.createAgenda({
        title: "New Agenda",
        description: "Description 10 chars",
        event_date: "2026-10-01",
        event_time: "10:00",
        location: "Brebes",
        wa_link: "https://wa.me/12345",
        status: "published",
      });

      expect(result).toEqual({ success: true });
    });

    it("should throw conflict error if published agenda exists and override is false", async () => {
      // 1. check conflict -> exists
      (sql as any).mockResolvedValueOnce({
        rows: [{ id: "a1", title: "Active Agenda" }],
      } as any);

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
      (sql as any).mockResolvedValueOnce({
        rows: [{ id: "a1", title: "Active Agenda" }],
      } as any);
      // 2. archive existing
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);
      // 3. insert new
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

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

      expect(result).toEqual({ success: true });
    });
  });

  describe("updateAgenda", () => {
    it("should update agenda successfully", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await agendaService.updateAgenda("a1", {
        title: "Updated Agenda",
        description: "Updated description",
        event_date: "2026-10-02",
        event_time: "10:00",
        location: "Brebes",
        wa_link: "https://wa.me/12345",
        status: "draft",
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe("deleteAgenda and quickPublishAgenda", () => {
    it("should delete agenda by id", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await agendaService.deleteAgenda("a1");

      expect(result).toEqual({ success: true });
    });

    it("should quick publish agenda by archiving others and publishing target", async () => {
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);
      (sql as any).mockResolvedValueOnce({ rows: [] } as any);

      const result = await agendaService.quickPublishAgenda("a1");

      expect(result).toEqual({ success: true });
    });
  });
});
