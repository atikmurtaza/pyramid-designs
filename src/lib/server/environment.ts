import "server-only";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function secret(name: "COMPATIBILITY_PROBE_SECRET" | "CRON_SECRET") {
  const value = required(name);
  if (value.length < 32) throw new Error(`${name} must be at least 32 characters.`);
  return value;
}

function postgresUrl(name: "DATABASE_URL" | "DIRECT_URL") {
  const value = required(name);
  const protocol = new URL(value).protocol;
  if (protocol !== "postgres:" && protocol !== "postgresql:") {
    throw new Error(`${name} must be a PostgreSQL URL.`);
  }
  return value;
}

export const serverEnvironment = Object.freeze({
  databaseUrl: () => postgresUrl("DATABASE_URL"),
  directUrl: () => postgresUrl("DIRECT_URL"),
  compatibilityProbeSecret: () => secret("COMPATIBILITY_PROBE_SECRET"),
  cronSecret: () => secret("CRON_SECRET"),
});
