import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockUpdateMany } = vi.hoisted(() => {
  const mockUpdateMany = vi.fn();
  const mockPrisma = {
    agenda: {
      findFirst: vi.fn(),
      updateMany: mockUpdateMany,
    },
    $transaction: vi.fn(
      async (
        transaction:
          | ((tx: unknown) => Promise<unknown>)
          | Promise<unknown>[],
      ) => {
        if (typeof transaction === "function") {
          return transaction({ agenda: { updateMany: mockUpdateMany } });
        }
        return Promise.all(transaction);
      },
    ),
  };
  return { mockPrisma, mockUpdateMany };
});

vi.mock("@/lib/prisma", () => ({ default: mockPrisma, prisma: mockPrisma }));
vi.mock("@/shared/utils/cron-auth", () => ({
  verifyCronRequest: (request: Request) =>
    request.headers.get("authorization") === "Bearer test-secret"
      ? { authorized: true }
      : {
          authorized: false,
          response: new Response("Unauthorized", { status: 401 }),
        },
}));
import { GET } from "./publish-agenda";

const dueAgenda = {
  id: "agenda-new",
  title: "Agenda Baru",
  eventDate: new Date("2026-10-01T00:00:00.000Z"),
  eventTime: "10:00",
  location: "Brebes",
  waLink: "https://wa.me/6281234567890",
  imageUrl: null,
  publishAt: new Date(Date.now() - 60_000),
};

function createContext(authorized = true) {
  return {
    request: new Request("https://example.test/api/cron/publish-agenda", {
      headers: authorized ? { authorization: "Bearer test-secret" } : {},
    }),
  } as Parameters<typeof GET>[0];
}

describe("publish-agenda cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("rejects requests without the cron secret", async () => {
    const response = await GET(createContext(false));

    expect(response.status).toBe(401);
    expect(mockPrisma.agenda.findFirst).not.toHaveBeenCalled();
  });

  it("returns success without changing statuses when nothing is due", async () => {
    mockPrisma.agenda.findFirst.mockResolvedValueOnce(null);

    const response = await GET(createContext());

    expect(response.status).toBe(200);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("claims the due agenda before archiving older agenda records", async () => {
    mockPrisma.agenda.findFirst.mockResolvedValueOnce(dueAgenda);

    const response = await GET(createContext());

    expect(response.status).toBe(200);
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(mockUpdateMany).toHaveBeenCalledTimes(3);
    expect(mockUpdateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: dueAgenda.id,
        status: "scheduled",
        publishAt: { lte: expect.any(Date) },
      },
      data: { status: "published" },
    });
    expect(mockUpdateMany).toHaveBeenNthCalledWith(2, {
      where: { status: "published", id: { not: dueAgenda.id } },
      data: { status: "archived" },
    });
    expect(mockUpdateMany).toHaveBeenNthCalledWith(3, {
      where: {
        status: "scheduled",
        publishAt: { lte: dueAgenda.publishAt },
        id: { not: dueAgenda.id },
      },
      data: { status: "archived" },
    });
  });

  it("does not archive anything when another cron has already claimed the agenda", async () => {
    mockPrisma.agenda.findFirst.mockResolvedValueOnce(dueAgenda);
    mockUpdateMany.mockResolvedValueOnce({ count: 0 });

    const response = await GET(createContext());

    expect(response.status).toBe(200);
    expect(mockUpdateMany).toHaveBeenCalledOnce();
    const body = await response.json();
    expect(body.message).toContain("sudah diproses");
  });
});
