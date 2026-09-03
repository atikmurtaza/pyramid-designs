import "server-only";

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

const POOL_OPTIONS = Object.freeze({
  max: 3,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  application_name: "pyramid-designs",
});

const databaseGlobal = globalThis as typeof globalThis & {
  pyramidDatabasePool?: Pool;
};

export interface DatabaseExecutor {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
}

export class DatabaseTransactionError extends Error {
  constructor() {
    super("Database transaction failed.");
    this.name = "DatabaseTransactionError";
  }
}

function databaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("DATABASE_URL is required.");

  const protocol = new URL(value).protocol;
  if (protocol !== "postgres:" && protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must be a PostgreSQL URL.");
  }

  return value;
}

function createExecutor(queryable: Pool | PoolClient): DatabaseExecutor {
  return {
    query: <Row extends QueryResultRow>(text: string, values: unknown[] = []) =>
      queryable.query<Row>(text, values),
  };
}

function getPool() {
  if (databaseGlobal.pyramidDatabasePool) return databaseGlobal.pyramidDatabasePool;

  const pool = new Pool({
    connectionString: databaseUrl(),
    ...POOL_OPTIONS,
  });
  pool.on("error", () => console.error("database_pool_idle_client_error"));
  databaseGlobal.pyramidDatabasePool = pool;
  return pool;
}

export function query<Row extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return getPool().query<Row>(text, values);
}

export async function transaction<T>(
  work: (database: DatabaseExecutor) => Promise<T>,
) {
  let client: PoolClient | undefined;

  try {
    client = await getPool().connect();
    await client.query("BEGIN");
    const result = await work(createExecutor(client));
    await client.query("COMMIT");
    return result;
  } catch {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {
        console.error("database_transaction_rollback_failed");
      }
    }
    throw new DatabaseTransactionError();
  } finally {
    client?.release();
  }
}

export async function closeDatabasePool() {
  const pool = databaseGlobal.pyramidDatabasePool;
  if (!pool) return;

  delete databaseGlobal.pyramidDatabasePool;
  await pool.end();
}

export const database: DatabaseExecutor = Object.freeze({ query });
