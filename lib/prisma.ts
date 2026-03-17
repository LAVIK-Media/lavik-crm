import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const localUrl = process.env.LOCAL_DATABASE_URL;
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const useLocal = process.env.NODE_ENV !== "production";
  const url = (useLocal ? localUrl : tursoUrl) ?? localUrl ?? tursoUrl;

  if (!url) {
    throw new Error("Missing TURSO_DATABASE_URL (or LOCAL_DATABASE_URL for dev)");
  }

  // Local dev: always use the local SQLite file via libSQL adapter.
  // (Prisma v7 removed `url` from schema and doesn't accept `datasourceUrl`.)
  if (useLocal) {
    if (!localUrl?.startsWith("file:")) {
      throw new Error("Missing LOCAL_DATABASE_URL (expected file:...)");
    }
    const adapter = new PrismaLibSql({ url: localUrl });
    return new PrismaClient({ adapter });
  }

  if (!authToken) {
    throw new Error("Missing TURSO_AUTH_TOKEN");
  }

  const adapter = new PrismaLibSql({ url, authToken });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

