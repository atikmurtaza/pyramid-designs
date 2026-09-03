import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { serverEnvironment } from "@/lib/server/environment";

const prismaGlobal = globalThis as typeof globalThis & {
  phase2aPrisma?: PrismaClient;
};

export function getPrisma() {
  if (prismaGlobal.phase2aPrisma) return prismaGlobal.phase2aPrisma;

  const adapter = new PrismaPg({
    connectionString: serverEnvironment.databaseUrl(),
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
    max: 3,
  });
  const prisma = new PrismaClient({ adapter });

  prismaGlobal.phase2aPrisma = prisma;
  return prisma;
}
