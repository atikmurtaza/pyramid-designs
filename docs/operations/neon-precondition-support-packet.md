# Neon schema-only branch precondition packet

Prepared October 1, 2026 for owner review. **READY; NOT SENT.** Please identify the provider precondition for the two rejected requests below and confirm whether this project can use schema-only branching. No further creation request is authorized or planned as a diagnostic.

| Item | Safe evidence |
| --- | --- |
| Project | `withered-feather-01662312` |
| Region | `aws-ap-southeast-1` — Singapore |
| PostgreSQL major version | 17 |
| Failed endpoint class | `/api/v2/projects/{project_id}/branches` |
| HTTP method / status | POST / 412, twice |
| R2 attempt | October 1, 2026; exact invocation/request time not retained in available evidence |
| R3 attempt | Invocation began `2026-10-01T15:09:00.219Z` (16:09:00.219 BST); this is the invocation marker, not an exact POST/response timestamp |
| Request reproducibility | Both attempts used the same body below; no request variation |
| Source branch | `br-still-lab-b3q03yuz` |
| Requested branch name | `b4b1-p3-schema-only-20261001` |
| Reconciliation | Requested name absent after both failures; no accepted creation response, branch ID or receipt |
| Current complete branch / root / archived counts | 2 / 1 / 1, October 1, 2026, `15:48:07.976Z` |
| Current plan classification | Project owner metadata reports `subscription_type: free_v3`, classified Free |
| Published Free count limits | 10 branches/project, 3 roots/project; current counts plus one proposed branch/root are below both |
| API-key classification | Authenticated project GETs succeed; current key type/scope and mutation permission are not provable from approved read surfaces |
| Official-contract validation | PASS for documented path, required fields, initialization mode and one read-write endpoint; account entitlement/operation acceptance remain unknown |
| SQL / provisioning effects | No PostgreSQL connection or subsequent provisioning occurred in either failed attempt or this H4 investigation |
| Correlation identifier | No safe provider request/correlation ID was retained |

Exact safe request body for both attempts:

```json
{
  "branch": {
    "name": "b4b1-p3-schema-only-20261001",
    "parent_id": "br-still-lab-b3q03yuz",
    "init_source": "schema-only",
    "protected": false
  },
  "endpoints": [{ "type": "read_write" }]
}
```

No expiration, compute sizing, custom settings or alternate initialization mode was sent. The schema source is selected by `parent_id`; the intended result is an independent root. No provider-specific failure reason is available: R2 discarded its body, while R3's strict safe projection suppressed an unreviewed structured reason. Raw responses were not retained or recovered.

Current authoritative references: [Create branch](https://neon.com/docs/reference/api/branches/create-project-branch), [release v2 OpenAPI](https://neon.com/api_spec/release/v2.json), [schema-only branching](https://neon.com/docs/guides/branching-schema-only), [plan limits](https://neon.com/docs/introduction/plans). OpenAPI retrieved October 1, 2026; SHA-256 `e4a2b8f77f9dcbc6b4b829790829b3a9d5d5df72f16d4a5182063a787780a004`.

The [schema-only Beta guide](https://neon.com/docs/guides/branching-schema-only) directs feature feedback through the [Console feedback form](https://console.neon.tech/app/projects?modal=feedback). The [support policy](https://neon.com/docs/introduction/support) gives Free users community assistance via [Neon Discord](https://neon.com/discord), explicitly described as an unofficial support channel; technical tickets are available on Scale, while Launch tickets are billing-only. The owner should use the documented feature-feedback route for this project. No message has been sent, no plan change requested, and no support-ticket eligibility beyond Free is assumed.
