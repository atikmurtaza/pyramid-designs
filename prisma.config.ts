import { config as loadEnvironment } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnvironment({ path: ".env.local", quiet: true });
loadEnvironment({ quiet: true });

const migrationUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  // Used only so schema validation can run before provider setup.
  // Migration commands safely fail against this local address if no real URL is set.
  "postgresql://schema-only:schema-only@127.0.0.1:5432/schema-only";

process.env.DATABASE_URL ??= migrationUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: { url: migrationUrl },
});
