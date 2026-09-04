import "server-only";

import { authorizeBeforeTargetStateLookup } from "./auth/authorization.ts";
import type { StaffPrincipal } from "./auth/session.ts";

export type StaffPortalNavigationItem = Readonly<{
  href: string;
  label: string;
}>;

const PORTAL_AREAS = [
  { href: "/staff/content", label: "Content", operation: "content.list_metadata", type: "CONTENT" },
  { href: "/staff/jobs", label: "Jobs", operation: "job.list_metadata", type: "JOB" },
  { href: "/staff/applications", label: "Applications", operation: "application.list_metadata", type: "APPLICATION" },
  { href: "/staff/audit", label: "Audit history", operation: "audit.events.read", type: "AUDIT" },
] as const;

export function staffPortalNavigation(principal: StaffPrincipal): StaffPortalNavigationItem[] {
  return PORTAL_AREAS.flatMap((area) =>
    authorizeBeforeTargetStateLookup(principal, {
      operation: area.operation,
      target: { type: area.type },
    }).allowed
      ? [{ href: area.href, label: area.label }]
      : [],
  );
}
