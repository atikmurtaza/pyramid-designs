# ADR 0014: Runtime PostgreSQL access with pg; Prisma retained for migrations

**Status:** Accepted

**Date:** 2026-09-03

## Context

Prisma Client works in the controlled local environment, but the Phase 2A-NIR Hostinger isolation matrix established a different managed-runtime boundary. Hostinger successfully imports `pg`, constructs a pool and executes a raw PostgreSQL query through the Supabase Session Pooler. The first failure is importing the Prisma Client runtime. Direct Prisma Client and adapter-backed Prisma Client paths both fail, while `@prisma/adapter-pg` imports and constructs independently.

The database, credentials, TLS path and Supabase PostgreSQL service are therefore not the blocker. Continuing to force Prisma Client into the current Hostinger runtime would preserve a known incompatibility without adding application value.

Official documentation was reviewed on 2026-09-03:

- Prisma documents `prisma migrate deploy` as the production command for applying pending migration files and does not make Prisma Client generation part of that command.
- node-postgres documents parameterized queries, pooled access and transactions performed through one checked-out client.
- Next.js documents Route Handlers as server execution and the Node.js runtime as the appropriate runtime for database connections.
- Supabase documents Session Pooler connections for persistent IPv4 application traffic. No relevant connection-pooler breaking change was found in the current Supabase changelog.

## Decision

The deployed Hostinger application uses `pg` directly through the server-only `DATABASE_URL`.

Prisma remains the schema-definition and migration tool. `prisma/schema.prisma`, `prisma/migrations` and `prisma migrate deploy` remain authoritative for controlled schema changes. Prisma Client generation is not part of the deployed application build, and deployable routes, components and server libraries must not import Prisma Client, its generated output or `@prisma/adapter-pg`.

Runtime SQL is kept in small server repository modules. Every value originating outside a fixed SQL statement is passed as a PostgreSQL parameter. Repository functions map driver rows to plain application values before returning them to routes or UI code.

The initial process pool is intentionally conservative:

- maximum connections: `3`;
- idle timeout: `10,000 ms`;
- connection timeout: `10,000 ms`;
- application name: `pyramid-designs`.

These fixed values fit the expected low initial traffic and avoid multiplying connections against Supavisor. They can be changed only when measured concurrency, latency or provider limits justify it.

Transactions use one checked-out `pg` client: `BEGIN`, callback, `COMMIT`; failures attempt `ROLLBACK`, release the client in `finally` and throw a fixed server-safe error.

The schema-change flow is:

1. edit `prisma/schema.prisma`;
2. generate a migration in development, normally with `prisma migrate dev --create-only`;
3. inspect the generated SQL and security effects;
4. apply and verify it in development;
5. commit the schema and migration history together;
6. apply committed production migrations through a controlled CI or administrator path with `prisma migrate deploy`.

`prisma db push` is not used for production schema deployment.

## Consequences

- Application queries and transaction boundaries are explicit.
- Typed row mapping and validation happen at repository boundaries.
- Runtime connection lifecycle and failure handling are owned by a small internal module.
- Prisma continues to provide reviewed schema and migration history without being loaded by Hostinger routes.
- `pg` remains a production dependency; `prisma` remains a development/tooling dependency.
- `@prisma/client`, `@prisma/adapter-pg`, generated Prisma Client files and the generation-time postinstall hook are removed.
- SQL conventions require parameterized values and prohibit request-controlled SQL text, identifiers or arbitrary query endpoints.

## Rejected alternatives

- Continue Prisma Client runtime workarounds after the Hostinger import boundary was isolated.
- Replace Hostinger solely to preserve Prisma Client when the approved host already runs raw PostgreSQL successfully.
- Change Prisma major versions speculatively without evidence that the Hostinger runtime incompatibility is corrected.
- Add another ORM or query builder before explicit SQL and the existing `pg` dependency demonstrate a real maintenance problem.

## Reversibility

Prisma Client or another typed runtime layer can be reconsidered if Hostinger/runtime conditions change or measured application complexity justifies it. The retained Prisma schema and migration history preserve that option. Reversal requires a new reviewed ADR and Hostinger runtime proof before deployed routes import Prisma Client again.

## Sources

- <https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate>
- <https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-deploy>
- <https://node-postgres.com/features/queries>
- <https://node-postgres.com/features/pooling>
- <https://node-postgres.com/features/transactions>
- <https://nextjs.org/docs/app/api-reference/file-conventions/route>
- <https://nextjs.org/docs/app/getting-started/server-and-client-components#preventing-environment-poisoning>
- <https://supabase.com/docs/guides/database/connecting-to-postgres>
- <https://supabase.com/changelog.md>
