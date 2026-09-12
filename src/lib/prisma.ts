import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: import.meta.env.DEV ? ["error", "warn"] : ["error"],
  });

if (import.meta.env.DEV) globalForPrisma.prisma = prisma;

export default prisma;
