import "server-only";

import type { StaffRole } from "../repositories/staff.ts";

import type { StaffPrincipal } from "./session";

export const AUTHORIZATION_OPERATIONS = [
  "content.list_metadata",
  "content.draft.read",
  "content.create",
  "content.edit",
  "content.publish",
  "content.archive",
  "site_settings.public.edit",
  "site_settings.recruitment.edit",
  "job.list_metadata",
  "job.draft.read",
  "job.create",
  "job.edit",
  "job.publish",
  "job.close",
  "job.archive",
  "job.question.manage",
  "application.list_metadata",
  "application.contact.read",
  "application.answers.read",
  "application.accommodation.read",
  "application.hiring_status.change",
  "application.note.create",
  "application.note.read",
  "application.withdraw.record",
  "candidate_file.state.read",
  "candidate_file.security_review.initiate",
  "candidate_file.security_review.retrieve_quarantine",
  "candidate_file.security_review.record_outcome",
  "candidate_file.cleared.download",
  "candidate_file.delete.request",
  "candidate_file.delete.execute",
  "retention.expiry.read",
  "retention.deletion.request",
  "retention.deletion.execute",
  "retention.policy.change",
  "audit.events.read",
  "staff.manage",
  "staff.roles.manage",
  "operational_policy.configure",
] as const;

export type AuthorizationOperation = (typeof AUTHORIZATION_OPERATIONS)[number];

export type AuthorizationTargetType =
  | "CONTENT"
  | "SITE_SETTINGS"
  | "JOB"
  | "APPLICATION"
  | "CANDIDATE_FILE"
  | "RETENTION"
  | "AUDIT"
  | "STAFF"
  | "OPERATIONAL_POLICY";

export type AuthorizationState = Readonly<{
  assignedApplicationContext?: boolean;
  technicalStatus?: string;
  hiringStatus?: string | null;
  requestedHiringStatus?: string;
  publicationState?: string;
  approvedContent?: boolean;
  lifecycleState?: string;
  publishable?: boolean;
  validationStatus?: string;
  fileTechnicalStatus?: string;
  securityStatus?: string;
  retentionPermitsAccess?: boolean;
  deletionRequested?: boolean;
  deletionCompleted?: boolean;
  hashMatchesReview?: boolean;
  inRecruitmentScope?: boolean;
}>;

export type AuthorizationRequest = Readonly<{
  operation: string;
  target?: Readonly<{
    type: string;
    id?: string;
    state?: AuthorizationState;
  }>;
}>;

export type AuthorizationDecision = Readonly<{
  allowed: boolean;
  reasonCode:
    | "ALLOWED"
    | "AUTHENTICATION_REQUIRED"
    | "MFA_REQUIRED"
    | "UNKNOWN_ROLE"
    | "UNKNOWN_OPERATION"
    | "ROLE_DENIED"
    | "TARGET_REQUIRED"
    | "TARGET_MISMATCH"
    | "TARGET_ID_REQUIRED"
    | "STATE_DENIED";
}>;

export class AuthorizationDeniedError extends Error {
  constructor() {
    super("Not available.");
    this.name = "AuthorizationDeniedError";
  }
}

