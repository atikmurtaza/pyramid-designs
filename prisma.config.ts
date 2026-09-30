import { config as loadEnvironment } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnvironment({ path: ".env.local", quiet: true });
loadEnvironment({ quiet: true });

// Migration credentials are separate from runtime credentials. Never fall back
// to DATABASE_URL for migrations; the local placeholder supports validation only.
if (process.argv.includes("migrate") && !process.env.DIRECT_URL?.trim()) {
  throw new Error("DIRECT_URL is required for migration commands.");
}
const schemaOnlyUrl = "postgresql://schema-only:schema-only@127.0.0.1:5432/schema-only";

process.env.DATABASE_URL ||= schemaOnlyUrl;
process.env.DIRECT_URL ||= schemaOnlyUrl;

export default defineConfig({
  earlyAccess: true,
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
});
