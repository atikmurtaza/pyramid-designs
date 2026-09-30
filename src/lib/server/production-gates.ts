import "server-only";

export const PRODUCTION_ORIGIN = "https://pyramiddesigns.co";

// Configuration selects a capability only after its separate owner release gate.
// No flag exists for real intake or production retention: both remain code-closed.
export function productionCapabilityEnabled(capability: "STAFF" | "WORKER" | "EMAIL" | "DRIVE") {
  return ["development", "test"].includes(process.env.NODE_ENV ?? "")
    || (process.env.NODE_ENV === "production" && process.env[`PRODUCTION_${capability}_ENABLED`] === "true");
}