const ROLE_GRANTS: Record<AuthorizationOperation, readonly StaffRole[]> = {
  "content.list_metadata": ["CONTENT_EDITOR", "ADMIN"],
  "content.draft.read": ["CONTENT_EDITOR", "ADMIN"],
  "content.create": ["CONTENT_EDITOR", "ADMIN"],
  "content.edit": ["CONTENT_EDITOR", "ADMIN"],
  "content.publish": ["CONTENT_EDITOR", "ADMIN"],
  "content.archive": ["CONTENT_EDITOR", "ADMIN"],
  "site_settings.public.edit": ["CONTENT_EDITOR", "ADMIN"],
  "site_settings.recruitment.edit": ["ADMIN"],
  "job.list_metadata": ["HIRING_REVIEWER", "HIRING_MANAGER", "ADMIN"],
  "job.draft.read": ["HIRING_REVIEWER", "HIRING_MANAGER", "ADMIN"],
  "job.create": ["HIRING_MANAGER", "ADMIN"],
  "job.edit": ["HIRING_MANAGER", "ADMIN"],
  "job.publish": ["HIRING_MANAGER", "ADMIN"],
  "job.close": ["HIRING_MANAGER", "ADMIN"],
  "job.archive": ["HIRING_MANAGER", "ADMIN"],
  "job.question.manage": ["HIRING_MANAGER", "ADMIN"],
  "application.list_metadata": ["HIRING_REVIEWER", "HIRING_MANAGER", "ADMIN"],
  "application.contact.read": ["HIRING_REVIEWER", "HIRING_MANAGER", "ADMIN"],
  "application.answers.read": ["HIRING_REVIEWER", "HIRING_MANAGER", "ADMIN"],
  "application.accommodation.read": ["HIRING_MANAGER", "ADMIN"],
  "application.hiring_status.change": ["HIRING_REVIEWER", "HIRING_MANAGER", "ADMIN"],
  "application.note.create": ["HIRING_REVIEWER", "HIRING_MANAGER", "ADMIN"],
  "application.note.read": ["HIRING_REVIEWER", "HIRING_MANAGER", "ADMIN"],
  "application.withdraw.record": ["HIRING_MANAGER", "ADMIN"],
  "candidate_file.state.read": ["HIRING_REVIEWER", "HIRING_MANAGER", "ADMIN"],
  "candidate_file.security_review.initiate": ["HIRING_MANAGER", "ADMIN"],
  "candidate_file.security_review.retrieve_quarantine": ["HIRING_MANAGER", "ADMIN"],
  "candidate_file.security_review.record_outcome": ["HIRING_MANAGER", "ADMIN"],
  "candidate_file.cleared.download": ["HIRING_REVIEWER", "HIRING_MANAGER", "ADMIN"],
  "candidate_file.delete.request": ["HIRING_MANAGER", "ADMIN"],
  "candidate_file.delete.execute": ["ADMIN"],
  "retention.expiry.read": ["HIRING_REVIEWER", "HIRING_MANAGER", "ADMIN", "AUDITOR"],
  "retention.deletion.request": ["HIRING_MANAGER", "ADMIN"],
  "retention.deletion.execute": ["ADMIN"],
  "retention.policy.change": ["ADMIN"],
  "audit.events.read": ["HIRING_MANAGER", "ADMIN", "AUDITOR"],
  "staff.manage": ["ADMIN"],
  "staff.roles.manage": ["ADMIN"],
  "operational_policy.configure": ["ADMIN"],
};

const KNOWN_ROLES = new Set<StaffRole>([
  "CONTENT_EDITOR",
  "HIRING_REVIEWER",
  "HIRING_MANAGER",
  "ADMIN",
  "AUDITOR",
]);
const KNOWN_OPERATIONS = new Set<string>(AUTHORIZATION_OPERATIONS);

const TARGET_ID_REQUIRED = new Set<AuthorizationOperation>([
  "content.draft.read",
  "content.edit",
  "content.publish",
  "content.archive",
  "job.draft.read",
  "job.edit",
  "job.publish",
  "job.close",
  "job.archive",
  "job.question.manage",
  "application.contact.read",
  "application.answers.read",
  "application.accommodation.read",
  "application.hiring_status.change",
  "application.note.create",
  "application.note.read",
  "application.withdraw.record",
  "candidate_file.state.read",
  "candidate_file.security_review.initiate",
  "candidate_file.security_review.retrieve_quarantine",
  "candidate_file.security_review.record_outcome",
  "candidate_file.cleared.download",
  "candidate_file.delete.request",
  "candidate_file.delete.execute",
  "retention.deletion.request",
  "retention.deletion.execute",
  "staff.manage",
  "staff.roles.manage",
]);

const HIRING_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  NEW: ["UNDER_REVIEW", "REJECTED", "WITHDRAWN"],
  UNDER_REVIEW: ["SHORTLISTED", "INTERVIEW", "REJECTED", "WITHDRAWN"],
  SHORTLISTED: ["INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"],
  INTERVIEW: ["OFFER", "REJECTED", "WITHDRAWN"],
  OFFER: ["HIRED", "REJECTED", "WITHDRAWN"],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

