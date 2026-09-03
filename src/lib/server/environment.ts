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

export const serverEnvironment = Object.freeze({
  compatibilityProbeSecret: () => secret("COMPATIBILITY_PROBE_SECRET"),
  cronSecret: () => secret("CRON_SECRET"),
});
