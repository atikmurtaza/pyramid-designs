# ADR 0015: File-free application submission

**Status:** Accepted by owner for Phase 2G-A; production execution remains gated.

Previously every `SUBMITTED` application required a cleared candidate file. Phase 2G excludes binary handling but requires completed applications readable through the unchanged staff boundary. Pending-only structured intake was considered and explicitly rejected by the owner.

Add immutable server-owned `Application.requiresClearedFile`, non-null and defaulting to true. Existing applications and legacy repository calls preserve their original file requirement. The approved Phase 2G structured intake flow alone explicitly creates file-free records with this value false and completes them transactionally.

Every submission still requires consent and validated structured evidence. The database continues to require a cleared file when the flag is true; any attached active file must be cleared even when the flag is false. Existing hash-bound review evidence remains mandatory. File mutations serialize through the parent application and recheck its final transaction state, preventing attachment/submission races and clearance downgrade bypasses. Public callers cannot assign the flag or statuses. Staff authorization is unchanged.

Closure review found that a BEFORE file trigger checked the old file state when the parent constraint was immediate. Forward-only migration `20260905010000_phase_2g_immediate_file_evidence` moves that trigger to AFTER, preserving the real parent update/serialization while validating the changed file in both immediate and deferred modes. The already-applied original migration remains unchanged.

Phase 2H owns binary validation, quarantine, storage and malware review. A future asynchronous attachment must return the application to an appropriate non-reviewable state before linking uncleared material; it cannot bypass submission evidence. No such workflow is implemented in Phase 2G.

Consent wording, production intake activation, trusted proxy identity, least-privilege runtime grants and deployment acceptance remain production gates. This decision does not authorize real intake or deployment.