function expectedTarget(operation: AuthorizationOperation): AuthorizationTargetType {
  if (operation.startsWith("content.")) return "CONTENT";
  if (operation.startsWith("site_settings.")) return "SITE_SETTINGS";
  if (operation.startsWith("job.")) return "JOB";
  if (operation.startsWith("application.")) return "APPLICATION";
  if (operation.startsWith("candidate_file.")) return "CANDIDATE_FILE";
  if (operation.startsWith("retention.")) return "RETENTION";
  if (operation.startsWith("audit.")) return "AUDIT";
  if (operation.startsWith("staff.")) return "STAFF";
  return "OPERATIONAL_POLICY";
}

function hasAnyRole(principal: StaffPrincipal, roles: readonly StaffRole[]) {
  return principal.roles.some((role) => roles.includes(role));
}

function applicationStateAllows(state: AuthorizationState | undefined) {
  return (
    state?.technicalStatus === "SUBMITTED" &&
    state.retentionPermitsAccess === true &&
    state.deletionCompleted !== true &&
    state.inRecruitmentScope === true
  );
}

function fileStateAllows(
  operation: AuthorizationOperation,
  state: AuthorizationState | undefined,
) {
  if (!state || state.deletionCompleted === true) return false;

  if (operation === "candidate_file.state.read") {
    return state.fileTechnicalStatus !== "DELETED" && state.retentionPermitsAccess === true;
  }
  if (operation === "candidate_file.cleared.download") {
    return (
      state.validationStatus === "PASSED" &&
      state.fileTechnicalStatus === "QUARANTINED" &&
      state.securityStatus === "CLEARED" &&
      state.retentionPermitsAccess === true &&
      state.hashMatchesReview === true
    );
  }
  if (operation === "candidate_file.delete.request") {
    return state.fileTechnicalStatus !== "DELETED";
  }
  if (operation === "candidate_file.delete.execute") {
    return state.fileTechnicalStatus !== "DELETED" && state.deletionRequested === true;
  }

  const reviewable =
    state.validationStatus === "PASSED" &&
    state.fileTechnicalStatus === "QUARANTINED" &&
    state.retentionPermitsAccess === true;
  if (!reviewable) return false;
  if (operation === "candidate_file.security_review.record_outcome") {
    return state.securityStatus === "IN_REVIEW" && state.hashMatchesReview === true;
  }
  if (operation === "candidate_file.security_review.initiate") {
    return ["UNREVIEWED", "REVIEW_FAILED"].includes(state.securityStatus ?? "");
  }
  return ["UNREVIEWED", "IN_REVIEW", "REVIEW_FAILED"].includes(state.securityStatus ?? "");
}

