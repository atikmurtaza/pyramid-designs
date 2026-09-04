export type MfaFactorSummary = Readonly<{
  id: string;
  factor_type: string;
  status: string;
  created_at: string;
}>;

export function selectVerifiedTotpFactor(factors: readonly MfaFactorSummary[]) {
  return [...factors]
    .filter((factor) => factor.factor_type === "totp" && factor.status === "verified")
    .sort(
      (left, right) =>
        left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id),
    )[0]?.id ?? null;
}
