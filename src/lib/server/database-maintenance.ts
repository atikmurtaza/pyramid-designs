import "server-only";

export function databaseMaintenanceEnabled() {
  const value = process.env.DATABASE_MAINTENANCE?.trim().toLowerCase();
  return Boolean(value && value !== "false");
}

export class DatabaseMaintenanceError extends Error {
  constructor() {
    super("Database maintenance is active.");
    this.name = "DatabaseMaintenanceError";
  }
}

export function requireDatabaseWritesEnabled() {
  if (databaseMaintenanceEnabled()) throw new DatabaseMaintenanceError();
}

export function maintenanceBlocksRequest(method: string, pathname: string) {
  return databaseMaintenanceEnabled() && (
    !["GET", "HEAD", "OPTIONS"].includes(method)
    || /^\/(?:api|staff|internal)(?:\/|$)/.test(pathname)
  );
}