function stateAllows(
  principal: StaffPrincipal,
  operation: AuthorizationOperation,
  state: AuthorizationState | undefined,
) {
  if (
    operation === "content.list_metadata" ||
    operation === "content.draft.read" ||
    operation === "content.edit"
  ) {
    return ["DRAFT", "SCHEDULED"].includes(state?.publicationState ?? "");
  }
  if (operation === "content.publish") {
    return (
      ["DRAFT", "SCHEDULED"].includes(state?.publicationState ?? "") &&
      state?.approvedContent === true
    );
  }
  if (operation === "content.archive") {
    return ["DRAFT", "SCHEDULED", "PUBLISHED"].includes(state?.publicationState ?? "");
  }

  if (operation === "job.list_metadata" || operation === "job.draft.read") {
    const unrestricted = hasAnyRole(principal, ["HIRING_MANAGER", "ADMIN"]);
    return unrestricted || state?.assignedApplicationContext === true;
  }
  if (operation === "job.edit" || operation === "job.question.manage") {
    return ["DRAFT", "SCHEDULED"].includes(state?.lifecycleState ?? "");
  }
  if (operation === "job.publish") {
    return (
      ["DRAFT", "SCHEDULED"].includes(state?.lifecycleState ?? "") &&
      state?.publishable === true
    );
  }
  if (operation === "job.close") return state?.lifecycleState === "PUBLISHED";
  if (operation === "job.archive") {
    return ["DRAFT", "SCHEDULED", "CLOSED"].includes(state?.lifecycleState ?? "");
  }

  if (operation.startsWith("application.")) {
    if (operation === "application.withdraw.record") {
      return (
        state?.technicalStatus !== "WITHDRAWN" &&
        state?.deletionCompleted !== true &&
        state?.inRecruitmentScope === true
      );
    }
    if (!applicationStateAllows(state)) return false;
    if (operation !== "application.hiring_status.change") return true;
    const current = state?.hiringStatus ?? "";
    const requested = state?.requestedHiringStatus ?? "";
    if (
      requested === "WITHDRAWN" &&
      !hasAnyRole(principal, ["HIRING_MANAGER", "ADMIN"])
    ) {
      return false;
    }
    return HIRING_TRANSITIONS[current]?.includes(requested) ?? false;
  }

  if (operation.startsWith("candidate_file.")) return fileStateAllows(operation, state);

  if (operation === "retention.expiry.read") {
    const unrestricted = hasAnyRole(principal, ["HIRING_MANAGER", "ADMIN"]);
    return unrestricted || state?.inRecruitmentScope === true;
  }
  if (operation === "retention.deletion.request") {
    return state?.deletionRequested !== true && state?.deletionCompleted !== true;
  }
  if (operation === "retention.deletion.execute") {
    return state?.deletionRequested === true && state?.deletionCompleted !== true;
  }
  if (operation === "audit.events.read") {
    if (hasAnyRole(principal, ["ADMIN", "AUDITOR"])) return true;
    return state?.inRecruitmentScope === true;
  }

  return true;
}

export function authorize(
  principal: StaffPrincipal | null | undefined,
  request: AuthorizationRequest,
): AuthorizationDecision {
  const boundaryDecision = authorizeBeforeTargetStateLookup(principal, request);
  if (!boundaryDecision.allowed) return boundaryDecision;

  const operation = request.operation as AuthorizationOperation;
  if (!stateAllows(principal!, operation, request.target?.state)) {
    return { allowed: false, reasonCode: "STATE_DENIED" };
  }
  return { allowed: true, reasonCode: "ALLOWED" };
}

export function authorizeBeforeTargetStateLookup(
  principal: StaffPrincipal | null | undefined,
  request: AuthorizationRequest,
): AuthorizationDecision {
  if (!principal) return { allowed: false, reasonCode: "AUTHENTICATION_REQUIRED" };
  if (principal.assuranceLevel !== "aal2") {
    return { allowed: false, reasonCode: "MFA_REQUIRED" };
  }
  if (principal.roles.length === 0 || principal.roles.some((role) => !KNOWN_ROLES.has(role))) {
    return { allowed: false, reasonCode: "UNKNOWN_ROLE" };
  }
  if (!KNOWN_OPERATIONS.has(request.operation)) {
    return { allowed: false, reasonCode: "UNKNOWN_OPERATION" };
  }

  const operation = request.operation as AuthorizationOperation;
  if (!hasAnyRole(principal, ROLE_GRANTS[operation])) {
    return { allowed: false, reasonCode: "ROLE_DENIED" };
  }
  if (!request.target) return { allowed: false, reasonCode: "TARGET_REQUIRED" };
  if (request.target.type !== expectedTarget(operation)) {
    return { allowed: false, reasonCode: "TARGET_MISMATCH" };
  }
  if (TARGET_ID_REQUIRED.has(operation) && !request.target.id?.trim()) {
    return { allowed: false, reasonCode: "TARGET_ID_REQUIRED" };
  }
  return { allowed: true, reasonCode: "ALLOWED" };
}

export function requireAuthorization(
  principal: StaffPrincipal,
  request: AuthorizationRequest,
) {
  const decision = authorize(principal, request);
  if (!decision.allowed) throw new AuthorizationDeniedError();
  return decision;
}
