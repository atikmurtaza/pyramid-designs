import "server-only";

const DEFAULT_STAFF_DESTINATION = "/staff";

export function safeStaffRedirectPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return DEFAULT_STAFF_DESTINATION;
  }

  try {
    const parsed = new URL(value, "https://staff.invalid");
    if (
      parsed.origin !== "https://staff.invalid" ||
      (parsed.pathname !== "/staff" && !parsed.pathname.startsWith("/staff/"))
    ) {
      return DEFAULT_STAFF_DESTINATION;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_STAFF_DESTINATION;
  }
}
